from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from app.agents.buyer_matchmaker_agent import buyer_matchmaker_agent

router = APIRouter(tags=["Buyer Matchmaker"])

@router.post("/find-buyers")
async def find_buyers(catalog_item: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Finds existing Importer Trade Requests (RFQs) that match the provided 
    Exporter product catalog.
    """
    try:
        return await buyer_matchmaker_agent.find_buyers_for_catalog(catalog_item, top_k=5)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
