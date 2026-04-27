import asyncio
from app.core.events import event_bus
from app.agents.buyer_matchmaker_agent import buyer_matchmaker_agent
from app.agents.escrow_agent import EscrowAgent
from app.core.trade_state import TradeState

# Singleton escrow agent
_escrow_agent = EscrowAgent()

# ─────────────────────────────────────────────────────────────
# AUTONOMOUS HANDLER FUNCTIONS
# These are the "downstream brains" that fire automatically
# when an upstream agent finishes its job.
# ─────────────────────────────────────────────────────────────

async def handle_risk_assessed(data: dict):
    """
    Triggered automatically when RiskAgent completes.
    If trade is CLEARED → autonomously trigger DocumentAgent.
    If risk is HIGH → autonomously abort and log.
    """
    trade_id = data.get("trade_id", "UNKNOWN")
    risk_status = data.get("overall_risk", "UNKNOWN")
    
    print(f"\n🤖 [Autonomous Pipeline] RISK_ASSESSED received for {trade_id}")
    print(f"   Risk Status: {risk_status}")
    
    if risk_status == "HIGH":
        print(f"   ❌ [Pipeline] Trade {trade_id} BLOCKED by RiskAgent. No further autonomous action.")
        return

    print(f"   ✅ [Pipeline] Risk cleared. Autonomously signaling DocumentAgent readiness...")
    await event_bus.emit("RISK_CLEARED", {
        "trade_id": trade_id,
        "risk_score": data.get("overall_score"),
        "proceed": True
    })


async def handle_documents_ready(data: dict):
    """
    Triggered when DocumentAgent finishes generating the trade package.
    Autonomously tells EscrowAgent to lock funds.
    """
    trade_id = data.get("trade_id", "UNKNOWN")
    print(f"\n🤖 [Autonomous Pipeline] DOCUMENTS_READY received for {trade_id}")
    print(f"   ✅ [Pipeline] Dispatching DOCUMENT_VERIFIED to EscrowAgent...")
    
    await _escrow_agent.handle_document_verified({
        "trade_id": trade_id,
        "event_id": f"DV-{trade_id}",
        "contract_address": data.get("contract_address", "0x0000000000000000000000000000000000000000")
    })


async def handle_shipment_booked(data: dict):
    """
    Triggered when LogisticsAgent finalises and books a shipment.
    Autonomously notifies EscrowAgent to release dispatch milestone (50%).
    """
    trade_id = data.get("trade_id", "UNKNOWN")
    tracking_num = data.get("tracking_number", "TRK-UNKNOWN")
    origin = data.get("origin", "Origin Port")
    
    print(f"\n🤖 [Autonomous Pipeline] SHIPMENT_BOOKED received for {trade_id}")
    print(f"   Tracking: {tracking_num} | Origin: {origin}")
    print(f"   ✅ [Pipeline] Dispatching SHIPMENT_DISPATCHED to EscrowAgent...")
    
    await _escrow_agent.handle_shipment_dispatched({
        "trade_id": trade_id,
        "event_id": f"SD-{trade_id}",
        "tracking_num": tracking_num,
        "origin": origin,
        "contract_address": data.get("contract_address", "0x0000000000000000000000000000000000000000")
    })


async def handle_rfq_created_matchmaker(data: dict):
    """
    Existing handler: When Importer creates RFQ, matchmaker auto-runs.
    """
    await buyer_matchmaker_agent._on_rfq_created(data)


# ─────────────────────────────────────────────────────────────
# STARTUP REGISTRATION
# Called once at server boot. All subscriptions are registered here.
# ─────────────────────────────────────────────────────────────
async def startup_event_subscriptions():
    """
    Registers all Continuous Intelligence subscriptions on boot.
    These run automatically in the background — no human triggers needed.
    """
    print("📡 [TradeOS] Initializing Autonomous Multi-Agent Event Pipeline...")
    
    # Importer RFQ → MatchmakerAgent auto-runs
    event_bus.subscribe("RFQ_CREATED", handle_rfq_created_matchmaker)
    
    # RiskAgent finishes → Pipeline decides to proceed or block
    event_bus.subscribe("RISK_ASSESSED", handle_risk_assessed)
    
    # DocumentAgent finishes → EscrowAgent locks funds (Milestone 1)
    event_bus.subscribe("DOCUMENTS_READY", handle_documents_ready)
    
    # LogisticsAgent books shipment → EscrowAgent releases 50% (Milestone 2)
    event_bus.subscribe("SHIPMENT_BOOKED", handle_shipment_booked)

    print("✅ [TradeOS] Autonomous Pipeline Online. 4 agent subscriptions active.")
    print("   Listening: RFQ_CREATED | RISK_ASSESSED | DOCUMENTS_READY | SHIPMENT_BOOKED")
