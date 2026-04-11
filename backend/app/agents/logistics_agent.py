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
        
    def _calculate_base_metrics(self, mode: str, weight_kg: float, distance_km: float) -> dict:
        """Simulates freight rate and carbon equations."""
        if mode == "SEA":
            cost = (weight_kg / 1000) * 150 + (distance_km * 0.05)
            days = max(10, int(distance_km / 600))  # Assuming ~600km/day via ship
            carbon_kg = (weight_kg / 1000) * distance_km * 0.015
            safety_baseline = 8.5
        elif mode == "AIR":
            cost = (weight_kg / 1) * 3.5 + (distance_km * 0.8)
            days = max(1, int(distance_km / 8000))
            carbon_kg = (weight_kg / 1000) * distance_km * 0.600
            safety_baseline = 9.5
        else: # LAND
            cost = (weight_kg / 1000) * 400 + (distance_km * 1.2)
            days = max(3, int(distance_km / 900))
            carbon_kg = (weight_kg / 1000) * distance_km * 0.080
            safety_baseline = 9.0
            
        return {
            "estimated_cost_usd": round(cost, 2),
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
            metrics = self._calculate_base_metrics(mode, weight, simulated_distance_km)
            
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
            norm_cost = max(0, 1 - (metrics["estimated_cost_usd"] / 20000))
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
