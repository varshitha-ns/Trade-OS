import asyncio, motor.motor_asyncio; async def main(): db = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')['tradeos_db']; print('Suppliers:', await db.suppliers_master.count_documents({})); print(await db.suppliers_master.find_one({})); 
asyncio.run(main())
