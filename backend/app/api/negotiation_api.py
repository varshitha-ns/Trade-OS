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

class PitchRequest(BaseModel):
    product_name: str
    quantity: float
    unit: str = "tons"
    hs_code: str = "000000"
    buyer_id: str
    buyer_country: str

@router.post("/generate-pitch")
async def generate_cif_pitch(request: PitchRequest):
    """
    Step 1 of the Pitch-to-Contract cascade. Uses Market Agent to get live prices
    and calculates shipping/insurance overhead to construct a CIF Pitch.
    """
    from app.agents.risk_agent import risk_agent
    
    try:
        # 1. Fetch live commodity value (price is per KG)
        market_intel = market_agent.analyze_market_price(request.product_name)
        base_price_per_kg = market_intel.get("market_price", 1000.0)
        
        # Convert quantity to KG regardless of unit provided
        unit = (request.unit or "kg").lower().strip()
        if unit in ["ton", "tons", "tonne", "tonnes", "mt"]:
            quantity_kg = request.quantity * 1000
        elif unit in ["quintal", "quintals", "q"]:
            quantity_kg = request.quantity * 100
        elif unit in ["gram", "grams", "g"]:
            quantity_kg = request.quantity / 1000
        else:  # already kg or unknown
            quantity_kg = request.quantity
        
        # Total FOB cost = price_per_kg * total_kg
        fob_cost = base_price_per_kg * quantity_kg
        
        # 2. Simulate Logistics Freight & Insurance overhead based on risk/distance
        freight_multiplier = risk_agent.calculate_logistics_risk({"buyer_port": request.buyer_country}) / 10.0
        # If risk is 0, add 5%. If risk is 10, add 25%.
        freight_insurance_cost = fob_cost * (0.05 + (0.20 * freight_multiplier))
        
        total_cif = fob_cost + freight_insurance_cost

        # 3. Check for embargoes or major financial risk
        mock_supplier = {"country": "Origin"} # Assume Exporter is safe
        mock_trade = {"buyer_country": request.buyer_country, "payment_terms": "LC"}
        
        fin_risk = risk_agent.calculate_financial_risk(mock_trade, mock_supplier)
        
        risk_status = "Cleared for Export"
        if fin_risk > 7.0:
            risk_status = "Flagged: High Currency Volatility or Strict Payment Mode Needed"
            
        return {
            "status": "success",
            "risk_status": risk_status,
            "proposal": {
                "product_name": request.product_name,
                "quantity": request.quantity,
                "unit": request.unit,
                "quantity_kg": round(quantity_kg, 2),
                "price_per_kg": round(base_price_per_kg, 2),
                "base_price_fob": round(fob_cost, 2),
                "freight_insurance": round(freight_insurance_cost, 2),
                "total_cif_quote": round(total_cif, 2),
                "currency": market_intel.get("currency", "INR")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
