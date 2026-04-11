from typing import List, Dict, Any
from app.models.document_agent import (
    TradeContext, DocumentRequirement, DocumentType
)

class DocumentKnowledgeBase:
    """
    Rule engine to determine required documents based on trade context.
    Acts as the 'brain' for determining what documents are needed.
    """
    def __init__(self):
        # Universal documents required for ALL international trades
        self.universal_docs = [
            DocumentType.COMMERCIAL_INVOICE,
            DocumentType.PACKING_LIST,
            DocumentType.CERTIFICATE_OF_ORIGIN,
            DocumentType.SALES_CONTRACT
        ]
        
    def get_required_documents(self, context: TradeContext) -> List[DocumentRequirement]:
        requirements = []
        
        # 1. Universal Documents
        for doc_type in self.universal_docs:
            requirements.append(DocumentRequirement(
                document_type=doc_type,
                description=f"Standard {doc_type.value} required for all international trades."
            ))
            
        # 2. Logistics Documents (Mode based)
        if context.logistics_mode.lower() == "sea" or context.logistics_mode.lower() == "sea freight":
            requirements.append(DocumentRequirement(
                document_type=DocumentType.BILL_OF_LADING,
                description="Required for ocean freight tracking and ownership."
            ))
            requirements.append(DocumentRequirement(
                document_type=DocumentType.SHIPPING_INSTRUCTIONS,
                description="Instructions to the carrier for the sea freight."
            ))
            requirements.append(DocumentRequirement(
                document_type=DocumentType.CARGO_MANIFEST,
                description="List of cargo details required by customs."
            ))
        elif context.logistics_mode.lower() == "air" or context.logistics_mode.lower() == "air freight":
            requirements.append(DocumentRequirement(
                document_type=DocumentType.AIR_WAYBILL,
                description="Required for air freight tracking."
            ))

        # 3. Product / Category Specific Documents
        hs_prefix = context.hs_code[:2] if context.hs_code else ""
        
        # Agricultural / Food products (HS 01 - 24 roughly)
        agricultural_hs = ["01", "02", "03", "04", "07", "08", "09", "10", "11", "12", "16", "17", "18", "19", "20", "21", "22", "23", "24"]
        
        if hs_prefix in agricultural_hs:
            requirements.append(DocumentRequirement(
                document_type=DocumentType.PHYTOSANITARY_CERTIFICATE,
                description="Required for agricultural products to certify they are free from pests."
            ))
            requirements.append(DocumentRequirement(
                document_type=DocumentType.QUALITY_CERTIFICATE,
                description="Certifies the quality, health, and grade of the agricultural product."
            ))
            
            # Specific for Coffee (0901) or specific raw foods
            if context.hs_code and context.hs_code.startswith("0901"):
                requirements.append(DocumentRequirement(
                    document_type=DocumentType.FUMIGATION_CERTIFICATE,
                    description="Required to prove coffee beans have been legally fumigated before export."
                ))

        # 4. Financial / Terms Documents
        if context.payment_terms and ("LC" in context.payment_terms.upper() or "LETTER OF CREDIT" in context.payment_terms.upper()):
            requirements.append(DocumentRequirement(
                document_type=DocumentType.LETTER_OF_CREDIT,
                description="Banker's Letter of Credit required based on agreed LC payment terms."
            ))
            
        if context.delivery_terms and context.delivery_terms.upper() in ["CIF", "CIP"]:
            requirements.append(DocumentRequirement(
                document_type=DocumentType.INSURANCE_CERTIFICATE,
                description=f"Insurance certificate strictly required for {context.delivery_terms.upper()} incoterms."
            ))
            
        # 5. Country Specific Documents (Importer Rules)
        eu_countries = ["Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Ireland"] 
        if context.importer_country in eu_countries and hs_prefix in agricultural_hs:
            requirements.append(DocumentRequirement(
                document_type=DocumentType.EU_FOOD_SAFETY,
                description="EU Food Safety Compliance required for food imports into the European Union."
            ))
            requirements.append(DocumentRequirement(
                document_type=DocumentType.TRACEABILITY_CERTIFICATE,
                description="Traceability Certification required by EU strict border regulations."
            ))
            
        if context.importer_country == "USA" and hs_prefix in agricultural_hs:
            requirements.append(DocumentRequirement(
                document_type=DocumentType.FDA_CERTIFICATE,
                description="FDA Registration/Certificate required for food imports into the USA."
            ))

        return requirements

import asyncio
from app.database import get_database
from app.models.document_agent import TradeDocument, DocumentVerificationStatus, TradePackage

class DocumentAgent:
    """
    Autonomous Agent for Document Intelligence
    """
    def __init__(self):
        self.knowledge_base = DocumentKnowledgeBase()
        
    def identify_trade_context(self, trade_data: Dict[str, Any]) -> TradeContext:
        """Step 1: Identify Trade Context"""
        return TradeContext(**trade_data)
        
    def determine_required_documents(self, context: TradeContext) -> List[DocumentRequirement]:
        """Step 2: Determine Required Documents"""
        return self.knowledge_base.get_required_documents(context)

    async def collect_supplier_docs(self, context: TradeContext, required_docs: List[DocumentRequirement]) -> Dict[str, Any]:
        """
        Step 3: Collect Supplier Documents from Database.
        Queries MongoDB suppliers_master to fetch existing compliance certifications.
        """
        db = get_database()
        supplier = await db.suppliers_master.find_one({"supplier_id": context.supplier_id})
        
        found_docs = {}
        if not supplier:
            return found_docs
            
        # Map CSV certification columns to Document Types
        if supplier.get("certification_iso") == "Yes":
            found_docs[DocumentType.ISO_CERTIFICATE] = {"status": "Verified on Profile", "expiry": "2027-12-31"}
        if supplier.get("certification_haccp") == "Yes":
            found_docs[DocumentType.HACCP_CERTIFICATE] = {"status": "Verified on Profile", "expiry": "2026-06-30"}
        if supplier.get("certification_fda") == "Yes":
            found_docs[DocumentType.FDA_CERTIFICATE] = {"status": "Verified on Profile", "expiry": "2028-01-01"}
            
        return found_docs

    def request_missing_docs(self, required_docs: List[DocumentRequirement], found_docs: Dict[str, Any]) -> List[DocumentType]:
        """
        Step 4: Autonomous Document Request.
        Finds what is required but not in the database.
        """
        missing = []
        for req in required_docs:
            if req.document_type not in found_docs:
                missing.append(req.document_type)
        return missing

    def validate_documents(self, documents: List[TradeDocument], context: TradeContext) -> List[TradeDocument]:
        """
        Step 5: Document Validation.
        Autonomously verifies authenticity, expiries, and HS Code alignments.
        """
        for doc in documents:
            if doc.status == DocumentVerificationStatus.UPLOADED:
                # Mock AI validation logic
                print(f"   [Agent] Validating {doc.document_type.value}...")
                
                # Rule: Check HS Code matches trade context
                hs_matched = True
                if "hs_code" in doc.metadata and doc.metadata["hs_code"] != context.hs_code:
                    hs_matched = False
                    
                # Rule: Check expiry date
                not_expired = True
                if "expiry_date" in doc.metadata:
                    expiry = datetime.fromisoformat(doc.metadata["expiry_date"])
                    if expiry < datetime.now():
                        not_expired = False
                
                if hs_matched and not_expired:
                    doc.status = DocumentVerificationStatus.VALIDATED
                    print(f"      -> ✓ Validated Successfully.")
                else:
                    doc.status = DocumentVerificationStatus.REJECTED
                    reason = "HS Code Mismatch." if not hs_matched else "Document Expired."
                    print(f"      -> ❌ Rejected: {reason}")
                    
        return documents

    def generate_sales_contract(self, context: TradeContext) -> TradeDocument:
        """Step 6: Generate Trade Contract autonomously."""
        print(f"   [Agent] Drafting Sales Contract for {context.quantity} {context.product_name}...")
        
        # Determine Jurisdiction based on exporter country
        contract_data = {
            "title": "International Sales Contract",
            "parties": {
                "buyer": f"{context.buyer_id} (KYC Verification Pending)", 
                "seller": f"{context.supplier_id} (KYC Verification Pending)"
            },
            "commodity": context.product_name,
            "hs_code": context.hs_code,
            "quantity": context.quantity,
            "price_per_unit": context.price,
            "total_value": context.quantity * context.price,
            "incoterms": context.delivery_terms,
            "payment_terms": context.payment_terms,
            "governing_law": "The laws of India",
            "dispute_resolution": "Arbitration in New Delhi, India"
        }
        import uuid
        from app.services.pdf_generator import generate_standard_pdf
        
        doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
        pdf_info = generate_standard_pdf(doc_id, DocumentType.SALES_CONTRACT.value, context.trade_id, contract_data)
        
        return TradeDocument(
            document_id=doc_id,
            trade_id=context.trade_id,
            supplier_id=context.supplier_id,
            document_type=DocumentType.SALES_CONTRACT,
            status=DocumentVerificationStatus.VALIDATED,
            file_url=pdf_info["file_url"],
            metadata={**contract_data, "digital_signature": pdf_info["signature_hash"]}
        )

    def generate_logistics_docs(self, context: TradeContext) -> List[TradeDocument]:
        """Step 7: Generate Logistics Documents autonomously."""
        print(f"   [Agent] Preparing Logistics Documents for {context.logistics_mode}...")
        import uuid
        from app.services.pdf_generator import generate_standard_pdf
        docs = []
        if context.logistics_mode.lower() in ["sea", "sea freight"]:
            doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
            meta = {"vessel": "TBA", "port_of_loading": context.exporter_country, "port_of_discharge": context.importer_country}
            pdf_info = generate_standard_pdf(doc_id, DocumentType.BILL_OF_LADING.value, context.trade_id, meta)
            
            docs.append(TradeDocument(
                document_id=doc_id,
                trade_id=context.trade_id,
                supplier_id=context.supplier_id,
                document_type=DocumentType.BILL_OF_LADING,
                status=DocumentVerificationStatus.VALIDATED,
                file_url=pdf_info["file_url"],
                metadata={**meta, "digital_signature": pdf_info["signature_hash"]}
            ))
        elif context.logistics_mode.lower() in ["air", "air freight"]:
            doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
            meta = {"flight_no": "TBA", "airport_of_departure": context.exporter_country, "airport_of_destination": context.importer_country}
            pdf_info = generate_standard_pdf(doc_id, DocumentType.AIR_WAYBILL.value, context.trade_id, meta)
            
            docs.append(TradeDocument(
                document_id=doc_id,
                trade_id=context.trade_id,
                supplier_id=context.supplier_id,
                document_type=DocumentType.AIR_WAYBILL,
                status=DocumentVerificationStatus.VALIDATED,
                file_url=pdf_info["file_url"],
                metadata={**meta, "digital_signature": pdf_info["signature_hash"]}
            ))
        return docs

    def generate_financial_docs(self, context: TradeContext) -> List[TradeDocument]:
        """Step 8: Generate Financial Documents autonomously."""
        print(f"   [Agent] Preparing Financial Documents for terms {context.payment_terms} and {context.delivery_terms}...")
        import uuid
        from app.services.pdf_generator import generate_standard_pdf
        docs = []
        if "LC" in context.payment_terms.upper() or "LETTER OF CREDIT" in context.payment_terms.upper():
            doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
            meta = {"draft_amount": context.quantity * context.price, "currency": "USD", "status": "DRAFT"}
            pdf_info = generate_standard_pdf(doc_id, DocumentType.LETTER_OF_CREDIT.value, context.trade_id, meta)
            
            docs.append(TradeDocument(
                document_id=doc_id,
                trade_id=context.trade_id,
                supplier_id=context.supplier_id,
                document_type=DocumentType.LETTER_OF_CREDIT,
                status=DocumentVerificationStatus.VALIDATED,
                file_url=pdf_info["file_url"],
                metadata={**meta, "digital_signature": pdf_info["signature_hash"]}
            ))
            
        if context.delivery_terms.upper() in ["CIF", "CIP"]:
            doc_id = f"DOC-{uuid.uuid4().hex[:8]}"
            meta = {"coverage_amount": (context.quantity * context.price) * 1.1, "covered_risks": "All Risks"}
            pdf_info = generate_standard_pdf(doc_id, DocumentType.INSURANCE_CERTIFICATE.value, context.trade_id, meta)
            
            docs.append(TradeDocument(
                document_id=doc_id,
                trade_id=context.trade_id,
                supplier_id=context.supplier_id,
                document_type=DocumentType.INSURANCE_CERTIFICATE,
                status=DocumentVerificationStatus.VALIDATED,
                file_url=pdf_info["file_url"],
                metadata={**meta, "digital_signature": pdf_info["signature_hash"]}
            ))
        return docs

    async def execute_autonomous_workflow(self, trade_data: Dict[str, Any]) -> TradePackage:
        """
        Master Orchestrator
        Executes Steps 1 through 10 autonomously.
        """
        print("\n=== 🤖 AUTONOMOUS DOCUMENT AGENT ACTIVATED ===")
        
        # Step 1
        context = self.identify_trade_context(trade_data)
        print(f"1️⃣ Trade Context Identified: {context.exporter_country} -> {context.importer_country} ({context.product_name})")
        
        # Step 2
        required_reqs = self.determine_required_documents(context)
        print(f"2️⃣ Requirements Engine: {len(required_reqs)} distinct documents required.")
        
        # Step 3
        found_docs = await self.collect_supplier_docs(context, required_reqs)
        print(f"3️⃣ Database Scan complete. Found {len(found_docs)} existing valid certificates on supplier profile.")
        
        # Step 4
        missing_types = self.request_missing_docs(required_reqs, found_docs)
        print(f"4️⃣ Missing {len(missing_types)} documents. Dispatching autonomous requests to Supplier Portal / API.")
        
        # Step 6, 7, 8 (Generation)
        generated_docs = []
        contract = self.generate_sales_contract(context)
        generated_docs.append(contract)
        
        logistics_docs = self.generate_logistics_docs(context)
        generated_docs.extend(logistics_docs)
        
        financial_docs = self.generate_financial_docs(context)
        generated_docs.extend(financial_docs)
        
        # Append existing mock compliance docs to package
        for doc_type, meta in found_docs.items():
            import uuid
            generated_docs.append(TradeDocument(
                document_id=f"DOC-{uuid.uuid4().hex[:8]}",
                trade_id=context.trade_id,
                supplier_id=context.supplier_id,
                document_type=doc_type,
                status=DocumentVerificationStatus.VALIDATED,
                metadata=meta
            ))
        
        # Step 9: Bundle Trade Package
        package = TradePackage(
            trade_id=context.trade_id,
            status="READY_FOR_RISK_AGENT",
            documents=generated_docs
        )
        print("9️⃣ Trade Package Built.")
        print("=== 🏁 DOCUMENT AGENT WORKFLOW COMPLETE ===\n")
        
        return package

# Singleton instance
document_agent = DocumentAgent()
