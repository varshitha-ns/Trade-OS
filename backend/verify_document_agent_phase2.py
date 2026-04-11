import asyncio
from dotenv import load_dotenv

async def test_auto_document_workflow():
    load_dotenv("backend/.env")
    from app.database import connect_to_mongo, close_mongo_connection
    await connect_to_mongo()
    
    from app.agents.document_agent import document_agent
    
    trade_data = {
        "trade_id": "TRD-1002",
        "supplier_id": "SUP_3BC94488",  # Realistic supplier we generated (Cotton Shirts)
        "buyer_id": "BUY_GERMANY",
        "exporter_country": "Brazil",
        "importer_country": "USA",
        "hs_code": "620520",
        "product_category": "Textiles",
        "product_name": "Cotton Shirts",
        "quantity": 10000,
        "price": 5.5,
        "logistics_mode": "Air Freight",
        "delivery_terms": "FOB",
        "payment_terms": "Advance"
    }

    print("\nStarting Document Agent Workflow Execution test...\n")
    package = await document_agent.execute_autonomous_workflow(trade_data)
    
    print(f"Final Trade Package Status: {package.status}")
    print(f"Documents Bundled: {len(package.documents)}")
    for doc in package.documents:
        print(f"  - {doc.document_type.value}: {doc.metadata.get('title', '')}")
        
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_auto_document_workflow())
