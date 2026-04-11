import os

import pandas as pd
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("backend/.env")

# Load CSV
file_path = "tradeos_master_ai_dataset_1000.csv"
df = pd.read_csv(file_path)

# Convert DataFrame to dictionary
records = df.to_dict(orient="records")

# Connect to MongoDB
mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
database_name = os.getenv("DATABASE_NAME", "tradeos_db")
client = MongoClient(mongo_url)

db = client[database_name]
collection = db["suppliers_master"]

# Optional: Clear old data
collection.delete_many({})

# Insert new records
collection.insert_many(records)

print(f"{len(records)} records inserted successfully into {database_name}.suppliers_master")
