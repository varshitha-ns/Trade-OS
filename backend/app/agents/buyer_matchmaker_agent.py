import asyncio
from typing import Dict, Any, List
from app.database import get_database

class BuyerMatchmakerAgent:
    """
    Autonomous agent that connects Exporter Catalogs with Importer RFQs.
    Provides semantic scoring.
    """
    def __init__(self):
        pass

    async def find_buyers_for_catalog(self, catalog_item: Dict[str, Any], top_k: int = 5) -> Dict[str, Any]:
        """
        Takes an Exporter's catalog item and queries active Importer RFQs.
        """
        db = get_database()
        if db is None:
            return {"success": False, "message": "Database not connected", "leads": []}

        exporter_hs = "".join(ch for ch in str(catalog_item.get("hs_code", "")) if ch.isdigit()).lstrip("0")
        exporter_qty = float(catalog_item.get("quantity", 0))

        # Fetch all active RFQs (Trade Requests)
        rfqs = await db.trade_requests.find({"status": {"$ne": "fulfilled"}}).to_list(length=1000)
        
        scored_leads = []
        for rfq in rfqs:
            score = 0.0
            explanation = []
            
            # Calculate base semantic/product score
            semantic_score = 0.0
            
            # 1. HS Code Semantic Match (Weight 50%)
            rfq_hs = "".join(ch for ch in str(rfq.get("hs_code_suggestion", "")) if ch.isdigit()).lstrip("0")
            if exporter_hs and rfq_hs:
                if exporter_hs == rfq_hs:
                    semantic_score += 50.0
                    explanation.append("Exact HS Code Match")
                elif exporter_hs[:4] == rfq_hs[:4]:
                    semantic_score += 35.0
                    explanation.append("Partial HS Code Sub-Category Match")
            
            # Text/Product description match
            exporter_prod = str(catalog_item.get("product_name", "")).lower()
            rfq_prod = str(rfq.get("product_name", "")).lower()
            exp_words = set(exporter_prod.replace("-", " ").split())
            rfq_words = set(rfq_prod.replace("-", " ").split())
            
            # Basic stemming/stop word removal for robust semantic overlap
            stop_words = {"organic", "raw", "powder", "finished", "beans", "yarn", "quality", "material"}
            overlap = exp_words.intersection(rfq_words) - stop_words
            
            if overlap:
                semantic_score += 25.0
                explanation.append(f"High product overlap ({', '.join(overlap)})")
            elif exporter_prod in rfq_prod or rfq_prod in exporter_prod:
                semantic_score += 20.0
                explanation.append("Product semantics matched")
                
            # Category Fallback match (helps if LLM parser generated broad names)
            exporter_cat = str(catalog_item.get("category", "")).lower()
            rfq_cat = str(rfq.get("product_category", "")).lower()
            if exporter_cat and rfq_cat and (exporter_cat in rfq_cat or rfq_cat in exporter_cat):
                semantic_score += 15.0
                if not overlap:
                    explanation.append("Category Level Match")

            # HARD FILTER: If there is zero relevance between products, drop it entirely.
            if semantic_score == 0:
                continue
                
            score += semantic_score

            # 2. Volume Match (Weight 20%)
            rfq_qty = float(rfq.get("quantity", 0))
            if rfq_qty > 0 and exporter_qty > 0:
                if exporter_qty >= rfq_qty:
                    score += 20.0
                    explanation.append("Capacity meets buyer volume")
                else:
                    score += (exporter_qty / rfq_qty) * 20.0
                    explanation.append("Capacity partially fulfills volume")
            else:
                # Default middle score if volume wasn't successfully parsed
                score += 10.0
            
            # 3. Geopolitical/Trade Risk Match (Weight 30%)
            # We assume a baseline risk clear of +20 points unless embargoed.
            score += 20.0
            print(f"DEBUG Matchmaker: {rfq_prod} | HS: {rfq_hs} | Overlap: {overlap} | BaseSemantic: {semantic_score} | TotalScore: {score}")

            if score > 40.0:  # Must have semantic match + decent volume/risk
                scored_leads.append({
                    "buyer_id": str(rfq.get("_id", "")),
                    "company_name": rfq.get("buyer_id", "Global Import LLC"),  # Placeholder for demo if parsing didn't get buyer_id
                    "country": rfq.get("destination_country", "Unknown"),
                    "target_quantity": rfq_qty,
                    "unit": rfq.get("unit", "units"),
                    "product_name": rfq.get("product_name", "Commodity"),
                    "match_score": round(score, 1),
                    "match_explanation": ", ".join(explanation)
                })

        # Sort and return top k
        scored_leads.sort(key=lambda x: x["match_score"], reverse=True)
        return {
            "success": True,
            "leads": scored_leads[:top_k]
        }

    async def _on_rfq_created(self, rfq_data: Dict[str, Any]):
        """
        Callback fired by EventDispatcher when a new Importer trade request comes in.
        It auto-matches against available Exporter Catalogs.
        """
        print(f"🤖 [BuyerMatchmakerAgent] Received New RFQ Alert: {rfq_data.get('product_name')} to {rfq_data.get('destination_country')}")
        # In a real environment, we query the `exporter_catalogs` DB.
        # Then we could emit a WEBSOCKET event to the frontend for real-time notification.
        await asyncio.sleep(1) # simulate work
        print(f"🤖 [BuyerMatchmakerAgent] Auto-Matching complete for RFQ {rfq_data.get('request_id')}")

buyer_matchmaker_agent = BuyerMatchmakerAgent()
