"""
Demo script to test the Matchmaker Agent
Run this script to see the matchmaker in action
"""

import asyncio
import uuid
from datetime import datetime
from app.services.matchmaker import matchmaker_agent
from app.models.matchmaker import TradeRequest

async def demo_matchmaker():
    """Demonstrate the Matchmaker Agent functionality"""
    
    print("🤖 TradeOS Matchmaker Agent Demo")
    print("=" * 50)
    
    # Create a sample trade request
    trade_request = TradeRequest(
        id=str(uuid.uuid4()),
        user_id="demo-user-123",
        product_name="Organic Coffee Beans",
        product_description="Premium organic Arabica coffee beans from high-altitude farms",
        hs_code="090111",
        quantity=1000,
        unit="kg",
        destination_country="US",
        origin_country="CO",
        timeline_days=30,
        budget_max=5000.0,
        budget_currency="USD",
        requirements=[
            "Organic certification required",
            "Fair trade preferred",
            "Direct shipping available"
        ],
        created_at=datetime.now()
    )
    
    print(f"📋 Trade Request Created:")
    print(f"   Product: {trade_request.product_name}")
    print(f"   Quantity: {trade_request.quantity} {trade_request.unit}")
    print(f"   Destination: {trade_request.destination_country}")
    print(f"   Budget: ${trade_request.budget_max} {trade_request.budget_currency}")
    print(f"   Requirements: {', '.join(trade_request.requirements)}")
    print()
    
    # Get match recommendations
    print("🔍 Finding matching partners...")
    match_result = await matchmaker_agent.find_matches(trade_request)
    
    print(f"✅ Found {len(match_result.recommendations)} recommendations")
    print(f"⏱️  Processing time: {match_result.processing_time_ms:.2f}ms")
    print(f"📊 Evaluated {match_result.total_candidates_evaluated} candidates")
    print()
    
    # Display top recommendations
    print("🏆 Top 3 Recommendations:")
    print("-" * 50)
    
    for i, rec in enumerate(match_result.recommendations[:3], 1):
        print(f"\n{i}. Partner ID: {rec.partner_id}")
        print(f"   Overall Score: {rec.overall_score:.3f}")
        print(f"   Trust Score: {rec.trust_score:.3f}")
        print(f"   Similarity Score: {rec.similarity_score:.3f}")
        print(f"   Risk Score: {rec.risk_score:.3f}")
        
        if rec.match_reasons:
            print(f"   ✅ Reasons: {', '.join(rec.match_reasons)}")
        
        if rec.concerns:
            print(f"   ⚠️  Concerns: {', '.join(rec.concerns)}")
        
        if rec.recommended_actions:
            print(f"   💡 Actions: {', '.join(rec.recommended_actions)}")
    
    print("\n" + "=" * 50)
    print("🎯 Demo completed successfully!")
    print("\n📚 Available API endpoints:")
    print("   POST /api/matchmaker/trade-request")
    print("   GET  /api/matchmaker/match-results/{request_id}")
    print("   GET  /api/matchmaker/partner-profile/{partner_id}")
    print("   GET  /api/matchmaker/evaluation/performance")
    print("   GET  /api/matchmaker/evaluation/health")
    print("   GET  /api/matchmaker/evaluation/daily-report")

if __name__ == "__main__":
    # Note: This demo requires MongoDB connection
    # Make sure your .env file has MONGODB_URL and DATABASE_NAME
    asyncio.run(demo_matchmaker())
