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
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Spices Global Imports",
        "destination_country": "UAE",
        "product_name": "Premium Cardamom Pods",
        "product_category": "Spices",
        "hs_code_suggestion": "090832",
        "quantity": 10,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "McCormick Spice Co",
        "destination_country": "USA",
        "product_name": "Black Pepper",
        "product_category": "Spices",
        "hs_code_suggestion": "090411",
        "quantity": 50,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "European Flavorings Ltd",
        "destination_country": "Germany",
        "product_name": "Cinnamon",
        "product_category": "Spices",
        "hs_code_suggestion": "090611",
        "quantity": 20,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Middle East Trading House",
        "destination_country": "Saudi Arabia",
        "product_name": "Cloves",
        "product_category": "Spices",
        "hs_code_suggestion": "090710",
        "quantity": 15,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Global Culinary Partners",
        "destination_country": "UK",
        "product_name": "Cumin",
        "product_category": "Spices",
        "hs_code_suggestion": "090931",
        "quantity": 30,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Asian Spice Route",
        "destination_country": "Japan",
        "product_name": "Coriander",
        "product_category": "Spices",
        "hs_code_suggestion": "090921",
        "quantity": 25,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Nutmeg & Co Imports",
        "destination_country": "France",
        "product_name": "Nutmeg",
        "product_category": "Spices",
        "hs_code_suggestion": "090811",
        "quantity": 10,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "AgriGrow Fertco",
        "destination_country": "Brazil",
        "product_name": "Urea Fertilizer",
        "product_category": "Chemicals",
        "hs_code_suggestion": "310210",
        "quantity": 5000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Sweet Life Confections",
        "destination_country": "Canada",
        "product_name": "Raw Sugar",
        "product_category": "Agriculture",
        "hs_code_suggestion": "170114",
        "quantity": 1000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "TexWeave Industries",
        "destination_country": "Bangladesh",
        "product_name": "Raw Cotton",
        "product_category": "Agriculture",
        "hs_code_suggestion": "520100",
        "quantity": 200,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "West Africa Grains",
        "destination_country": "Nigeria",
        "product_name": "Milled Rice",
        "product_category": "Agriculture",
        "hs_code_suggestion": "100630",
        "quantity": 3000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Apple Supply Chain",
        "destination_country": "USA",
        "product_name": "OLED Displays",
        "product_category": "Electronics components",
        "hs_code_suggestion": "852990",
        "quantity": 20000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "GlaxoSmithKline Procurement",
        "destination_country": "UK",
        "product_name": "Bulk Paracetamol API",
        "product_category": "Medical Supplies",
        "hs_code_suggestion": "292229",
        "quantity": 100,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "LafargeHolcim",
        "destination_country": "France",
        "product_name": "Portland Cement",
        "product_category": "Construction",
        "hs_code_suggestion": "252329",
        "quantity": 50000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Toyota Motor Corp",
        "destination_country": "Japan",
        "product_name": "Automotive Engine Parts",
        "product_category": "Automotive",
        "hs_code_suggestion": "870899",
        "quantity": 5000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "ExxonMobil Refining",
        "destination_country": "USA",
        "product_name": "Aviation Turbine Fuel",
        "product_category": "Energy",
        "hs_code_suggestion": "271019",
        "quantity": 100000,
        "unit": "barrels",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Levi Strauss Sourcing",
        "destination_country": "Mexico",
        "product_name": "Denim Fabric Rolls",
        "product_category": "Apparel",
        "hs_code_suggestion": "520942",
        "quantity": 500,
        "unit": "rolls",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "DJI Innovations",
        "destination_country": "China",
        "product_name": "Commercial Drones",
        "product_category": "Electronics",
        "hs_code_suggestion": "880620",
        "quantity": 1000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Siemens Healthineers",
        "destination_country": "Germany",
        "product_name": "X-Ray Machine Components",
        "product_category": "Medical Supplies",
        "hs_code_suggestion": "902290",
        "quantity": 50,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Dow Chemical Company",
        "destination_country": "USA",
        "product_name": "High-Density Polyethylene",
        "product_category": "Chemicals",
        "hs_code_suggestion": "390120",
        "quantity": 10000,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Tesla Gigafactory",
        "destination_country": "Germany",
        "product_name": "Rare Earth Elements",
        "product_category": "Metals",
        "hs_code_suggestion": "280530",
        "quantity": 20,
        "unit": "tons",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "Mayo Clinic Supply Chain",
        "destination_country": "USA",
        "product_name": "Surgical Masks N95",
        "product_category": "Medical Supplies",
        "hs_code_suggestion": "630790",
        "quantity": 1000000,
        "unit": "units",
        "status": "active"
    },
    {
        "request_id": f"RFQ-{uuid.uuid4().hex[:8]}",
        "buyer_id": "TSMC Fabrication",
        "destination_country": "Taiwan",
        "product_name": "Semiconductor Chips",
        "product_category": "Electronics",
        "hs_code_suggestion": "854231",
        "quantity": 50000,
        "unit": "units",
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
    
    print("Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_db())
