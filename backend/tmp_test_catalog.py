import requests

try:
    resp = requests.post("http://localhost:8000/api/catalog/generate", json={"description": "5 tons of cotton"})
    print("STATUS:", resp.status_code)
    print("CATALOG:", resp.json())
except Exception as e:
    print("ERROR:", e)
