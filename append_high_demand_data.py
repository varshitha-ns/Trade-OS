import csv
import random
import uuid

# Configuration
input_file = 'tradeos_master_ai_dataset_1000.csv'
new_rows = []

# High-demand products from user request
wishlist = [
    {"commodity": "Copper Cathodes", "category": "Industrial Raw Materials", "hs": "740311", "countries": ["Chile", "Zambia", "Australia", "China"]},
    {"commodity": "Aluminum Ingots", "category": "Industrial Raw Materials", "hs": "760110", "countries": ["UAE", "Russia", "India", "Canada"]},
    {"commodity": "PVC Resins", "category": "Industrial Raw Materials", "hs": "390410", "countries": ["China", "USA", "Japan", "Taiwan"]},
    {"commodity": "Specialty Chemicals", "category": "Industrial Raw Materials", "hs": "382499", "countries": ["Germany", "USA", "Japan", "South Korea"]},
    {"commodity": "Polyester Yarn", "category": "Textile Inputs", "hs": "540233", "countries": ["China", "India", "Vietnam", "Indonesia"]},
    {"commodity": "Silk Fabrics", "category": "Textile Inputs", "hs": "500720", "countries": ["China", "India", "Italy", "Vietnam"]},
    {"commodity": "Denim Fabrics", "category": "Textile Inputs", "hs": "520942", "countries": ["China", "Turkey", "India", "Pakistan"]},
    {"commodity": "CNC Machine Tools", "category": "Machinery & Spares", "hs": "845811", "countries": ["Germany", "Japan", "Taiwan", "China"]},
    {"commodity": "Food Processing Equipment", "category": "Machinery & Spares", "hs": "843810", "countries": ["Italy", "Germany", "USA", "Netherlands"]},
    {"commodity": "Packaging Machines", "category": "Machinery & Spares", "hs": "842230", "countries": ["Germany", "Italy", "Japan", "China"]},
    {"commodity": "Semiconductors", "category": "Electronics Components", "hs": "854110", "countries": ["Taiwan", "South Korea", "USA", "Japan"]},
    {"commodity": "PCB Boards", "category": "Electronics Components", "hs": "853400", "countries": ["China", "Taiwan", "South Korea", "Vietnam"]},
    {"commodity": "LED Drivers", "category": "Electronics Components", "hs": "850440", "countries": ["China", "Germany", "USA", "Japan"]},
    {"commodity": "IoT Sensors", "category": "Electronics Components", "hs": "902610", "countries": ["USA", "Germany", "Japan", "South Korea"]},
    {"commodity": "Raw Cocoa Beans", "category": "Agro & Food Processing", "hs": "180100", "countries": ["Ivory Coast", "Ghana", "Indonesia", "Nigeria"]},
    {"commodity": "Food Additives", "category": "Agro & Food Processing", "hs": "210690", "countries": ["China", "USA", "Germany", "Japan"]},
    {"commodity": "Dry Fruits (Almonds)", "category": "Agro & Food Processing", "hs": "080211", "countries": ["USA", "Spain", "Australia", "Iran"]},
    {"commodity": "Active Pharma Ingredients (API)", "category": "Pharma & Chemicals", "hs": "293339", "countries": ["India", "China", "Germany", "USA"]},
    {"commodity": "Power Tools", "category": "Hardware & Tools", "hs": "846721", "countries": ["Germany", "Japan", "USA", "China"]},
    {"commodity": "Industrial Fasteners", "category": "Hardware & Tools", "hs": "731815", "countries": ["China", "Germany", "Taiwan", "India"]}
]

def generate_row():
    item = random.choice(wishlist)
    country = random.choice(item["countries"])
    
    # Generate realistic data
    supplier_id = f"SUP_{uuid.uuid4().hex[:8].upper()}"
    company_name = f"{country} {item['commodity']} Solutions {random.randint(100, 999)} Ltd."
    
    return [
        supplier_id,
        company_name,
        country,
        item["hs"],
        item["commodity"],
        item["category"],
        round(random.uniform(1000000, 15000000), 2), # total_export_value
        round(random.uniform(1000, 500000), 2),      # total_export_quantity
        round(random.uniform(-5, 15), 2),            # export_growth_rate
        random.choice(["China", "India", "USA", "Germany", "UK"]), # main_partner
        round(random.uniform(2, 15), 2),             # tariff_rate
        random.choice(["None", "Low", "Medium"]),    # restriction
        random.uniform(0.5, 100),                    # exchange_rate (mock)
        round(random.uniform(0.01, 0.1), 4),          # volatility
        round(random.uniform(100000, 1000000), 1),   # capacity
        round(random.uniform(0.8, 0.99), 2),          # reliability
        round(random.uniform(1, 5), 2),              # risk
        2024,                                        # year
        random.choice(["SME", "Large", "Enterprise"]), # size
        random.randint(5, 50),                       # years
        random.randint(100, 5000),                   # MOQ
        random.randint(10, 60),                      # lead time
        random.randint(10000, 500000),               # monthly cap
        random.choice(["Yes", "No"]),                # ISO
        random.choice(["Yes", "No"]),                # HACCP
        random.choice(["Yes", "No"]),                # FDA
        random.choice(["LC", "TT", "Net 30", "Advance"]), # Payment
        round(random.uniform(4, 9), 1),              # digital
        round(random.uniform(4, 9), 1),              # ESG
        round(random.uniform(3.5, 5.0), 1),          # rating
        round(random.uniform(0.5, 5.0), 2),          # dispute
        round(random.uniform(80, 99), 2),            # delivery
        random.choice(["Sea Freight", "Air Freight", "Land"]), # logistics
        round(random.uniform(2, 500), 2),            # unit price
        round(random.uniform(5, 10), 1)              # flexibility
    ]

# Generate 100 new rows
new_rows = [generate_row() for _ in range(100)]

# Append to file
with open(input_file, 'a', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerows(new_rows)

print(f"Successfully added 100 high-demand SME rows to {input_file}")
