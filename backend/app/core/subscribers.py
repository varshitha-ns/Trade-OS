import asyncio
from app.core.events import event_bus
from app.agents.buyer_matchmaker_agent import buyer_matchmaker_agent

async def startup_event_subscriptions():
    """
    Registers all Continuous Intelligence subscriptions on boot.
    """
    print("📡 [System] Initializing Event-Driven Subscriptions...")
    
    # When Importer creates a request, matchmaker automatically runs.
    event_bus.subscribe("RFQ_CREATED", buyer_matchmaker_agent._on_rfq_created)
