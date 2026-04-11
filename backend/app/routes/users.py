from fastapi import APIRouter, HTTPException, Depends
from app.database import get_database
from app.models import User
from app.auth import verify_token
from bson import ObjectId

router = APIRouter()

async def get_current_user(token: str = Depends(verify_token)):
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_database()
    user = await db.users.find_one({"email": token.get("sub")})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

@router.get("/profile", response_model=dict)
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "email": current_user["email"],
        "company_name": current_user["company_name"],
        "user_type": current_user["user_type"],
        "country": current_user["country"],
        "verification_status": current_user["verification_status"],
        "company_size": current_user.get("company_size"),
        "business_description": current_user.get("business_description"),
        "annual_revenue": current_user.get("annual_revenue"),
        "products": current_user.get("products", []),
        "created_at": current_user["created_at"]
    }

@router.put("/profile", response_model=dict)
async def update_user_profile(update_data: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    # Remove non-updatable fields
    update_data.pop("email", None)
    update_data.pop("verification_status", None)
    update_data.pop("created_at", None)
    
    update_data["updated_at"] = datetime.utcnow()
    
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}