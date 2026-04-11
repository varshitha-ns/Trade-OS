from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.agents.risk_agent import risk_agent
from app.database import mongodb

router = APIRouter()

class TradeRequest(BaseModel):
    supplier_id: str
    country: Optional[str] = "CN"
    buyer_country: Optional[str] = "IN"
    hs_code: Optional[str] = "091030" # Default Turmeric
    price: Optional[float] = 100.0
    payment_terms: Optional[str] = "Advance"
    delivery_days: Optional[int] = 30
    supplier_port: Optional[str] = "Shanghai"
    buyer_port: Optional[str] = "Mumbai"

@router.post("/assess-risk")
async def assess_risk(request: TradeRequest):
    """
    Acts as the Decision Gatekeeper before trade execution.
    Fetches real-time supplier data and aggregates 5 pillars of risk.
    """
    trade_data = request.dict()
    supplier_id = trade_data["supplier_id"]
    
    # 1. Fetch Supplier from MongoDB (or mock if not found)
    supplier_data = None
    try:
        db = mongodb.database
        if db is not None:
            # Assumes a collection named 'suppliers_master' or 'suppliers'
            supplier_data = await db["suppliers"].find_one({"supplier_id": supplier_id})
    except Exception as e:
        print(f"Error fetching from MongoDB: {e}")
        
    # Fallback mock data if DB fetch fails or is empty
    if not supplier_data:
        print(f"Supplier {supplier_id} not found in DB. Using mock profile.")
        supplier_data = {
            "supplier_id": supplier_id,
            "reliability_score": 0.85,
            "dispute_rate_percent": 2.0,
            "on_time_delivery_rate_percent": 90.0,
            "country": trade_data["country"],
            "tariff_rate": 5.0,
            "trade_restriction_flag": False
        }
        
    # 2. Run Risk Agent
    try:
        report = risk_agent.analyze_trade_risk(trade_data, supplier_data)
        return {
            "status": "success",
            "trade_id": "TRD-SIMULATED",
            "supplier_id": supplier_id,
            "risk_report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
