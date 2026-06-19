from fastapi import APIRouter, HTTPException, Body, UploadFile, File
from typing import Dict, Any
import os
from app.agents.catalog_agent import catalog_agent
from app.agents.product_intelligence_agent import product_intelligence_agent
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

@router.post("/analyze-image")
async def analyze_product_image(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Takes an uploaded product image and uses Gemini Vision to extract OCR data,
    predict HS codes, and generate a verified product profile.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    contents = await file.read()
    
    # In a real app, save the file to a cloud bucket or public directory.
    # For demo, we assume the frontend sends images that might already exist or we just pass the bytes.
    # We will pass a dummy URL or the filename back.
    image_url = f"/images/products/{file.filename}"
    
    result = await product_intelligence_agent.analyze_product_image(contents, image_url=image_url)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("message", "Image analysis failed"))
        
    return result
