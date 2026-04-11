from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

class MongoDB:
    client: AsyncIOMotorClient = None
    database = None

mongodb = MongoDB()

async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    mongodb.database = mongodb.client[os.getenv("DATABASE_NAME")]
    print("Connected to MongoDB")

async def close_mongo_connection():
    mongodb.client.close()
    print("Disconnected from MongoDB")

def get_database():
    return mongodb.database