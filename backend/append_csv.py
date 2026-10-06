import csv
import random
import uuid
import os

filepath = r"D:\Tradeos-platform - Copy\tradeos_master_ai_dataset_1000.csv"

commodities = [
    {"name": "Black Pepper", "hs": "090411", "category": "Spices"},
    {"name": "Organic Turmeric", "hs": "091030", "category": "Spices"},
    {"name": "Cinnamon", "hs": "090611", "category": "Spices"},
    {"name": "Cardamom", "hs": "090832", "category": "Spices"},
    {"name": "Cloves", "hs": "090710", "category": "Spices"},
    {"name": "Cumin", "hs": "090931", "category": "Spices"},
    {"name": "Coriander", "hs": "090921", "category": "Spices"},
    {"name": "Nutmeg", "hs": "090811", "category": "Spices"},
    {"name": "Robusta Coffee", "hs": "090111", "category": "Agriculture"},
    {"name": "Raw Cotton", "hs": "520100", "category": "Agriculture"},
    {"name": "Urea Fertilizer", "hs": "310210", "category": "Chemicals"},
    {"name": "Milled Rice", "hs": "100630", "category": "Agriculture"},
    {"name": "Bulk Palm Oil", "hs": "151110", "category": "Agriculture"},
    {"name": "Raw Sugar", "hs": "170114", "category": "Agriculture"},
    {"name": "Wheat", "hs": "100199", "category": "Grains"}
]

countries = ["India", "Vietnam", "Taiwan", "Germany", "USA", "Brazil", "Chile", "Australia", "Mexico", "China", "Italy", "Indonesia", "Ethiopia"]

def gen_row():
    comm = random.choice(commodities)
    country = random.choice(countries)
    return [
        f"SUP_{str(uuid.uuid4())[:8].upper()}", # supplier_id
        f"{country} {comm['name']} Traders", # company_name
        country, # country
        comm['hs'], # hs_code
        comm['name'], # commodity_name
        comm['category'], # category
        round(random.uniform(500000, 10000000), 2), # total_export_value
        round(random.uniform(5000, 500000), 2), # total_export_quantity
        round(random.uniform(-5.0, 30.0), 2), # export_growth_rate
        random.choice(["USA", "Germany", "UK", "China", "Japan", "India", "UAE", "France", "Brazil", "Mexico"]), # main_import_partner
        round(random.uniform(0.0, 15.0), 2), # tariff_rate
        random.choice([0, 1]), # trade_restriction_flag
        random.choice([1.0, 7.0, 83.0, 35.0, 0.9, 15500.0, 850.0, 56.0, 5.0, 24000.0]), # exchange_rate_usd
        round(random.uniform(0.1, 10.0), 2), # currency_volatility
        round(random.uniform(50, 1000), 2), # estimated_capacity
        round(random.uniform(0.7, 0.99), 2), # reliability_score
        round(random.uniform(1.0, 10.0), 2), # risk_score
        2023, # last_updated_year
        random.choice(['SME', 'Large', 'Enterprise']), # company_size
        random.randint(2, 50), # years_in_business
        random.randint(500, 50000), # min_order_quantity
        random.randint(10, 60), # avg_lead_time_days
        random.randint(20000, 200000), # production_capacity_monthly
        random.choice(['Yes', 'No']), # certification_iso
        random.choice(['Yes', 'No']) if comm['category'] in ['Agriculture', 'Spices'] else 'No', # certification_haccp
        random.choice(['Yes', 'No']) if comm['category'] in ['Agriculture', 'Spices'] else 'No', # certification_fda
        random.choice(['LC', 'TT', 'Advance', 'Net 30']), # payment_terms
        round(random.uniform(4.0, 10.0), 1), # digital_maturity_score
        round(random.uniform(4.0, 10.0), 1), # esg_score
        round(random.uniform(3.0, 5.0), 2), # buyer_rating
        round(random.uniform(0.1, 8.0), 2), # dispute_rate_percent
        round(random.uniform(80.0, 99.0), 2), # on_time_delivery_rate_percent
        random.choice(['Sea', 'Air', 'Land']), # logistics_mode
        round(random.uniform(5.0, 500.0), 2), # avg_unit_price_usd
        round(random.uniform(4.0, 10.0), 1) # flexibility_score
    ]

with open(filepath, "a", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    for _ in range(500):
        writer.writerow(gen_row())

print("Added 500 records of spices and essentials to the CSV.")
