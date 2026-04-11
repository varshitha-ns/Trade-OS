from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    BUYER = "buyer"
    SUPPLIER = "supplier"
    LOGISTICS = "logistics"

class TradeRequest(BaseModel):
    id: str
    user_id: str
    product_name: str
    product_description: str
    hs_code: str
    quantity: int
    unit: str
    destination_country: str
    origin_country: Optional[str] = None
    timeline_days: int
    budget_max: float
    budget_currency: str = "USD"
    requirements: List[str] = []
    created_at: datetime

class PartnerProfile(BaseModel):
    user_id: str
    company_name: str
    role: UserRole
    country: str
    hs_codes: List[str] = []
    products: List[str] = []
    capacity: Optional[int] = None
    unit: Optional[str] = None
    delivery_countries: List[str] = []
    certifications: List[str] = []
    verification_level: int = 0  # 0-5 scale
    rating: float = 0.0
    total_trades: int = 0
    success_rate: float = 0.0
    on_time_delivery_rate: float = 0.0
    average_response_time_hours: float = 0.0
    created_at: datetime
    updated_at: datetime

class TrustScore(BaseModel):
    user_id: str
    success_rate_weight: float = 0.4
    on_time_delivery_weight: float = 0.2
    rating_weight: float = 0.2
    verification_weight: float = 0.2
    total_score: float
    calculated_at: datetime

class SimilarityScore(BaseModel):
    user_id: str
    similarity_score: float
    matching_factors: Dict[str, float] = {}

class RiskAssessment(BaseModel):
    user_id: str
    risk_score: float  # 0-1, lower is better
    risk_factors: List[str] = []
    last_assessed: datetime

class ComplianceCheck(BaseModel):
    user_id: str
    compliant: bool
    restrictions: List[str] = []
    sanctions_check: bool = True
    last_checked: datetime

class MatchRecommendation(BaseModel):
    partner_id: str
    trust_score: float
    similarity_score: float
    risk_score: float
    overall_score: float
    match_reasons: List[str] = []
    concerns: List[str] = []
    recommended_actions: List[str] = []

class MatchResult(BaseModel):
    trade_request_id: str
    recommendations: List[MatchRecommendation]
    total_candidates_evaluated: int
    processing_time_ms: float
    algorithm_version: str = "v1.0"
    created_at: datetime

class MatchingMetrics(BaseModel):
    date: datetime
    total_requests: int
    successful_matches: int
    average_response_time_ms: float
    user_satisfaction_score: Optional[float] = None
    deal_success_rate: Optional[float] = None
