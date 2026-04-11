"""
👤 Importer/Exporter Registration API

This module handles registration of importers and exporters with document verification
and creates their profiles for the Matchmaker Agent.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import os
import json
from pydantic import BaseModel, EmailStr

router = APIRouter(tags=["Registration"])

# Registration data models
class CompanyRegistration(BaseModel):
    """Company registration information"""
    company_name: str
    business_type: str  # 'importer', 'exporter', 'both'
    registration_number: str
    tax_id: str
    email: EmailStr
    phone: str
    website: Optional[str] = ""
    address: Dict[str, str]  # street, city, state, country, postal_code
    business_description: str
    years_in_business: int
    company_size: str  # 'micro', 'small', 'medium', 'large'
    annual_revenue: Optional[float] = None

class TradeProfile(BaseModel):
    """Trade profile for the company"""
    primary_products: List[str]
    product_categories: List[str]
    hs_codes: List[str]
    trade_regions: List[str]  # Countries/regions they trade with
    annual_volume: Optional[float] = None
    volume_unit: Optional[str] = "ton"
    preferred_payment_terms: List[str]
    shipping_methods: List[str]

class DocumentVerification(BaseModel):
    """Document verification status"""
    document_type: str
    document_number: str
    issued_by: str
    issue_date: str
    expiry_date: Optional[str] = None
    verification_status: str  # 'pending', 'verified', 'rejected'
    verification_date: Optional[str] = None
    document_url: Optional[str] = None

class UserRegistration(BaseModel):
    """Complete user registration"""
    company_info: CompanyRegistration
    trade_profile: TradeProfile
    user_info: Dict[str, Any]  # name, position, contact details
    documents: List[DocumentVerification]

class RegistrationManager:
    """Manages user registration and verification"""
    
    def __init__(self):
        self.registration_storage = {}  # In production, use database
        self.document_storage = {}  # In production, use file storage
        
        # Required documents by business type
        self.required_documents = {
            "importer": [
                "business_registration", "tax_certificate", "import_license", 
                "bank_reference", "identity_proof"
            ],
            "exporter": [
                "business_registration", "tax_certificate", "export_license",
                "quality_certificates", "bank_reference", "identity_proof"
            ],
            "both": [
                "business_registration", "tax_certificate", "import_license", 
                "export_license", "quality_certificates", "bank_reference", "identity_proof"
            ]
        }
    
    def register_user(self, registration_data: UserRegistration) -> Dict[str, Any]:
        """Register a new user with verification"""
        
        try:
            # Generate unique registration ID
            registration_id = str(uuid.uuid4())
            
            # Validate required documents
            business_type = registration_data.company_info.business_type
            required_docs = self.required_documents.get(business_type, [])
            submitted_docs = [doc.document_type for doc in registration_data.documents]
            
            missing_docs = set(required_docs) - set(submitted_docs)
            
            # Create registration record
            registration_record = {
                "registration_id": registration_id,
                "company_info": registration_data.company_info.dict(),
                "trade_profile": registration_data.trade_profile.dict(),
                "user_info": registration_data.user_info,
                "documents": [doc.dict() for doc in registration_data.documents],
                "registration_date": datetime.now().isoformat(),
                "verification_status": "pending" if missing_docs else "in_review",
                "missing_documents": list(missing_docs),
                "profile_completion": self._calculate_completion(registration_data, missing_docs),
                "is_active": False  # Will be True after verification
            }
            
            # Store registration
            self.registration_storage[registration_id] = registration_record
            
            return {
                "success": True,
                "registration_id": registration_id,
                "message": "Registration submitted successfully",
                "verification_status": registration_record["verification_status"],
                "missing_documents": list(missing_docs),
                "next_steps": self._get_next_steps(missing_docs)
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    
    def _calculate_completion(self, registration_data: UserRegistration, missing_docs: List[str]) -> float:
        """Calculate profile completion percentage"""
        
        total_fields = 0
        completed_fields = 0
        
        # Company info fields
        company_fields = ["company_name", "business_type", "registration_number", "email", "phone"]
        total_fields += len(company_fields)
        for field in company_fields:
            if getattr(registration_data.company_info, field, None):
                completed_fields += 1
        
        # Trade profile fields
        trade_fields = ["primary_products", "product_categories", "trade_regions"]
        total_fields += len(trade_fields)
        for field in trade_fields:
            if getattr(registration_data.trade_profile, field, None):
                completed_fields += 1
        
        # Documents
        total_fields += len(self.required_documents.get(registration_data.company_info.business_type, []))
        completed_fields += len(registration_data.documents) - len(missing_docs)
        
        return round((completed_fields / total_fields) * 100, 1) if total_fields > 0 else 0
    
    def _get_next_steps(self, missing_docs: List[str]) -> List[str]:
        """Get next steps for incomplete registration"""
        
        if not missing_docs:
            return ["Your registration is under review", "You will be notified upon approval"]
        
        steps = []
        for doc in missing_docs:
            if "license" in doc:
                steps.append(f"Upload {doc.replace('_', ' ').title()}")
            elif "certificate" in doc:
                steps.append(f"Upload {doc.replace('_', ' ').title()}")
            else:
                steps.append(f"Upload {doc.replace('_', ' ').title()}")
        
        return steps
    
    def verify_document(self, registration_id: str, document_type: str, verification_result: str) -> Dict[str, Any]:
        """Verify a specific document"""
        
        if registration_id not in self.registration_storage:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        registration = self.registration_storage[registration_id]
        
        # Find and update the document
        for doc in registration["documents"]:
            if doc["document_type"] == document_type:
                doc["verification_status"] = verification_result
                doc["verification_date"] = datetime.now().isoformat()
                break
        
        # Update overall verification status
        all_verified = all(doc["verification_status"] == "verified" for doc in registration["documents"])
        registration["verification_status"] = "verified" if all_verified else "partial"
        registration["is_active"] = all_verified
        
        return {
            "success": True,
            "message": f"Document {document_type} {verification_result}",
            "overall_status": registration["verification_status"],
            "is_active": registration["is_active"]
        }
    
    def get_registration_status(self, registration_id: str) -> Dict[str, Any]:
        """Get registration status"""
        
        if registration_id not in self.registration_storage:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        registration = self.registration_storage[registration_id]
        
        return {
            "registration_id": registration_id,
            "verification_status": registration["verification_status"],
            "profile_completion": registration["profile_completion"],
            "missing_documents": registration["missing_documents"],
            "is_active": registration["is_active"],
            "registration_date": registration["registration_date"]
        }

# Initialize registration manager
registration_manager = RegistrationManager()

@router.post("/register", response_model=Dict[str, Any])
async def register_user(registration_data: UserRegistration) -> Dict[str, Any]:
    """Register a new importer/exporter"""
    
    try:
        result = registration_manager.register_user(registration_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/upload-document/{registration_id}")
async def upload_document(
    registration_id: str,
    document_type: str = Form(...),
    document_number: str = Form(...),
    issued_by: str = Form(...),
    issue_date: str = Form(...),
    expiry_date: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Upload a verification document"""
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = f"uploads/documents/{registration_id}"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_extension = file.filename.split('.')[-1]
        filename = f"{document_type}_{document_number}.{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Create document record
        document = DocumentVerification(
            document_type=document_type,
            document_number=document_number,
            issued_by=issued_by,
            issue_date=issue_date,
            expiry_date=expiry_date,
            verification_status="pending",
            document_url=f"/uploads/documents/{registration_id}/{filename}"
        )
        
        # Update registration (in production, this would be database update)
        if registration_id in registration_manager.registration_storage:
            registration_manager.registration_storage[registration_id]["documents"].append(document.dict())
        
        return {
            "success": True,
            "message": "Document uploaded successfully",
            "document_type": document_type,
            "verification_status": "pending"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document upload failed: {str(e)}")

@router.get("/status/{registration_id}", response_model=Dict[str, Any])
async def get_registration_status(registration_id: str) -> Dict[str, Any]:
    """Get registration status"""
    
    try:
        return registration_manager.get_registration_status(registration_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/required-documents/{business_type}", response_model=Dict[str, List[str]])
async def get_required_documents(business_type: str) -> Dict[str, Any]:
    """Get required documents for business type"""
    
    if business_type not in registration_manager.required_documents:
        raise HTTPException(status_code=400, detail="Invalid business type")
    
    return {
        "business_type": business_type,
        "required_documents": registration_manager.required_documents[business_type],
        "message": f"Required documents for {business_type}"
    }

@router.post("/verify-document/{registration_id}", response_model=Dict[str, Any])
async def verify_document(
    registration_id: str,
    document_type: str,
    verification_result: str = Form(...)
):
    """Verify a document (admin function)"""
    
    try:
        if verification_result not in ["verified", "rejected"]:
            raise HTTPException(status_code=400, detail="Invalid verification result")
        
        result = registration_manager.verify_document(registration_id, document_type, verification_result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@router.get("/dashboard/{registration_id}", response_model=Dict[str, Any])
async def get_registration_dashboard(registration_id: str) -> Dict[str, Any]:
    """Get complete registration dashboard"""
    
    try:
        if registration_id not in registration_manager.registration_storage:
            raise HTTPException(status_code=404, detail="Registration not found")
        
        registration = registration_manager.registration_storage[registration_id]
        
        return {
            "registration": registration,
            "verification_progress": {
                "total_documents": len(registration["documents"]),
                "verified_documents": len([d for d in registration["documents"] if d["verification_status"] == "verified"]),
                "pending_documents": len([d for d in registration["documents"] if d["verification_status"] == "pending"]),
                "rejected_documents": len([d for d in registration["documents"] if d["verification_status"] == "rejected"])
            },
            "next_actions": registration_manager._get_next_steps(registration["missing_documents"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard failed: {str(e)}")
