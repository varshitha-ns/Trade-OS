from fastapi import APIRouter, HTTPException, Depends, Query
from app.database import get_database
from app.auth import verify_token
from app.models import Product
from datetime import datetime
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

@router.post("/products", response_model=dict)
async def create_product(product_data: dict, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    product_dict = {
        "user_id": str(current_user["_id"]),
        "name": product_data["name"],
        "description": product_data["description"],
        "category": product_data["category"],
        "price": product_data["price"],
        "currency": product_data.get("currency", "USD"),
        "quantity": product_data["quantity"],
        "images": product_data.get("images", []),
        "hs_code": product_data.get("hs_code"),
        "certifications": product_data.get("certifications", []),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.products.insert_one(product_dict)
    
    # Add product to user's products list
    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$push": {"products": str(result.inserted_id)}}
    )
    
    return {
        "message": "Product created successfully",
        "product_id": str(result.inserted_id)
    }

@router.get("/products", response_model=dict)
async def get_products(
    category: str = Query(None),
    country: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    
    # Build filter
    filter_query = {}
    if category:
        filter_query["category"] = {"$regex": category, "$options": "i"}
    
    # Get total count
    total = await db.products.count_documents(filter_query)
    
    # Get products with user info
    products_cursor = db.products.find(filter_query).skip((page - 1) * limit).limit(limit)
    products = await products_cursor.to_list(length=limit)
    
    # Enhance products with user information
    enhanced_products = []
    for product in products:
        user = await db.users.find_one({"_id": ObjectId(product["user_id"])})
        if user and user["verification_status"] == "verified":
            enhanced_product = {
                "id": str(product["_id"]),
                "name": product["name"],
                "description": product["description"],
                "category": product["category"],
                "price": product["price"],
                "currency": product.get("currency", "USD"),
                "quantity": product["quantity"],
                "company_name": user["company_name"],
                "company_country": user["country"],
                "user_type": user["user_type"],
                "images": product.get("images", [])
            }
            enhanced_products.append(enhanced_product)
    
    return {
        "products": enhanced_products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/products/{product_id}", response_model=dict)
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
    if not ObjectId.is_valid(product_id):
        raise HTTPException(status_code=400, detail="Invalid product ID")
    
    product = await db.products.find_one({"_id": ObjectId(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    user = await db.users.find_one({"_id": ObjectId(product["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="Product owner not found")
    
    return {
        "id": str(product["_id"]),
        "name": product["name"],
        "description": product["description"],
        "category": product["category"],
        "price": product["price"],
        "currency": product.get("currency", "USD"),
        "quantity": product["quantity"],
        "images": product.get("images", []),
        "hs_code": product.get("hs_code"),
        "certifications": product.get("certifications", []),
        "company_name": user["company_name"],
        "company_country": user["country"],
        "user_type": user["user_type"],
        "business_description": user.get("business_description"),
        "created_at": product["created_at"]
    }