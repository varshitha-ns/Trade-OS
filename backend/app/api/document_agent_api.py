import os
import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, List
from app.agents.document_agent import document_agent
from app.models.document_agent import TradePackage, TradeDocument
from app.core.events import event_bus
from app.models.document_agent import TradeContext
from app.services.trade_knowledge_rag import answer_trade_knowledge_question

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


@router.post("/requirements/rag")
async def review_trade_requirements_with_sources(request: TradeContext):
    """Optional, cited RAG review; does not modify generated documents or status."""
    try:
        return await answer_trade_knowledge_question(request)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Trade knowledge retrieval unavailable: {exc.__class__.__name__}")

@router.post("/process")
async def process_document_workflow(request: DocumentAgentRequest):
    try:
        trade_data = request.dict()
        package = await document_agent.execute_autonomous_workflow(trade_data)
        
        # 🔥 AUTONOMOUS PIPELINE: Fire DOCUMENTS_READY event (non-blocking)
        # Triggers EscrowAgent to lock funds for Milestone 1 (20%)
        asyncio.create_task(event_bus.emit("DOCUMENTS_READY", {
            "trade_id": request.trade_id,
            "supplier_id": request.supplier_id,
            "document_count": len(package.documents) if hasattr(package, 'documents') else 0,
            "contract_address": "0x0000000000000000000000000000000000000000"
        }))
        
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
