from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from app.agents.market_agent import market_agent
from app.agents.negotiation_agent import negotiator

router = APIRouter()

class NegotiationRequest(BaseModel):
    product_name: str
    quantity: float
    price: float
    supplier_id: str
    delivery_terms: str = "FOB"

@router.get("/market-price")
async def get_market_price(product_name: str):
    """
    Directly query the Market Intelligence Agent for a commodity's fair market value.
    """
    try:
        analysis = market_agent.analyze_market_price(product_name)
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/negotiate")
async def run_negotiation(request: NegotiationRequest):
    """
    Run the multi-round negotiation simulation against a mock supplier 
    using the autonomous AI negotiator backed by live intelligence.
    """
    try:
        payload = request.dict()
        result = negotiator.run_negotiation(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
