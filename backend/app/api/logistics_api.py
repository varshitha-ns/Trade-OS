from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from app.agents.logistics_agent import LogisticsAgent

router = APIRouter()
logistics_agent_instance = LogisticsAgent()

class TradeLogisticsRequest(BaseModel):
    supplier_port: str
    buyer_port: str
    weight_kg: float
    commodity: str

class BookShipmentRequest(BaseModel):
    route_option_id: str
    trade_id: str

class TrackShipmentResponse(BaseModel):
    tracking_number: str
    live_status_code: str
    status_description: str
    timestamp: str
    location_ping: str

@router.post("/plan")
async def plan_logistics_routes(request: TradeLogisticsRequest):
    """
    Analyzes multi-modal sea/air/land routes using the Risk Agent for weather safety checks.
    """
    try:
        trade_details = request.dict()
        options = logistics_agent_instance.plan_optimal_routes(trade_details)
        return {
            "status": "success",
            "message": f"Calculated {len(options)} pareto-optimal transit routes.",
            "routes": options
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/book")
async def book_logistics_route(request: BookShipmentRequest):
    """
    Books the optimized route and simulates a carrier API tracking number assignment.
    """
    try:
        booking = logistics_agent_instance.book_shipment(request.route_option_id, request.trade_id)
        return {
            "status": "success",
            "booking": booking
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/track/{tracking_id}", response_model=TrackShipmentResponse)
async def track_shipment(tracking_id: str):
    """
    Simulates fetching a live webhook payload from a carrier container ship.
    """
    try:
        return logistics_agent_instance.fetch_tracking_status(tracking_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
