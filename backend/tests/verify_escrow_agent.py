import sys
import os
import asyncio
from pathlib import Path

# Load environment variables BEFORE importing agents
from dotenv import load_dotenv
dotenv_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=dotenv_path)

# Ensure paths correctly resolve 
sys.path.append(str(Path(__file__).parent.parent))

from app.core.event_broker import broker
from app.agents.escrow_agent import EscrowAgent
from app.db.sql_models import init_db

async def run_integration_pipeline():
    print("\n====== 🌐 TradeOS Autonomous Blockchain Escrow Pipeline Booting ======\n")
    
    # Init SQL Ledger
    await init_db()
    
    # Initialize the Autonomous Agent instance
    agent = EscrowAgent()
    
    # Start the daemon in the background to listen to AMQP topics
    daemon_task = asyncio.create_task(agent.run_listener_daemon())
    
    # Wait for Daemon to bind
    await asyncio.sleep(1)
    
    print("\n>>> Phase 1: Bootstrapping Deal (Importer initiates Escrow)...")
    await broker.publish("TRADE_CONFIRMED", {"trade_id": "TRD-ESCROWTEST-001", "event_id": "TC-001", "contract_address": "0x0000000000000000000000000000000000000000"})
    await asyncio.sleep(1)
    
    print("\n>>> Phase 2: Document Agent finalizes autonomous Proforma Invoice. Dispatching Event...")
    await broker.publish("DOCUMENT_VERIFIED", {
        "trade_id": "TRD-ESCROWTEST-001", 
        "event_id": "DV-001", 
        "action": "Bill of Lading Uploaded and Legally Verified",
        "contract_address": "0x0000000000000000000000000000000000000000"
    })
    await asyncio.sleep(8) # Allow LLM some time to compute payload safety
    
    print("\n>>> Phase 3: Logistics Agent tracks physical dispatch via aisstream...")
    await broker.publish("SHIPMENT_DISPATCHED", {
        "trade_id": "TRD-ESCROWTEST-001", 
        "event_id": "SD-001", 
        "tracking_num": "MAERSK-09SA9DJ",
        "origin": "Shanghai",
        "contract_address": "0x0000000000000000000000000000000000000000"
    })
    await asyncio.sleep(2) # Oracle is deterministic, fast response
    
    print("\n>>> Phase 4: Buyer receives goods physically. Gateway updates...")
    await broker.publish("DELIVERY_CONFIRMED", {
        "trade_id": "TRD-ESCROWTEST-001", 
        "event_id": "DC-001", 
        "tracking_num": "MAERSK-09SA9DJ",
        "dest": "Hamburg",
        "contract_address": "0x0000000000000000000000000000000000000000"
    })
    await asyncio.sleep(2)
    
    print("\n====== 🏁 Autonomous Pipeline Completed. EVM Transactions logged to Postgres. ======\n")
    daemon_task.cancel()

if __name__ == "__main__":
    asyncio.run(run_integration_pipeline())
