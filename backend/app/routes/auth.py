from fastapi import APIRouter, HTTPException, Depends
from app.database import get_database
from app.models import UserCreate, UserLogin, Token, User, VerificationStatus
from app.auth import get_password_hash, verify_password, create_access_token
from datetime import datetime
from bson import ObjectId

router = APIRouter()

@router.post("/register", response_model=dict)
async def register(user_data: UserCreate):
    db = get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user document
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_data.password)
    user_dict["verification_status"] = VerificationStatus.PENDING
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = datetime.utcnow()
    user_dict["products"] = []
    
    # Insert user
    result = await db.users.insert_one(user_dict)
    
    return {
        "message": "User registered successfully. Awaiting verification.",
        "user_id": str(result.inserted_id)
    }

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    db = get_database()
    
    # Find user
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check verification status
    if user["verification_status"] != VerificationStatus.VERIFIED:
        raise HTTPException(status_code=401, detail="Account pending verification")
    
    # Create token
    access_token = create_access_token(data={"sub": user["email"], "user_id": str(user["_id"])})
    
    return Token(access_token=access_token, token_type="bearer")