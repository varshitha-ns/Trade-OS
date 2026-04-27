from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import uuid

router = APIRouter()

# Simulated database for Co-Import Groups
co_import_groups = [
    {
        "group_id": "GRP-LDH-COPPER",
        "hub": "Ludhiana",
        "commodity": "Copper Cathodes",
        "target_moq": 10000,
        "current_total": 7500,
        "participants": 3,
        "days_left": 4,
        "status": "ACTIVE"
    },
    {
        "group_id": "GRP-RAJKOT-STEEL",
        "hub": "Rajkot",
        "commodity": "Industrial Fasteners",
        "target_moq": 5000,
        "current_total": 4800,
        "participants": 5,
        "days_left": 1,
        "status": "NEAR_COMPLETION"
    }
]

@router.get("/groups")
async def get_groups(hub: str = None, commodity: str = None):
    """
    Returns active group-buying pools for Indian SME hubs.
    """
    results = co_import_groups
    if hub:
        results = [g for g in results if g["hub"].lower() == hub.lower()]
    if commodity:
        results = [g for g in results if commodity.lower() in g["commodity"].lower()]
    return results

from pydantic import BaseModel

class JoinRequest(BaseModel):
    company_name: str
    quantity: int

@router.post("/join/{group_id}")
async def join_group(group_id: str, request: JoinRequest):
    """
    Adds an SME to a co-import container group.
    """
    company_name = request.company_name
    quantity = request.quantity
    for group in co_import_groups:
        if group["group_id"] == group_id:
            group["current_total"] += quantity
            group["participants"] += 1
            return {"status": "success", "message": f"Joined {group_id}. Current group total: {group['current_total']}kg"}
    
    raise HTTPException(status_code=404, detail="Group not found")

@router.post("/create-proposal")
async def create_proposal(data: Dict[str, Any]):
    """
    Creates a new MOQ aggregation proposal for a specific industrial hub.
    """
    new_group = {
        "group_id": f"GRP-{uuid.uuid4().hex[:6].upper()}",
        "hub": data.get("hub", "General"),
        "commodity": data.get("commodity"),
        "target_moq": data.get("target_moq", 5000),
        "current_total": data.get("initial_quantity", 0),
        "participants": 1,
        "days_left": 7,
        "status": "PENDING"
    }
    co_import_groups.append(new_group)
    return new_group
