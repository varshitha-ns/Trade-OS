import uuid
import random
from typing import Dict, Any, List
from datetime import datetime, timedelta

from app.agents.risk_agent import RiskAgent

class LogisticsAgent:
    """
    Autonomous Logistics & Digital Freight Forwarder.
    Plans Parete-optimal multi-modal routes balancing Cost, Time, Safety, and Carbon.
    Integrates deeply with the Risk Agent for "pre-delay" storm detection.
    """
    
    def __init__(self):
        self.risk_agent = RiskAgent()
        # Simulated carrier DB
        self.carriers = {
            "SEA": ["Maersk", "MSC", "CMA CGM"],
            "AIR": ["DHL Aviation", "FedEx Express", "Emirates SkyCargo"],
            "LAND": ["JB Hunt", "DB Schenker", "XPO Logistics"]
        }
        
    def _calculate_base_metrics(self, mode: str, origin: str, destination: str, weight_kg: float) -> dict:
        """Autonomously predicts freight rate, time, and ESG impact using Gemini LLM."""
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            import os
            import json
            import re
            
            # Ensure we only try LLM if API key exists, otherwise fallback to math
            if not os.getenv("GEMINI_API_KEY"):
                raise ValueError("No Gemini key")

            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.1)
            
            prompt = f"""
            You are an advanced commercial freight forwarding AI calculating logistics metrics.
            Origin Port: {origin}
            Destination Port: {destination}
            Shipping Mode: {mode} (SEA, AIR, or LAND)
            Total Weight: {weight_kg} kg

            Please predict realistic routing parameters. For context: Mangalore to Chennai by SEA is around 1,500 km (coastal) and takes 3-5 days. Air is 1 day. Use real-world logic. Base your cost roughly on ₹4.0 per kg for SEA, and ₹290.0 per kg for AIR.

            Respond ONLY with a valid, raw JSON object (no markdown, no backticks, no text outside JSON) with exactly these fields:
            "estimated_cost_inr" (float: realistic total cost in INR rupees),
            "transit_time_days" (int: realistic days),
            "carbon_footprint_kg" (float: realistic CO2 emission),
            "safety_baseline" (float: x.xx out of 10.0)
            """
            response_text = llm.invoke(prompt).content
            
            # Clean up the output string, just in case Gemini hallucinates markdown blocks
            clean_json = re.sub(r'```json', '', response_text, flags=re.IGNORECASE)
            clean_json = re.sub(r'```', '', clean_json).strip()
            
            # If for some reason the response has text before the { block, extract just the dict
            match = re.search(r'\{.*\}', clean_json, re.DOTALL)
            if match:
                clean_json = match.group(0)
                
            prediction = json.loads(clean_json)
            # Normalizer in case LLM outputs the old key
            if "estimated_cost_usd" in prediction and "estimated_cost_inr" not in prediction:
                prediction["estimated_cost_inr"] = prediction.pop("estimated_cost_usd") * 83.5
                
            return prediction
            
        except Exception as e:
            print(f"   [Logistics Agent] LLM Prediction failed: {e}. Falling back to baseline formulas.")
            # Fallback mathematical baseline in case of API timeout
            simulated_distance = 3000 # generic fallback
            
            if mode == "SEA":
                cost_usd = (weight_kg / 1000) * 150 + (simulated_distance * 0.05)
                days = max(3, 3 + int(simulated_distance / 600))  
                carbon_kg = (weight_kg / 1000) * simulated_distance * 0.015
                safety_baseline = 8.5
            elif mode == "AIR":
                cost_usd = (weight_kg / 1) * 3.5 + (simulated_distance * 0.8)
                days = max(1, int(simulated_distance / 8000))
                carbon_kg = (weight_kg / 1000) * simulated_distance * 0.600
                safety_baseline = 9.5
            else: # LAND
                cost_usd = (weight_kg / 1000) * 400 + (simulated_distance * 1.2)
                days = max(3, int(simulated_distance / 900))
                carbon_kg = (weight_kg / 1000) * simulated_distance * 0.080
                safety_baseline = 9.0
                
            return {
                "estimated_cost_inr": round(cost_usd * 83.5, 2),
                "transit_time_days": days,
                "carbon_footprint_kg": round(carbon_kg, 2),
                "safety_baseline": safety_baseline
            }

    def plan_optimal_routes(self, trade_details: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Receives trade package and generates Pareto-optimal shipping options.
        Injects real-time risk data to adjust viability.
        """
        origin = trade_details.get("supplier_port", "Unknown")
        destination = trade_details.get("buyer_port", "Unknown")
        weight = float(trade_details.get("weight_kg", 5000))
        
        # 1. Fetch live "Pre-Delay" weather risk from Risk Agent for the destination port
        # This prevents picking a port that is currently facing a hurricane.
        live_weather_risk = self.risk_agent._get_weather_risk(destination)
        # Fetch route duration/distance risk (OSRM via RiskAgent)
        route_risk = self.risk_agent._get_route_duration_risk(origin, destination)
        
        # We extract the simulated distance from the route risk logic (reverse engineering roughly for realism)
        # If route risk is extremely high, distance is huge. Let's just use a baseline for demo:
        simulated_distance_km = route_risk * 1500 if route_risk > 0 else 5000
        
        options = []
        possible_modes = ["SEA", "AIR"]
        
        # Land is logically only viable if not separated by oceans, but for demo we will allow it if distance is < 4000
        if simulated_distance_km < 4000:
            possible_modes.append("LAND")
            
        for mode in possible_modes:
            metrics = self._calculate_base_metrics(mode, origin, destination, weight)
            
            # Apply AI Risk Impacts
            # e.g. High weather risk massively delays sea freight, but blocks air freight entirely.
            if live_weather_risk > 6.0 and mode == "AIR":
                metrics["safety_baseline"] -= 4.0
                metrics["transit_time_days"] += 3
            elif live_weather_risk > 6.0 and mode == "SEA":
                metrics["safety_baseline"] -= 2.0
                metrics["transit_time_days"] += 5
                
            carrier = random.choice(self.carriers[mode])
            
            # Create a combined "Optimality Score" (Higher is better)
            # Weights: Cost (40%), Time (30%), ESG (10%), Safety (20%)
            cost = metrics.get("estimated_cost_inr", metrics.get("estimated_cost_usd", 0) * 83.5)
            # Using 1,600,000 INR (~20k USD) as boundary for max cost scoring
            norm_cost = max(0, 1 - (cost / 1670000))
            norm_time = max(0, 1 - (metrics["transit_time_days"] / 40))
            norm_esg = max(0, 1 - (metrics["carbon_footprint_kg"] / 5000))
            norm_safety = metrics["safety_baseline"] / 10.0
            
            cct_score = (norm_cost * 0.4) + (norm_time * 0.3) + (norm_esg * 0.1) + (norm_safety * 0.2)
            cct_score = round(cct_score * 10, 2)
            
            option = {
                "route_option_id": f"OPT-{uuid.uuid4().hex[:6].upper()}",
                "mode": mode,
                "carrier": carrier,
                "metrics": metrics,
                "optimality_score": cct_score,
                "live_weather_alert": live_weather_risk > 5.0
            }
            options.append(option)
            
        # Sort by optimality
        options.sort(key=lambda x: x["optimality_score"], reverse=True)
        return options

    def book_shipment(self, route_option_id: str, trade_id: str) -> Dict[str, Any]:
        """
        Locks in the transit route and simulates API handshake with carrier.
        """
        tracking_number = f"TRK-{uuid.uuid4().hex[:10].upper()}"
        
        return {
            "status": "BOOKED",
            "trade_id": trade_id,
            "route_option_id": route_option_id,
            "tracking_number": tracking_number,
            "booking_timestamp": datetime.utcnow().isoformat(),
            "next_action": "Awaiting Gate-In at Origin Port"
        }

    def fetch_tracking_status(self, tracking_number: str) -> Dict[str, Any]:
        """
        Simulates live tracking webhooks. In a real system, this connects to Project44/Shippo.
        This provides the smart-contract hooks like `VESSEL_DEPARTED`.
        """
        # For demonstration, we cycle through statuses based on real-time random chance
        statuses = [
            ("PRE_TRANSIT", "Awaiting Carrier Pickup"),
            ("GATE_IN", "Container arrived at origin terminal"),
            ("VESSEL_DEPARTED", "Vessel departed origin port - Smart Contract Escrow Triggered"),
            ("IN_TRANSIT", "Vessel sailing in open ocean"),
            ("GATE_OUT", "Container discharged at destination terminal"),
            ("DELIVERED", "Shipment securely delivered to buyer facility")
        ]
        
        chosen_status, description = random.choice(statuses)
        
        return {
            "tracking_number": tracking_number,
            "live_status_code": chosen_status,
            "status_description": description,
            "timestamp": datetime.utcnow().isoformat(),
            "location_ping": "Simulated GPS Coordinate"
        }
