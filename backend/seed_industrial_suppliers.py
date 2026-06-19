import asyncio
import random
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

industrial_commodities = [
    {"name": "Semiconductors", "category": "Electronics", "hs": 854140},
    {"name": "Aluminum Ignots", "category": "Metals", "hs": 760110},
    {"name": "Copper Cathodes", "category": "Metals", "hs": 740311},
    {"name": "Lithium Ore", "category": "Minerals", "hs": 261590},
    {"name": "Urea Fertilizer", "category": "Chemicals", "hs": 310210},
    {"name": "Robusta Coffee", "category": "Agriculture", "hs": 90111},
    {"name": "Raw Cotton", "category": "Agriculture", "hs": 520100},
    {"name": "Organic Turmeric", "category": "Agriculture", "hs": 91030}
]

countries = ["India", "Vietnam", "Taiwan", "Germany", "USA", "Brazil", "Chile", "Australia"]

async def seed_industrial():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tradeos_db"]
    collection = db["suppliers_master"]
    
    new_docs = []
    
    # Generate 150 industrial suppliers
    for _ in range(150):
        comm = random.choice(industrial_commodities)
        country = random.choice(countries)
        
        doc = {
            'supplier_id': f"SUP_{str(uuid.uuid4())[:8].upper()}",
            'company_name': f"{country} {comm['name']} Corp",
            'country': country,
            'commodity_name': comm['name'],
            'category': comm['category'],
            'hs_code': comm['hs'],
            'avg_lead_time_days': random.randint(7, 45),
            'avg_unit_price_usd': round(random.uniform(10.0, 5000.0), 2),
            'buyer_rating': round(random.uniform(3.5, 5.0), 1),
            'certification_fda': 'No',
            'certification_haccp': 'No',
            'certification_iso': 'Yes',
            'company_size': random.choice(['SME', 'Large', 'Enterprise']),
            'currency_volatility': round(random.uniform(0.5, 5.0), 2),
            'digital_maturity_score': random.randint(3, 9),
            'dispute_rate_percent': round(random.uniform(0.1, 3.0), 2),
            'esg_score': random.randint(3, 9),
            'estimated_capacity': round(random.uniform(1000, 50000), 2),
            'exchange_rate_usd': round(random.uniform(1.0, 100.0), 2),
            'export_growth_rate': round(random.uniform(-5.0, 25.0), 2),
            'flexibility_score': random.randint(5, 10),
            'last_updated_year': 2024,
            'logistics_mode': random.choice(['Sea Freight', 'Air Freight', 'Multi-modal']),
            'main_import_partner': random.choice(["USA", "Germany", "UK", "China", "Japan"]),
            'min_order_quantity': random.randint(10, 1000),
            'on_time_delivery_rate_percent': round(random.uniform(85.0, 99.0), 2),
            'payment_terms': random.choice(['LC', 'TT', 'Net 30']),
            'production_capacity_monthly': random.randint(5000, 500000),
            'reliability_score': round(random.uniform(0.8, 0.99), 2),
            'risk_score': round(random.uniform(1.0, 5.0), 2),
            'tariff_rate': round(random.uniform(0.0, 15.0), 2),
            'total_export_quantity': random.randint(10000, 1000000),
            'total_export_value': random.randint(100000, 10000000),
            'trade_restriction_flag': 0,
            'years_in_business': random.randint(2, 50)
        }
        new_docs.append(doc)
        
    result = await collection.insert_many(new_docs)
    print(f"Successfully injected {len(result.inserted_ids)} industrial suppliers into MongoDB.")

if __name__ == "__main__":
    asyncio.run(seed_industrial())
