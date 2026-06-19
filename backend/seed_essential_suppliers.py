import asyncio
import random
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

essential_commodities = [
    # Leather & Textiles
    {"name": "Animal Leather Bags", "category": "Leather", "hs": 420221},
    {"name": "Vegan Plant Leather Bags", "category": "Textiles", "hs": 420222},
    {"name": "Organic Hemp Fabric", "category": "Textiles", "hs": 530820},
    {"name": "Industrial Nylon Yarn", "category": "Textiles", "hs": 540211},
    # Energy & Infrastructure
    {"name": "Monocrystalline Solar Panels", "category": "Energy", "hs": 854143},
    {"name": "Wind Turbine Blades", "category": "Energy", "hs": 841290},
    {"name": "Lithium-Ion Batteries", "category": "Energy", "hs": 850760},
    {"name": "Steel Pipes", "category": "Metals", "hs": 730419},
    {"name": "Copper Wire", "category": "Metals", "hs": 740811},
    # Pharmaceuticals & Medical
    {"name": "Surgical Masks", "category": "Medical", "hs": 630790},
    {"name": "Amoxicillin Antibiotics", "category": "Pharmaceuticals", "hs": 300410},
    {"name": "Aspirin Bulk Powder", "category": "Pharmaceuticals", "hs": 291822},
    {"name": "Nitrile Gloves", "category": "Medical", "hs": 401511},
    # Agriculture & Essentials
    {"name": "Organic Quinoa", "category": "Agriculture", "hs": 100850},
    {"name": "Essential Lavender Oil", "category": "Agriculture", "hs": 330129},
    {"name": "Bulk Palm Oil", "category": "Agriculture", "hs": 151110},
    {"name": "Milled Rice", "category": "Agriculture", "hs": 100630},
    {"name": "Raw Sugar", "category": "Agriculture", "hs": 170114},
    # Automotive & Machinery
    {"name": "Automotive Ball Bearings", "category": "Machinery", "hs": 848210},
    {"name": "Electric Motors", "category": "Machinery", "hs": 850110},
    {"name": "Hydraulic Pumps", "category": "Machinery", "hs": 841360},
    # Electronics
    {"name": "Motherboards", "category": "Electronics", "hs": 854370},
    {"name": "Fiber Optic Cables", "category": "Electronics", "hs": 854470},
    {"name": "LED Displays", "category": "Electronics", "hs": 852859},
    # Chemicals
    {"name": "Industrial Solvents", "category": "Chemicals", "hs": 381400},
    {"name": "Polyethylene Granules", "category": "Chemicals", "hs": 390120},
    {"name": "Sulfuric Acid", "category": "Chemicals", "hs": 280700},
    {"name": "Urea Fertilizer", "category": "Chemicals", "hs": 310210},
    # Agriculture New
    {"name": "Black Pepper", "category": "Agriculture", "hs": 90411},
    {"name": "Organic Turmeric", "category": "Agriculture", "hs": 91030},
    {"name": "Robusta Coffee", "category": "Agriculture", "hs": 90111},
    {"name": "Raw Cotton", "category": "Agriculture", "hs": 520100},
    # Metals New
    {"name": "Lithium Ore", "category": "Metals", "hs": 261590}
]

countries = ["India", "Vietnam", "Taiwan", "Germany", "USA", "Brazil", "Chile", "Australia", "Mexico", "China", "Italy"]

async def seed_essentials():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["tradeos_db"]
    collection = db["suppliers_master"]
    
    new_docs = []
    
    # Generate 500 essential suppliers
    for _ in range(500):
        comm = random.choice(essential_commodities)
        country = random.choice(countries)
        
        doc = {
            'supplier_id': f"SUP_{str(uuid.uuid4())[:8].upper()}",
            'company_name': f"{country} {comm['name']} Global",
            'country': country,
            'commodity_name': comm['name'],
            'category': comm['category'],
            'hs_code': comm['hs'],
            'avg_lead_time_days': random.randint(5, 60),
            'avg_unit_price_usd': round(random.uniform(1.0, 1000.0), 2),
            'buyer_rating': round(random.uniform(3.0, 5.0), 1),
            'certification_fda': 'Yes' if comm['category'] in ['Medical', 'Pharmaceuticals', 'Agriculture'] else 'No',
            'certification_haccp': 'Yes' if comm['category'] in ['Agriculture'] else 'No',
            'certification_iso': 'Yes',
            'company_size': random.choice(['SME', 'Large', 'Enterprise']),
            'currency_volatility': round(random.uniform(0.1, 4.0), 2),
            'digital_maturity_score': random.randint(4, 10),
            'dispute_rate_percent': round(random.uniform(0.1, 4.0), 2),
            'esg_score': random.randint(4, 9),
            'estimated_capacity': round(random.uniform(1000, 100000), 2),
            'exchange_rate_usd': round(random.uniform(1.0, 150.0), 2),
            'export_growth_rate': round(random.uniform(-5.0, 30.0), 2),
            'flexibility_score': random.randint(4, 10),
            'last_updated_year': 2024,
            'logistics_mode': random.choice(['Sea Freight', 'Air Freight', 'Multi-modal', 'Land']),
            'main_import_partner': random.choice(["USA", "Germany", "UK", "China", "Japan", "India"]),
            'min_order_quantity': random.randint(50, 5000),
            'on_time_delivery_rate_percent': round(random.uniform(80.0, 99.5), 2),
            'payment_terms': random.choice(['LC', 'TT', 'Net 30', 'Net 60']),
            'production_capacity_monthly': random.randint(10000, 1000000),
            'reliability_score': round(random.uniform(0.75, 0.99), 2),
            'risk_score': round(random.uniform(1.0, 6.0), 2),
            'tariff_rate': round(random.uniform(0.0, 20.0), 2),
            'total_export_quantity': random.randint(50000, 5000000),
            'total_export_value': random.randint(500000, 50000000),
            'trade_restriction_flag': 0,
            'years_in_business': random.randint(5, 75)
        }
        new_docs.append(doc)
        
    result = await collection.insert_many(new_docs)
    print(f"Successfully injected {len(result.inserted_ids)} essential suppliers into MongoDB.")

if __name__ == "__main__":
    asyncio.run(seed_essentials())
