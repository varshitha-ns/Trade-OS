import asyncio
import pprint
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tradeos_db"]
    doc = await db.suppliers_master.find_one()
    pprint.pprint(doc)

if __name__ == "__main__":
    asyncio.run(main())
