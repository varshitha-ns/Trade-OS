import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tradeos_db"]
    collection = db["suppliers_master"]
    
    unique_products = await collection.distinct("products.product_name")
    print(f"Total Unique Products: {len(unique_products)}")
    print(f"Products: {unique_products}")

if __name__ == "__main__":
    asyncio.run(main())
