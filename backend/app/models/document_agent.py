from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class DocumentType(str, Enum):
    # Commercial
    COMMERCIAL_INVOICE = "Commercial Invoice"
    PACKING_LIST = "Packing List"
    SALES_CONTRACT = "Sales Contract"
    
    # Logistics
    BILL_OF_LADING = "Bill of Lading"
    AIR_WAYBILL = "Air Waybill"
    SHIPPING_INSTRUCTIONS = "Shipping Instructions"
    CARGO_MANIFEST = "Cargo Manifest"
    
    # Compliance
    CERTIFICATE_OF_ORIGIN = "Certificate of Origin"
    PHYTOSANITARY_CERTIFICATE = "Phytosanitary Certificate"
    QUALITY_CERTIFICATE = "Quality Certificate"
    FUMIGATION_CERTIFICATE = "Fumigation Certificate"
    EU_FOOD_SAFETY = "EU Food Safety Compliance"
    TRACEABILITY_CERTIFICATE = "Traceability Certification"
    FDA_CERTIFICATE = "FDA Certificate"
    ISO_CERTIFICATE = "ISO Certificate"
    HACCP_CERTIFICATE = "HACCP Certificate"
    
    # Financial
    INSURANCE_CERTIFICATE = "Insurance Certificate"
    LETTER_OF_CREDIT = "Letter of Credit"
    PAYMENT_SCHEDULE = "Payment Schedule"

class DocumentVerificationStatus(str, Enum):
    PENDING = "Pending"
    REQUESTED = "Requested"
    UPLOADED = "Uploaded"
    VALIDATED = "Validated"
    REJECTED = "Rejected"

class TradeContext(BaseModel):
    """
    Step 1: Trade Context Model. 
    Defines the environment and parameters for the Trade Document generation.
    """
    trade_id: str
    supplier_id: str
    buyer_id: str
    exporter_country: str
    importer_country: str
    hs_code: str
    product_category: str
    product_name: str
    quantity: float
    price: float
    logistics_mode: str  # Sea, Air, Land
    delivery_terms: str # FOB, CIF, etc.
    payment_terms: str # LC, Advance, etc.

class DocumentRequirement(BaseModel):
    document_type: DocumentType
    description: str
    issuing_authority: Optional[str] = None
    is_required: bool = True

class TradeDocument(BaseModel):
    document_id: str
    trade_id: str
    supplier_id: str
    document_type: DocumentType
    status: DocumentVerificationStatus = DocumentVerificationStatus.PENDING
    file_url: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class TradePackage(BaseModel):
    trade_id: str
    status: str
    documents: List[TradeDocument]
