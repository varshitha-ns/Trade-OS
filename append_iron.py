import csv
import random
import uuid

input_file = 'tradeos_master_ai_dataset_1000.csv'

wishlist = [
    {"commodity": "Iron Sheets", "category": "metals", "hs": "7208", "countries": ["China", "India", "Russia", "Brazil"]},
    {"commodity": "Iron Ore", "category": "metals", "hs": "2601", "countries": ["Australia", "Brazil", "China", "India"]},
]

def generate_row():
    item = random.choice(wishlist)
    country = random.choice(item["countries"])
    
    supplier_id = f"SUP_{uuid.uuid4().hex[:8].upper()}"
    company_name = f"{country} {item['commodity']} Corp {random.randint(100, 999)} Ltd."
    
    return [
        supplier_id,
        company_name,
        country,
        item["hs"],
        item["commodity"],
        item["category"],
        round(random.uniform(1000000, 15000000), 2),
        round(random.uniform(1000, 500000), 2),
        round(random.uniform(-5, 15), 2),
        random.choice(["China", "India", "USA", "Germany", "UK"]),
        round(random.uniform(2, 15), 2),
        random.choice(["None", "Low", "Medium"]),
        random.uniform(0.5, 100),
        round(random.uniform(0.01, 0.1), 4),
        round(random.uniform(100000, 1000000), 1),
        round(random.uniform(0.8, 0.99), 2),
        round(random.uniform(1, 5), 2),
        2024,
        random.choice(["SME", "Large", "Enterprise"]),
        random.randint(5, 50),
        random.randint(100, 5000),
        random.randint(10, 60),
        random.randint(10000, 500000),
        random.choice(["Yes", "No"]),
        random.choice(["Yes", "No"]),
        random.choice(["Yes", "No"]),
        random.choice(["LC", "TT", "Net 30", "Advance"]),
        round(random.uniform(4, 9), 1),
        round(random.uniform(4, 9), 1),
        round(random.uniform(3.5, 5.0), 1),
        round(random.uniform(0.5, 5.0), 2),
        round(random.uniform(80, 99), 2),
        random.choice(["Sea Freight", "Air Freight", "Land"]),
        round(random.uniform(2, 500), 2),
        round(random.uniform(5, 10), 1)
    ]

new_rows = [generate_row() for _ in range(50)]

with open(input_file, 'a', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerows(new_rows)

print(f"Successfully added 50 Iron rows to {input_file}")
