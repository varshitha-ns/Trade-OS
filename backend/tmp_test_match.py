import requests

catalog = {
    "product_name": "Raw Cotton",
    "hs_code": "520100",
    "quantity": 5,
    "unit": "tons",
    "category": "Agriculture"
}

try:
    resp = requests.post("http://localhost:8000/api/matchmaker/find-buyers", json=catalog)
    print("STATUS:", resp.status_code)
    print("JSON:", resp.json())
except Exception as e:
    print("ERROR:", e)
