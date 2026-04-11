from app.agents.document_agent import document_agent

trade_data = {
    "trade_id": "TRD-1001",
    "supplier_id": "SUP0123",
    "buyer_id": "BUY_XYZ",
    "exporter_country": "Vietnam",
    "importer_country": "Germany",
    "hs_code": "090111",
    "product_category": "Agriculture",
    "product_name": "Coffee Beans",
    "quantity": 50000,
    "price": 4.8,
    "logistics_mode": "Sea",
    "delivery_terms": "CIF",
    "payment_terms": "LC"
}

context = document_agent.identify_trade_context(trade_data)
documents = document_agent.determine_required_documents(context)

print(f"--- Required Documents for {context.product_name} ({context.exporter_country} -> {context.importer_country}) ---")
print(f"Logistics: {context.logistics_mode}, Payment: {context.payment_terms}, Delivery: {context.delivery_terms}\n")
for idx, doc in enumerate(documents, 1):
    print(f"{idx}. {doc.document_type.value}")
    print(f"   Reason: {doc.description}")
