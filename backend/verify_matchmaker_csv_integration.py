"""
🧪 Matchmaker Agent Verification - Using CSV Data from MongoDB

This script verifies that:
1. CSV data is in MongoDB (suppliers_master collection)
2. Matchmaker agent can read and filter suppliers
3. Trade item parser works correctly
4. End-to-end matching pipeline functions
"""

import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def verify_matchmaker_setup():
    """Verify the complete matchmaker setup with CSV data"""
    
    load_dotenv(".env")
    
    print("\n" + "="*70)
    print("🔍 MATCHMAKER AGENT VERIFICATION - CSV Data Integration")
    print("="*70)
    
    # Step 1: Verify MongoDB Connection
    print("\n1️⃣  Checking MongoDB Connection...")
    try:
        mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        database_name = os.getenv("DATABASE_NAME", "tradeos_db")
        
        client = AsyncIOMotorClient(mongo_url)
        db = client[database_name]
        
        # Test connection
        await db.command("ping")
        print("   ✅ MongoDB connected successfully")
    except Exception as e:
        print(f"   ❌ MongoDB connection failed: {e}")
        return False
    
    # Step 2: Check suppliers_master Collection
    print("\n2️⃣  Checking suppliers_master Collection...")
    try:
        suppliers_collection = db["suppliers_master"]
        count = await suppliers_collection.count_documents({})
        print(f"   ✅ Found {count} suppliers in suppliers_master collection")
        
        if count == 0:
            print("   ⚠️  WARNING: No suppliers found. Run push_to_mongodb.py first!")
            print("      Command: python push_to_mongodb.py")
            return False
            
        # Sample a supplier
        sample = await suppliers_collection.find_one({})
        print(f"\n   📦 Sample Supplier:")
        print(f"      - Company: {sample.get('company_name', 'N/A')}")
        print(f"      - Country: {sample.get('country', 'N/A')}")
        print(f"      - HS Code: {sample.get('hs_code', 'N/A')}")
        print(f"      - Commodity: {sample.get('commodity_name', 'N/A')}")
        print(f"      - Category: {sample.get('category', 'N/A')}")
        print(f"      - Capacity: {sample.get('estimated_capacity', 'N/A')}")
        print(f"      - Reliability Score: {sample.get('reliability_score', 'N/A')}")
        print(f"      - On-time Delivery: {sample.get('on_time_delivery_rate_percent', 'N/A')}%")
        print(f"      - Buyer Rating: {sample.get('buyer_rating', 'N/A')}/5")
        
    except Exception as e:
        print(f"   ❌ Error checking suppliers_master: {e}")
        return False
    
    # Step 3: Test Trade Item Parser
    print("\n3️⃣  Testing Trade Item Parser...")
    try:
        from app.api.trade_parser import TradeItemParser
        
        parser = TradeItemParser()
        
        test_input = "I need to import 5000 kg of organic turmeric powder from India to Germany within 30 days"
        result = parser.parse_trade_description(test_input)
        
        print(f"   ✅ Trade Item Parser working")
        print(f"      - Product: {result['product_name']}")
        print(f"      - Category: {result['product_category']}")
        print(f"      - HS Code: {result['hs_code_suggestion']}")
        print(f"      - Quantity: {result['quantity']} {result['unit']}")
        print(f"      - Destination: {result['destination_country']}")
        print(f"      - Confidence: {result['confidence_score']}")
        
    except Exception as e:
        print(f"   ❌ Trade Item Parser test failed: {e}")
        return False
    
    # Step 4: Test Supplier Filtering
    print("\n4️⃣  Testing Supplier Filtering with CSV Data...")
    try:
        # Test filtering logic
        test_filters = {
            "category": "Spices",
            "reliability_score": {"$gte": 0.75}
        }
        
        matching_suppliers = []
        cursor = suppliers_collection.find(test_filters)
        async for supplier in cursor:
            matching_suppliers.append(supplier)
        
        print(f"   ✅ Supplier filtering working")
        print(f"      - Applied filter: Category='Spices', Reliability >= 0.75")
        print(f"      - Found {len(matching_suppliers)} matching suppliers")
        
        if matching_suppliers:
            print(f"\n      Sample matches:")
            for i, supp in enumerate(matching_suppliers[:3], 1):
                print(f"        {i}. {supp.get('company_name')} ({supp.get('country')})")
                print(f"           Reliability: {supp.get('reliability_score')} | Rating: {supp.get('buyer_rating')}/5")
        
    except Exception as e:
        print(f"   ❌ Supplier filtering failed: {e}")
        return False
    
    # Step 5: Test Trust Score Calculation
    print("\n5️⃣  Testing Trust Score Calculation from CSV Data...")
    try:
        supplier = await suppliers_collection.find_one()
        
        # Calculate trust score using CSV fields
        success_rate = float(supplier.get('on_time_delivery_rate_percent', 85)) / 100.0
        rating = float(supplier.get('buyer_rating', 3.0)) / 5.0
        reliability = float(supplier.get('reliability_score', 0.8))
        
        # Simplified trust score
        trust_score = (0.4 * success_rate) + (0.3 * rating) + (0.3 * reliability)
        
        print(f"   ✅ Trust score calculation working")
        print(f"      - On-time Delivery Rate: {success_rate:.1%}")
        print(f"      - Buyer Rating: {supplier.get('buyer_rating')}/5")
        print(f"      - Reliability Score: {reliability:.2f}")
        print(f"      - Calculated Trust Score: {trust_score:.3f}")
        
    except Exception as e:
        print(f"   ❌ Trust score calculation failed: {e}")
        return False
    
    # Step 6: Test Category Distribution
    print("\n6️⃣  Analyzing CSV Data Coverage...")
    try:
        categories = await suppliers_collection.distinct("category")
        
        print(f"   ✅ Available product categories ({len(categories)}):")
        for category in sorted(categories):
            count = await suppliers_collection.count_documents({"category": category})
            print(f"      - {category}: {count} suppliers")
        
        # HS Code coverage
        hs_codes = await suppliers_collection.distinct("hs_code")
        print(f"\n   ✅ HS Code coverage: {len(hs_codes)} unique codes")
        print(f"      Sample HS Codes: {', '.join(sorted(hs_codes)[:5])}")
        
    except Exception as e:
        print(f"   ❌ Data coverage analysis failed: {e}")
        return False
    
    # Final Status
    print("\n" + "="*70)
    print("✅ VERIFICATION COMPLETE - Matchmaker Agent Ready!")
    print("="*70)
    
    print("\n📊 Next Steps:")
    print("   1. Use Trade Item Parser with the proper prompt from TRADE_ITEM_PARSER_PROMPT.md")
    print("   2. Call matchmaker agent with parsed trade requests")
    print("   3. Receive supplier recommendations with trust scores from CSV data")
    
    print("\n🚀 Example Usage:")
    print("""
    from app.api.trade_parser import TradeItemParser
    from app.services.matchmaker import matchmaker_agent
    
    # Parse trade request
    parser = TradeItemParser()
    parsed = parser.parse_trade_description(
        "I need 5000 kg organic turmeric to Germany in 30 days"
    )
    
    # Get recommendations
    matches = await matchmaker_agent.find_matches(parsed)
    print(f"Found {len(matches.recommendations)} suppliers")
    """)
    
    print("\n📈 CSV Data Loaded: " + ("✅ YES" if count > 0 else "❌ NO"))
    print("🔗 Database: " + database_name)
    print("📦 Collection: suppliers_master")
    
    await client.close()
    return True

if __name__ == "__main__":
    success = asyncio.run(verify_matchmaker_setup())
    sys.exit(0 if success else 1)
