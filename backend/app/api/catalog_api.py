from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.agents.catalog_agent import catalog_agent

router = APIRouter(tags=["Catalog Generation"])

@router.post("/generate")
async def generate_smart_catalog(payload: Dict[str, str] = Body(...)) -> Dict[str, Any]:
    """
    Takes raw exporter text and uses AI to generate an HS-Code mapped catalog entry.
    """
    description = payload.get("description", "")
    if not description:
        raise HTTPException(status_code=400, detail="Description is required")
        
    result = await catalog_agent.generate_catalog(description)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("message", "Generation failed"))
        
    return result
