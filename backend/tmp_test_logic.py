import asyncio
from app.agents.buyer_matchmaker_agent import buyer_matchmaker_agent
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    catalog = {
        "product_name": "Cotton",
        "hs_code": "520100",
        "quantity": 5,
        "unit": "tons",
        "category": "Agriculture"
    }
    
    # Wait, the buyer_matchmaker_agent needs the DB initialized. 
    # Usually fast api lifecycle does this. 
    import app.database as db
    db.mongodb.client = AsyncIOMotorClient("mongodb://localhost:27017")
    db.mongodb.database = db.mongodb.client.tradeos_db
    
    res = await buyer_matchmaker_agent.find_buyers_for_catalog(catalog)
    print("MATCHES:", len(res["leads"]))
    for lead in res["leads"]:
        print(f"Company: {lead['company_name']}, Score: {lead['match_score']}, Explanation: {lead['match_explanation']}")

asyncio.run(test())
