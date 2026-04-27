from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.agents.qc_agent import qc_agent

router = APIRouter()

@router.post("/inspect")
async def run_inspection(payload: Dict[str, Any] = Body(...)):
    """
    Triggers an autonomous quality inspection for a trade item.
    """
    product_name = payload.get("product_name")
    trade_id = payload.get("trade_id", "TRD-DEMO")
    
    if not product_name:
        raise HTTPException(status_code=400, detail="product_name is required")
        
    try:
        report = await qc_agent.inspect_trade_item(product_name, trade_id)
        return {
            "status": "success",
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
