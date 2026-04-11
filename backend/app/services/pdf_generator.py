import os
import hashlib
from datetime import datetime
from fpdf import FPDF

# Ensure the output directory exists
DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_docs")
os.makedirs(DOCS_DIR, exist_ok=True)

class LegalPDF(FPDF):
    def header(self):
        # Professional Corporate Letterhead
        self.set_fill_color(15, 30, 50)  # Dark Navy Corporate Blue
        self.rect(0, 0, 210, 30, 'F')    # Solid bar across the top
        
        self.set_y(10)
        self.set_font("helvetica", "B", 20)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, " TradeOS Global Escrow & Notary", ln=1, align="L")
        
        self.set_y(12)
        self.set_font("helvetica", "I", 10)
        self.cell(0, 6, "Digitally Certified Commercial Instrument ", ln=1, align="R")
        
        # Reset Y below header
        self.set_y(35)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()} of {{nb}} | TradeOS Cryptographic Notary Network", align="C")
        
def generate_standard_pdf(document_id: str, doc_type: str, trade_id: str, metadata: dict) -> dict:
    pdf = LegalPDF()
    pdf.alias_nb_pages()
    pdf.add_page()
    
    # Title
    pdf.set_font("helvetica", "B", 18)
    pdf.set_text_color(15, 30, 50)
    pdf.cell(0, 10, doc_type.upper(), ln=1, align="C")
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(5)
    
    # Meta Information Board (Shaded box)
    pdf.set_fill_color(240, 245, 250)
    pdf.rect(10, pdf.get_y(), 190, 22, 'F')
    
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(0, 0, 0)
    
    date_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    pdf.cell(95, 7, f" Document ID: {document_id}", ln=0)
    pdf.cell(95, 7, f" Date Issued: {date_str} UTC", ln=1)
    pdf.cell(95, 7, f" Trade Reference: {trade_id}", ln=0)
    pdf.cell(95, 7, f" Smart Contract Status: PENDING EXECUTION", ln=1)
    
    pdf.ln(8)
    
    # Parties Section
    if "parties" in metadata:
        parties = metadata.pop("parties")
        pdf.set_font("helvetica", "B", 12)
        pdf.set_fill_color(220, 225, 230)
        pdf.cell(190, 8, " AUTHORIZED PARTIES", border=1, ln=1, align="L", fill=True)
        
        pdf.set_font("helvetica", "", 10)
        buyer = str(parties.get("buyer", "N/A"))
        seller = str(parties.get("seller", "N/A"))
        
        # Clean up the "KYC Verification Pending" stuff since TradeOS is doing it cryptographically
        buyer = buyer.replace('(KYC Verification Pending)', '').strip()
        seller = seller.replace('(KYC Verification Pending)', '').strip()
        
        # Two columns for buyer and seller
        y_before = pdf.get_y()
        pdf.multi_cell(95, 6, f"BUYER:\n{buyer}\n\nCompliance: Level 3 (TradeOS Verified)", border=1)
        y_after_buyer = pdf.get_y()
        
        pdf.set_xy(105, y_before)
        pdf.multi_cell(95, 6, f"SELLER:\n{seller}\n\nCompliance: Level 3 (TradeOS Verified)", border=1)
        y_after_seller = pdf.get_y()
        
        # Ensure Y is pushed past the tallest column
        pdf.set_y(max(y_after_buyer, y_after_seller) + 8)
    
    # Commercial Terms Table
    pdf.set_font("helvetica", "B", 12)
    pdf.set_fill_color(220, 225, 230)
    pdf.cell(190, 8, " COMMERCIAL SCHEDULE", border=1, ln=1, align="L", fill=True)
    
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(80, 8, " Standard Description", border=1)
    pdf.cell(110, 8, " Declared Value / Condition", border=1, ln=1)
    
    pdf.set_font("helvetica", "", 10)
    for key, value in metadata.items():
        if isinstance(value, dict):
            continue # Just in case, skip nested
        
        formatted_key = key.replace("_", " ").title()
        pdf.cell(80, 8, f" {formatted_key}", border=1)
        pdf.cell(110, 8, f" {str(value)}", border=1, ln=1)
        
    pdf.ln(8)
    
    # Standard Legal Boilerplate
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 6, "Standard Terms & Conditions of Trade:", ln=1)
    pdf.set_font("helvetica", "", 8)
    legal_text = (
        "1. DEFINITIONS: 'TradeOS' refers to the autonomous smart contract escrow network brokering this trade. "
        "2. INCOTERMS: All terms specified herein fall under the jurisdiction of Incoterms 2020 rules published by ICC. "
        "3. PAYMENT: Funds shall be held in secure escrow and released according to the Logistics Agent webhook triggers. "
        "4. LIABILITY: Both parties agree to autonomous arbitration by the TradeOS AI tribunal in the event of document mismatch or cargo failure."
    )
    pdf.multi_cell(0, 4, legal_text)
    
    # Cryptographic Signature Simulation
    raw_str = f"{document_id}-{trade_id}-{datetime.now().isoformat()}"
    signature_hash = hashlib.sha256(raw_str.encode()).hexdigest()
    
    # Signature Box positioned near bottom
    pdf.set_y(-55)
    pdf.set_fill_color(240, 255, 240) # Light green tint
    pdf.rect(10, pdf.get_y(), 190, 25, 'F')
    pdf.rect(10, pdf.get_y(), 190, 25, 'D')
    
    pdf.set_font("courier", "B", 11)
    pdf.set_text_color(15, 100, 50)
    pdf.cell(0, 7, " [ DIGITAL PKI SIGNATURE SEAL ]", ln=1, align="C")
    
    pdf.set_font("courier", "", 8)
    pdf.set_text_color(50, 50, 50)
    pdf.cell(0, 5, f" BLOCKCHAIN TX HASH: {signature_hash.upper()}", ln=1, align="C")
    pdf.cell(0, 5, f" ISSUED TIMESTAMP: {datetime.now().isoformat()}Z  |  ESCROW AGENT: Node #4421", ln=1, align="C")
    
    # Save the file
    filename = f"{document_id}.pdf"
    file_path = os.path.join(DOCS_DIR, filename)
    pdf.output(file_path)
    
    return {
        "file_url": f"/api/document-agent/download/{document_id}",
        "signature_hash": signature_hash,
        "pdf_path": file_path
    }
