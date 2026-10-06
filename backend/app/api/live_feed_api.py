import asyncio
import json
import random
import requests
import urllib.parse
from bs4 import BeautifulSoup
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

import pandas as pd
import os

csv_path = os.path.join(os.path.dirname(__file__), "../../../tradeos_master_ai_dataset_1000.csv")
try:
    df = pd.read_csv(csv_path)
    COMMODITIES = df['commodity_name'].unique().tolist()
except Exception as e:
    print(f"Failed to load commodities from CSV for Live Feed: {e}")
    COMMODITIES = ["Coffee", "Apparel", "Surgical Masks", "Semiconductors", "Wheat", "Motor Cars"]

LOCATIONS = ["Germany", "UAE", "India", "Vietnam", "Brazil", "USA", "Singapore", "Netherlands", "Japan", "South Korea"]
TYPES = ["IMPORT", "EXPORT", "IMPORT"] # Weight it slightly towards IMPORT

class LiveScraperCache:
    def __init__(self):
        self.cached_news = []
        self.last_fetch = 0
        
    def get_news(self):
        import time
        import xml.etree.ElementTree as ET
        import urllib.request
        
        now = time.time()
        # Fetch at most once every 60 seconds
        if not self.cached_news or (now - self.last_fetch) > 60:
            print("[LiveFeed] Fetching live trade intelligence from global RSS feeds...")
            try:
                # Use a mix of robust RSS feeds for global trade and business
                feeds = [
                    "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",
                    "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000115"
                ]
                
                parsed_logs = []
                for feed_url in feeds:
                    try:
                        req = urllib.request.Request(feed_url, headers={'User-Agent': 'Mozilla/5.0'})
                        res = urllib.request.urlopen(req, timeout=5).read()
                        root = ET.fromstring(res)
                        
                        for item in root.findall('.//item')[:10]:
                            title_elem = item.find('title')
                            desc_elem = item.find('description')
                            
                            if title_elem is None or not title_elem.text:
                                continue
                                
                            snip = title_elem.text
                            if desc_elem is not None and desc_elem.text:
                                # Clean up HTML from descriptions if any, or just use it if short
                                clean_desc = desc_elem.text.split('<')[0]
                                if len(clean_desc) > 10:
                                    snip += " - " + clean_desc[:100] + "..."
                            
                            category = "MARKET SIGNAL"
                            lower_snip = snip.lower()
                            if "price" in lower_snip or "cost" in lower_snip or "inflation" in lower_snip or "rate" in lower_snip:
                                category = "PRICE ALERT"
                            elif "delay" in lower_snip or "port" in lower_snip or "shipping" in lower_snip or "freight" in lower_snip or "supply" in lower_snip:
                                category = "LOGISTICS WARNING"
                            elif "sanction" in lower_snip or "war" in lower_snip or "ban" in lower_snip or "risk" in lower_snip or "tariff" in lower_snip or "strike" in lower_snip:
                                category = "RISK UPDATE"
                                
                            parsed_logs.append({
                                "category": category,
                                "text": snip
                            })
                    except Exception as fe:
                        print(f"[LiveFeed] Error fetching feed {feed_url}: {fe}")
                
                if parsed_logs:
                    # Shuffle to mix sources
                    random.shuffle(parsed_logs)
                    self.cached_news = parsed_logs
                    self.last_fetch = now
            except Exception as e:
                print(f"[LiveFeed] Scrape error: {e}")
        
        return self.cached_news

scraper_cache = LiveScraperCache()

def generate_random_rfq() -> dict:
    return {
        "item": f"{random.randint(10, 5000)} Tons {random.choice(COMMODITIES)}",
        "loc": random.choice(LOCATIONS),
        "type": random.choice(TYPES),
        "time": "Just now",
        "match": f"{random.randint(70, 99)}%"
    }

@router.websocket("/ws")
async def live_feed_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[LiveFeed] Client connected to live data stream.")
    
    try:
        while True:
            # Generate 1 new RFQ
            new_rfqs = [generate_random_rfq()]
            
            # Get live news from cache or scrape
            news = scraper_cache.get_news()
            
            # Pick 1 random news item to broadcast to simulate real-time alerting
            news_item = random.choice(news) if news else None
            
            payload = {
                "type": "live_update",
                "rfqs": new_rfqs,
                "intelligence": [news_item] if news_item else []
            }
            
            await websocket.send_json(payload)
            # Send updates every 5 to 12 seconds randomly to feel "organic"
            await asyncio.sleep(random.uniform(5.0, 12.0))
            
    except WebSocketDisconnect:
        print("[LiveFeed] Client disconnected from stream.")
    except Exception as e:
        print(f"[LiveFeed] Error: {e}")
