import asyncio
from dotenv import load_dotenv
import os

async def test_auto_matchmaker():
    load_dotenv("backend/.env")
    from app.database import connect_to_mongo, close_mongo_connection
    await connect_to_mongo()
    
    from app.services.autonomous_matchmaker import autonomous_matchmaker_service
    
    request = {
        "product_name": "Cotton Shirts",
        "hs_code": "620520",
        "quantity": 10000,
        "destination_country": "USA"
    }
    
    result = await autonomous_matchmaker_service.recommend_suppliers(request)
    
    print("\n--- Autonomous Matchmaker Result ---")
    print(f"Success: {result['success']}")
    print(f"Message: {result['message']}")
    print(f"Filter Report: {result['filter_report']}")
    print(f"\nRecommendations found: {len(result['recommendations'])}")
    
    for i, r in enumerate(result['recommendations'][:5]):
        print(f"\n{i+1}. {r['company_name']} ({r['country']}) - Score: {r['final_score']}")
        print(f"   Supplier ID: {r['supplier_id']}, HS Code: {r['hs_code']}")
        print(f"   Explanation: {r['explanation']}")

if __name__ == "__main__":
    asyncio.run(test_auto_matchmaker())
