import asyncio
import uuid
import pandas as pd
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

async def seed_db_from_csv():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = os.getenv("DATABASE_NAME", "tradeos_platform")
    db = client[db_name]
    
    print(f"Clearing existing mock RFQs in {db_name} (to prevent duplicates)...")
    await db.trade_requests.delete_many({"buyer_id": {"$exists": True}})
    
    df = pd.read_csv('../tradeos_master_ai_dataset_1000.csv')
    unique_products = df.drop_duplicates(subset=['commodity_name'])
    
    mock_rfqs = []
    for _, row in unique_products.iterrows():
        mock_rfqs.append({
            "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
            "buyer_id": f"Global {row['category']} Imports Ltd",
            "destination_country": "United States",
            "product_name": row['commodity_name'],
            "product_category": row['category'],
            "hs_code_suggestion": str(row['hs_code']),
            "quantity": 5000,
            "unit": "units",
            "status": "active"
        })
        
    print(f"Inserting {len(mock_rfqs)} Global Buyer RFQs into trade_requests collection...")
    await db.trade_requests.insert_many(mock_rfqs)
    print("Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_db_from_csv())
