import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, List
from app.agents.document_agent import document_agent
from app.models.document_agent import TradePackage, TradeDocument

router = APIRouter()

class DocumentAgentRequest(BaseModel):
    trade_id: str
    supplier_id: str
    buyer_id: str
    exporter_country: str
    importer_country: str
    hs_code: str
    product_category: str
    product_name: str
    quantity: float
    price: float
    logistics_mode: str
    delivery_terms: str
    payment_terms: str

@router.post("/process")
async def process_document_workflow(request: DocumentAgentRequest):
    try:
        trade_data = request.dict()
        package = await document_agent.execute_autonomous_workflow(trade_data)
        return package
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{document_id}")
async def download_document(document_id: str):
    """Securely serve generated PDFs back to the client."""
    docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated_docs")
    file_path = os.path.join(docs_dir, f"{document_id}.pdf")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document not found.")
        
    return FileResponse(file_path, media_type="application/pdf", filename=f"{document_id}.pdf")

