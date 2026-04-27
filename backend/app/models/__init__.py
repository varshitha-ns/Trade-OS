from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

# Import matchmaker models
from .matchmaker import (
    TradeRequest, PartnerProfile, TrustScore, SimilarityScore,
    RiskAssessment, ComplianceCheck, MatchRecommendation,
    MatchResult, MatchingMetrics, UserRole
)

class UserType(str, Enum):
    EXPORTER = "exporter"
    IMPORTER = "importer"
    BOTH = "both"

class VerificationStatus(str, Enum):
    PENDING = "PENDING_VERIFICATION"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class CompanySize(str, Enum):
    MICRO = "micro"  # 1-9 employees
    SMALL = "small"  # 10-49 employees
    MEDIUM = "medium"  # 50-249 employees

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    user_type: UserType
    country: str
    business_registration_number: str # Maps to GSTIN/Business ID
    contact_number: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    email: EmailStr
    company_name: str
    user_type: UserType
    country: str
    business_registration_number: str
    contact_number: str
    verification_status: VerificationStatus
    company_size: Optional[CompanySize] = None
    business_description: Optional[str] = None
    annual_revenue: Optional[str] = None
    products: List[str] = []
    created_at: datetime
    updated_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class Product(BaseModel):
    id: str
    user_id: str
    name: str
    description: str
    category: str
    price: float
    currency: str = "USD"
    quantity: int
    images: List[str] = []
    hs_code: Optional[str] = None
    certifications: List[str] = []
    created_at: datetime
    updated_at: datetime

class TradeHistory(BaseModel):
    id: str
    exporter_id: str
    importer_id: str
    product_id: str
    quantity: int
    total_value: float
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None