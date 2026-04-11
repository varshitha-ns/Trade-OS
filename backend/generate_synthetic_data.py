import pandas as pd
import numpy as np
import random
import uuid
import os

# Set seed for reproducibility
np.random.seed(42)
random.seed(42)

# File paths
csv_file_path = "D:\\Tradeos-platform\\tradeos_master_ai_dataset_1000.csv"

# Columns from the existing dataset
columns = [
    'supplier_id', 'company_name', 'country', 'hs_code', 'commodity_name', 'category', 
    'total_export_value', 'total_export_quantity', 'export_growth_rate', 'main_import_partner', 
    'tariff_rate', 'trade_restriction_flag', 'exchange_rate_usd', 'currency_volatility', 
    'estimated_capacity', 'reliability_score', 'risk_score', 'last_updated_year', 'company_size', 
    'years_in_business', 'min_order_quantity', 'avg_lead_time_days', 'production_capacity_monthly', 
    'certification_iso', 'certification_haccp', 'certification_fda', 'payment_terms', 
    'digital_maturity_score', 'esg_score', 'buyer_rating', 'dispute_rate_percent', 
    'on_time_delivery_rate_percent', 'logistics_mode', 'avg_unit_price_usd', 'flexibility_score'
]

# SME Commodities to add
commodities_to_add = [
    # Textiles & Clothing
    {"name": "Cotton Shirts", "hs_code": "620520", "category": "Textiles"},
    {"name": "Denim Jeans", "hs_code": "620342", "category": "Textiles"},
    {"name": "Silk Scarves", "hs_code": "621410", "category": "Textiles"},
    {"name": "Wool Sweaters", "hs_code": "611011", "category": "Textiles"},
    # Handicrafts & Artisan
    {"name": "Ceramic Mugs", "hs_code": "691200", "category": "Handicrafts"},
    {"name": "Wooden Furniture", "hs_code": "940360", "category": "Handicrafts"},
    {"name": "Handwoven Baskets", "hs_code": "460211", "category": "Handicrafts"},
    {"name": "Decorative Candles", "hs_code": "340600", "category": "Handicrafts"},
    # Spices & Agriculture
    {"name": "Coffee Beans", "hs_code": "090111", "category": "Agriculture"},
    {"name": "Black Tea", "hs_code": "090230", "category": "Agriculture"},
    {"name": "Turmeric Powder", "hs_code": "091030", "category": "Spices"},
    {"name": "Black Pepper", "hs_code": "090411", "category": "Spices"},
    {"name": "Cinnamon", "hs_code": "090611", "category": "Spices"},
    {"name": "Cardamom", "hs_code": "090831", "category": "Spices"},
    # Processed Foods
    {"name": "Natural Honey", "hs_code": "040900", "category": "Processed Foods"},
    {"name": "Dried Mangoes", "hs_code": "080450", "category": "Processed Foods"},
    {"name": "Cashew Nuts", "hs_code": "080132", "category": "Processed Foods"},
    {"name": "Fruit Jam", "hs_code": "200799", "category": "Processed Foods"},
    # Leather Goods
    {"name": "Leather Shoes", "hs_code": "640351", "category": "Leather"},
    {"name": "Leather Handbags", "hs_code": "420221", "category": "Leather"},
    {"name": "Leather Belts", "hs_code": "420330", "category": "Leather"},
    # Electronics Accessories
    {"name": "Phone Cases", "hs_code": "392690", "category": "Electronics"},
    {"name": "USB Cables", "hs_code": "854442", "category": "Electronics"},
    {"name": "Power Banks", "hs_code": "850760", "category": "Electronics"}
]

countries = ["India", "Vietnam", "Brazil", "Mexico", "Egypt", "Spain", "Netherlands"]
import_partners = ["USA", "Germany", "UK", "Canada", "UAE", "France", "Japan"]
certifications = ["Yes", "No"]
company_sizes = ["Small", "Medium", "Large", "Enterprise"]
payment_terms = ["LC", "TT", "Net 30", "Advance"]
logistics_modes = ["Sea Freight", "Air Freight", "Multi-modal", "Land"]

new_rows = []
for _ in range(500): # Generate 500 records for the new SME commodities
    commodity = random.choice(commodities_to_add)
    country = random.choice(countries)
    
    new_row = {
        'supplier_id': f"SUP_{str(uuid.uuid4())[:8].upper()}",
        'company_name': f"{country} {commodity['name']} Exports Ltd.",
        'country': country,
        'hs_code': commodity['hs_code'] + str(random.randint(10, 99)), # E.g., 070210
        'commodity_name': commodity['name'],
        'category': commodity['category'],
        'total_export_value': round(random.uniform(500000, 5000000), 2),
        'total_export_quantity': random.randint(100000, 1000000),
        'export_growth_rate': round(random.uniform(-5.0, 25.0), 2),
        'main_import_partner': random.choice(import_partners),
        'tariff_rate': round(random.uniform(0.0, 15.0), 2),
        'trade_restriction_flag': random.choices(['None', 'Low', 'High'], weights=[0.8, 0.15, 0.05])[0],
        'exchange_rate_usd': round(random.uniform(0.5, 150.0), 2),
        'currency_volatility': round(random.uniform(0.01, 0.1), 4),
        'estimated_capacity': random.randint(50000, 500000),
        'reliability_score': round(random.uniform(0.7, 0.99), 2), # Good reliability
        'risk_score': round(random.uniform(1.0, 5.0), 2), # Low to medium risk
        'last_updated_year': 2024,
        'company_size': random.choice(company_sizes),
        'years_in_business': random.randint(2, 50),
        'min_order_quantity': random.randint(1000, 10000),
        'avg_lead_time_days': random.randint(7, 45),
        'production_capacity_monthly': random.randint(50000, 200000),
        'certification_iso': random.choices(certifications, weights=[0.7, 0.3])[0],
        'certification_haccp': random.choices(certifications, weights=[0.8, 0.2])[0],
        'certification_fda': random.choices(certifications, weights=[0.5, 0.5])[0],
        'payment_terms': random.choice(payment_terms),
        'digital_maturity_score': round(random.uniform(3.0, 9.0), 1),
        'esg_score': round(random.uniform(4.0, 9.0), 1),
        'buyer_rating': round(random.uniform(3.5, 5.0), 1),
        'dispute_rate_percent': round(random.uniform(0.1, 5.0), 2),
        'on_time_delivery_rate_percent': round(random.uniform(85.0, 99.9), 1),
        'logistics_mode': random.choice(logistics_modes),
        'avg_unit_price_usd': round(random.uniform(0.5, 5.0), 2),
        'flexibility_score': round(random.uniform(5.0, 10.0), 1)
    }
    new_rows.append(new_row)

# Load existing df, append and save
print(f"Loading {csv_file_path}...")
df_existing = pd.read_csv(csv_file_path)
df_new = pd.DataFrame(new_rows)

print(f"Dataset has {len(df_existing)} rows. Appending {len(df_new)} new synthetic rows.")
df_combined = pd.concat([df_existing, df_new], ignore_index=True)

df_combined.to_csv(csv_file_path, index=False)
print(f"Successfully saved combined dataset with {len(df_combined)} rows to {csv_file_path}.")

