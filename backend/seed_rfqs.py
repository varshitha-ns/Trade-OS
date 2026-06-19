import asyncio
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load env vars to get Mongo URI
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

mock_rfqs = [
    # ---------------- Original Seed Data ----------------
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Tesco Supermarkets (UK)",
        "destination_country": "United Kingdom",
        "product_name": "Organic Turmeric Powder",
        "product_category": "Spices",
        "hs_code_suggestion": "091030",
        "quantity": 25,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Bayer Pharma GmbH",
        "destination_country": "Germany",
        "product_name": "Raw Turmeric Root",
        "product_category": "Spices",
        "hs_code_suggestion": "091030",
        "quantity": 10,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Starbucks Reserve Distribution",
        "destination_country": "USA",
        "product_name": "Arabica Coffee Beans",
        "product_category": "Coffee",
        "hs_code_suggestion": "090111",
        "quantity": 50,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Zara Manufacturing",
        "destination_country": "Spain",
        "product_name": "Organic Cotton Yarn",
        "product_category": "Textiles",
        "hs_code_suggestion": "520512",
        "quantity": 100,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Nestle Global sourcing",
        "destination_country": "Switzerland",
        "product_name": "Cocoa Beans",
        "product_category": "Cocoa",
        "hs_code_suggestion": "180100",
        "quantity": 200,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "LVMH Leather Goods",
        "destination_country": "France",
        "product_name": "Finished Leather Hides",
        "product_category": "Leather",
        "hs_code_suggestion": "410711",
        "quantity": 5,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Mitsui & Co",
        "destination_country": "Japan",
        "product_name": "Copper Cathodes",
        "product_category": "Metals",
        "hs_code_suggestion": "740311",
        "quantity": 500,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Walmart Direct Sourcing",
        "destination_country": "USA",
        "product_name": "Cotton T-Shirts",
        "product_category": "Apparel",
        "hs_code_suggestion": "610910",
        "quantity": 50000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "IKEA Supply AG",
        "destination_country": "Sweden",
        "product_name": "Teak Wood Logs",
        "product_category": "Wood",
        "hs_code_suggestion": "440349",
        "quantity": 20,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Cargill Agri",
        "destination_country": "Netherlands",
        "product_name": "Durum Wheat",
        "product_category": "Grains",
        "hs_code_suggestion": "100119",
        "quantity": 1000,
        "unit": "tons",
        "status": "active"
    },
    # ---------------- New Expanded Data ----------------
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Samsung Electronics",
        "destination_country": "South Korea",
        "product_name": "Silicon Wafers",
        "product_category": "Electronics",
        "hs_code_suggestion": "381800",
        "quantity": 50,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "P&G Chemicals",
        "destination_country": "USA",
        "product_name": "Palm Oil",
        "product_category": "Chemicals",
        "hs_code_suggestion": "151190",
        "quantity": 200,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Tata Motors Import",
        "destination_country": "India",
        "product_name": "Lithium Ion Batteries",
        "product_category": "Automotive",
        "hs_code_suggestion": "850760",
        "quantity": 10000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Olam International",
        "destination_country": "Singapore",
        "product_name": "Cashew Nuts",
        "product_category": "Agriculture",
        "hs_code_suggestion": "080132",
        "quantity": 15,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Alinma Steel Co.",
        "destination_country": "Saudi Arabia",
        "product_name": "Steel Rebars",
        "product_category": "Construction Metals",
        "hs_code_suggestion": "721420",
        "quantity": 5000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Foxconn Assembly",
        "destination_country": "Taiwan",
        "product_name": "Printed Circuit Boards",
        "product_category": "Electronics components",
        "hs_code_suggestion": "853400",
        "quantity": 500000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Unilever Foods",
        "destination_country": "UK",
        "product_name": "Black Tea Leaves",
        "product_category": "Beverages",
        "hs_code_suggestion": "090240",
        "quantity": 40,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Johnson & Johnson Med",
        "destination_country": "USA",
        "product_name": "Surgical Masks",
        "product_category": "Medical Supplies",
        "hs_code_suggestion": "630790",
        "quantity": 1000000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Heineken Brewing",
        "destination_country": "Netherlands",
        "product_name": "Malted Barley",
        "product_category": "Agriculture",
        "hs_code_suggestion": "110710",
        "quantity": 400,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Basf Chemical Corp",
        "destination_country": "Germany",
        "product_name": "Industrial Toluene",
        "product_category": "Chemicals",
        "hs_code_suggestion": "290230",
        "quantity": 150,
        "unit": "tons",
        "status": "active"
    }
]

async def seed_db():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = os.getenv("DATABASE_NAME", "tradeos_platform")
    db = client[db_name]
    
    # We also check what the real app uses just in case
    # The app actually uses standard get_database()
    print(f"Clearing existing mock RFQs in {db_name} (to prevent duplicates)...")
    await db.trade_requests.delete_many({"buyer_id": {"$exists": True}})
    
    print(f"Inserting {len(mock_rfqs)} Global Buyer RFQs into trade_requests collection...")
    await db.trade_requests.insert_many(mock_rfqs)
    
    print("✅ Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_db())
