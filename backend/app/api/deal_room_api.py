from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import datetime

router = APIRouter()

# In-memory store for active deal rooms
# In production, this would be Redis or Postgres
active_deal_rooms = {}

class DealRoomMessage(BaseModel):
    sender: str  # 'Exporter' or 'Buyer'
    type: str    # 'offer', 'msg'
    price: Optional[float] = None
    text: str
    time: str

class DealRoomCreate(BaseModel):
    room_id: str
    buyer: Dict[str, Any]
    initial_message: DealRoomMessage
    intelligence: Dict[str, Any]

class DealRoomAction(BaseModel):
    action: str  # 'agree', 'reject'
    price: Optional[float] = None

@router.post("/create")
async def create_deal_room(data: DealRoomCreate):
    active_deal_rooms["latest"] = {
        "room_id": data.room_id,
        "buyer": data.buyer,
        "status": "NEGOTIATING",
        "history": [data.initial_message.dict()],
        "intelligence": data.intelligence,
        "agreedPrice": None
    }
    return {"status": "success", "room": active_deal_rooms["latest"]}

@router.get("/active")
async def get_active_deal_room():
    if "latest" in active_deal_rooms:
        return {"status": "success", "room": active_deal_rooms["latest"]}
    return {"status": "empty"}

@router.post("/message")
async def send_message(msg: DealRoomMessage):
    if "latest" not in active_deal_rooms:
        return {"status": "error", "detail": "No active deal room"}
        
    room = active_deal_rooms["latest"]
    room["history"].append(msg.dict())
    
    # Update AI Confidence Score roughly based on price proximity
    last_price = msg.price
    if last_price:
        market_avg = room["intelligence"].get("marketAvg", 4.28)
        # Closer to market avg = higher confidence
        diff = abs(last_price - market_avg)
        new_confidence = max(30, min(95, 100 - int(diff * 100)))
        room["intelligence"]["confidence"] = new_confidence
        
        # Adjust suggestion slightly based on who sent it
        if msg.sender == 'Exporter':
            room["intelligence"]["suggestion"] = round(max(market_avg, last_price - 0.05), 2)
        else:
            room["intelligence"]["suggestion"] = round(min(market_avg, last_price + 0.05), 2)
            
    return {"status": "success", "room": room}

@router.post("/action")
async def deal_room_action(action_data: DealRoomAction):
    if "latest" not in active_deal_rooms:
        return {"status": "error", "detail": "No active deal room"}
        
    room = active_deal_rooms["latest"]
    if action_data.action == 'agree':
        room["status"] = "AGREED"
        room["agreedPrice"] = action_data.price
        room["intelligence"]["confidence"] = 100
        
    return {"status": "success", "room": room}

@router.post("/clear")
async def clear_deal_room():
    if "latest" in active_deal_rooms:
        del active_deal_rooms["latest"]
    return {"status": "success"}
