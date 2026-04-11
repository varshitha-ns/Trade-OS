from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Supplier(BaseModel):
    supplier_id: str
    company_name: str
    country: str
    business_type: str  # exporter, manufacturer, trader
    hs_codes: List[str]
    products: List[str]
    categories: List[str]
    production_capacity: float
    capacity_unit: str
    min_order_quantity: float
    delivery_countries: List[str]
    verification_level: int  # 1-5
    certifications: List[str]
    quality_standards: List[str]
    total_trades: int
    success_rate: float
    on_time_delivery_rate: float
    average_rating: float
    years_in_business: int
    company_size: str  # micro, small, medium, large
    response_time_hours: int
    risk_score: float  # 0.0 - 1.0 (lower is better)
    compliance_status: str
    aadhaar_verified: bool = False
    kyc_verified: bool = False
    last_updated: datetime = Field(default_factory=datetime.now)
    active: bool = True

def get_mock_suppliers() -> List[Supplier]:
    return [
        Supplier(
            supplier_id="sup_001",
            company_name="Indo Spice Global",
            country="India",
            business_type="exporter",
            hs_codes=["091030", "0910"],
            products=["Organic Turmeric Powder", "Ginger"],
            categories=["spices"],
            production_capacity=100000,
            capacity_unit="kg",
            min_order_quantity=500,
            delivery_countries=["Germany", "USA", "France"],
            verification_level=5,
            certifications=["organic", "ISO 9001"],
            quality_standards=["Premium"],
            total_trades=150,
            success_rate=0.98,
            on_time_delivery_rate=0.95,
            average_rating=4.9,
            years_in_business=12,
            company_size="medium",
            response_time_hours=12,
            risk_score=0.1,
            compliance_status="compliant",
            aadhaar_verified=True,
            kyc_verified=True
        ),
        Supplier(
            supplier_id="sup_002",
            company_name="Vietnam Herbals",
            country="Vietnam",
            business_type="manufacturer",
            hs_codes=["091030"],
            products=["Turmeric Powder"],
            categories=["spices"],
            production_capacity=50000,
            capacity_unit="kg",
            min_order_quantity=1000,
            delivery_countries=["Germany", "China"],
            verification_level=3,
            certifications=["ISO 9001"],
            quality_standards=["Standard"],
            total_trades=80,
            success_rate=0.85,
            on_time_delivery_rate=0.80,
            average_rating=4.2,
            years_in_business=5,
            company_size="small",
            response_time_hours=24,
            risk_score=0.3,
            compliance_status="compliant",
            aadhaar_verified=False,
            kyc_verified=True
        ),
        Supplier(
            supplier_id="sup_003",
            company_name="China Spice Traders",
            country="China",
            business_type="trader",
            hs_codes=["091030"],
            products=["Turmeric"],
            categories=["spices"],
            production_capacity=200000,
            capacity_unit="kg",
            min_order_quantity=5000,
            delivery_countries=["Germany", "Japan"],
            verification_level=2,
            certifications=[],
            quality_standards=["Bulk"],
            total_trades=300,
            success_rate=0.75,
            on_time_delivery_rate=0.70,
            average_rating=3.5,
            years_in_business=8,
            company_size="large",
            response_time_hours=48,
            risk_score=0.5,
            compliance_status="warning",
            aadhaar_verified=False,
            kyc_verified=False
        )
    ]
