from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.agents.orchestrator_agent import orchestrator
import os

router = APIRouter()

class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    status: str
    message: str
    action_type: Optional[str] = None
    action_target: Optional[str] = None
    requires_api_key: bool = False

@router.post("/chat", response_model=ChatResponse)
async def process_chat(request: ChatRequest):
    """
    Takes pure natural language from the frontend and passes it to the
    LangChain Hybrid Orchestrator for intent detection and secure tool execution.
    """
    try:
        # Check if the platform has an OpenAI API Key configured for the LangChain agent
        if not orchestrator.api_key:
            return ChatResponse(
                status="warning",
                message="To use the powerful natural-language TradeOS Orchestrator, the platform administrator must configure an OPENAI_API_KEY in the backend `.env` file first. Falling back to manual mode...",
                requires_api_key=True
            )
            
        result = orchestrator.process_query(request.query)
        
        return ChatResponse(
            status=result.get("status", "success"),
            message=result.get("message", "Processed."),
            action_type=result.get("action_type", "chat"),
            action_target=result.get("action_target", None)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
