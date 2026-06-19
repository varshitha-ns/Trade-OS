import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_db():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tradeos_db
    count = await db.trade_requests.count_documents({})
    results = await db.trade_requests.find({}).to_list(length=10)
    print(f"Total RFQs in DB: {count}")
    for idx, r in enumerate(results):
        print(f"[{idx}] {r.get('buyer_id', 'Unknown')}: {r.get('quantity')} {r.get('unit')} {r.get('product_name')} (HS:{r.get('hs_code_suggestion')})")

if __name__ == "__main__":
    asyncio.run(check_db())
