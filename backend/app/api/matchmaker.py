"""Autonomous Matchmaker API (Mongo-backed)."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field

from app.database import get_database
from app.services.autonomous_matchmaker import autonomous_matchmaker_service

router = APIRouter(tags=["Matchmaker"])


class MatchmakerFeedback(BaseModel):
    supplier_id: str
    deal_success: bool
    delivery_delay: Optional[float] = Field(default=None, description="Delay in days")
    buyer_rating_after: Optional[float] = Field(default=None, ge=0, le=5)
    buyer_id: Optional[str] = None
    hs_code: Optional[str] = None


@router.post("/recommend", response_model=Dict[str, Any])
async def recommend_suppliers(parsed_item: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Get top supplier recommendations using autonomous multi-agent orchestration."""
    try:
        return await autonomous_matchmaker_service.recommend_suppliers(parsed_item, top_k=5)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {exc}")


@router.post("/find-suppliers", response_model=Dict[str, Any])
async def find_suppliers(match_request: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Alias endpoint kept for frontend compatibility."""
    try:
        return await autonomous_matchmaker_service.recommend_suppliers(match_request, top_k=5)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Find suppliers failed: {exc}")


@router.post("/feedback", response_model=Dict[str, Any])
async def submit_feedback(payload: MatchmakerFeedback) -> Dict[str, Any]:
    """
    Learning loop endpoint:
    stores outcome and updates supplier profile for future recommendations.
    """
    try:
        return await autonomous_matchmaker_service.record_feedback(payload.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Feedback processing failed: {exc}")


@router.get("/suppliers", response_model=List[Dict[str, Any]])
async def list_suppliers(limit: int = 20):
    """List suppliers from MongoDB (`suppliers_master`)."""
    db = get_database()
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected")

    safe_limit = max(1, min(limit, 100))
    suppliers = await db.suppliers_master.find({}).limit(safe_limit).to_list(length=safe_limit)
    for supplier in suppliers:
        supplier["_id"] = str(supplier["_id"])
    return suppliers
