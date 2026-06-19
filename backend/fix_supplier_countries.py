import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient

async def update_countries():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tradeos_db"]
    collection = db["suppliers_master"]
    
    # Real-world mapping for better AI OS feel
    country_mapping = {
        "Aluminum Ignots": ["China", "Canada", "Russia", "UAE", "Bahrain"],
        "Semiconductors": ["Taiwan", "South Korea", "Japan", "USA", "Netherlands"],
        "Copper Cathodes": ["Chile", "Peru", "Zambia", "DRC", "Australia"],
        "Lithium Ore": ["Australia", "Chile", "Argentina", "Bolivia"],
        "Urea Fertilizer": ["Russia", "Qatar", "Saudi Arabia", "Egypt"],
        "Robusta Coffee": ["Vietnam", "Brazil", "Indonesia", "Uganda"],
        "Raw Cotton": ["USA", "Brazil", "Australia", "China"],
        "Monocrystalline Solar Panels": ["China", "Vietnam", "Malaysia"],
        "Wind Turbine Blades": ["Denmark", "Germany", "Spain"],
        "Motherboards": ["Taiwan", "China", "Vietnam"]
    }
    
    updated_count = 0
    
    for commodity, countries in country_mapping.items():
        # Find all suppliers for this commodity
        cursor = collection.find({"commodity_name": commodity})
        async for supplier in cursor:
            new_country = random.choice(countries)
            # Update the country and the company name to reflect the new country
            new_company_name = f"{new_country} {commodity} Corp"
            
            await collection.update_one(
                {"_id": supplier["_id"]},
                {"$set": {
                    "country": new_country,
                    "company_name": new_company_name
                }}
            )
            updated_count += 1
            
    print(f"Successfully updated country origins for {updated_count} global suppliers.")

if __name__ == "__main__":
    asyncio.run(update_countries())
