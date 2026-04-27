from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime

router = APIRouter()

@router.get("/ledger/{trade_id}")
async def get_escrow_ledger(trade_id: str, price: float = 0.0):
    """
    Calculates the real financial status of a trade based on milestones.
    In a production system, this queries the Blockchain/SQL TransactionRecord.
    """
    if price <= 0:
        price = 50000.0 # Default fallback for demo
        
    # Logic: 
    # 20% released on Document Validation
    # 30% released on Shipment Dispatched (Milestone 2)
    # 50% released on Delivery Confirmed (Milestone 3)
    
    milestones = [
        {"id": 1, "name": "Document Validation", "percentage": 20, "amount": price * 0.2, "status": "RELEASED", "tx_hash": "0x4f...a12"},
        {"id": 2, "name": "Vessel Departure", "percentage": 30, "amount": price * 0.3, "status": "PENDING", "tx_hash": None},
        {"id": 3, "name": "Final Delivery", "percentage": 50, "amount": price * 0.5, "status": "LOCKED", "tx_hash": None},
    ]
    
    return {
        "trade_id": trade_id,
        "total_value": price,
        "currency": "INR",
        "escrow_address": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        "milestones": milestones,
        "total_released": price * 0.2,
        "total_locked": price * 0.8
    }
