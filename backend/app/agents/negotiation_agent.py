from typing import Dict, Any, List
import time
from app.agents.market_agent import market_agent

class NegotiationAgent:
    """
    Agent responsible for autonomous price and terms negotiation
    with a supplier, backed by the Market Intelligence Agent.
    """

    def _calculate_target_price(self, market_val: float, supplier_val: float) -> float:
        """
        Calculates the AI's target objective price.
        Formula: 50% market weight, 30% supplier quote weight, 20% strict discount weight.
        """
        return (0.50 * market_val) + (0.30 * supplier_val) + (0.20 * (market_val * 0.90))

    def run_negotiation(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a simulated multi-round negotiation to settle on the final trade price.
        """
        commodity = payload.get("product_name", "Unknown Product")
        quantity = payload.get("quantity", 1000)
        supplier_initial_quote = float(payload.get("price", 10.0))

        # 1. Ask Market Intelligence Agent for Today's Value
        market_analysis = market_agent.analyze_market_price(commodity)
        market_price = market_analysis["market_price"]
        curr = market_analysis.get("currency", "INR")
        trend = market_analysis["market_trend"]

        # If frontend sent a hardcoded dummy price (like 1250) that makes no sense,
        # override it to simulate a realistic supplier (15% markup over FMV).
        if supplier_initial_quote < (market_price * 0.5) or supplier_initial_quote == 1250.0:
            supplier_initial_quote = round(market_price * 1.15, 2)
            
        print(f"\n🤝 [Negotiation Agent] INITIATING NEGOTIATION WITH MOCK SUPPLIER")
        print(f"   [Negotiation Agent] Commodity: {commodity} | Quantity: {quantity}")
        print(f"   [Negotiation Agent] Supplier Initial Quote: ₹{supplier_initial_quote}")
        
        # 2. Compute Target Objective
        target_price = round(self._calculate_target_price(market_price, supplier_initial_quote), 2)
        print(f"   [Negotiation Agent] Internal Target Price objective: ₹{target_price}")
        
        negotiation_log = []
        agreed_price = supplier_initial_quote
        success = False
        
        # 3. Decision Logic & Round Simulation
        if supplier_initial_quote <= market_price * 1.05:
            # Supplier price is already great
            negotiation_log.append(f"Round 1: Supplier price (₹{supplier_initial_quote}) is excellent compared to market benchmark (₹{market_price}). Accepted immediately.")
            agreed_price = supplier_initial_quote
            success = True
        else:
            # Supplier price is high. Negotiate!
            negotiation_log.append(f"Round 1 (AI): Your quote of ₹{supplier_initial_quote} is higher than the current {market_analysis['data_source']} benchmark of ₹{market_price}. We counter at ₹{target_price}.")
            
            # Simulate Supplier Counter
            time.sleep(1) # Simulation delay
            
            # Supplier gives a bit of ground
            mock_supplier_counter = round(supplier_initial_quote - ((supplier_initial_quote - target_price) * 0.4), 2)
            negotiation_log.append(f"Round 2 (Supplier): We can reduce the price to ₹{mock_supplier_counter}, but no lower due to export duties.")
            
            # AI Evaluates Supplier Counter
            time.sleep(1)
            
            if mock_supplier_counter <= target_price * 1.08: # Within 8% of AI target?
                negotiation_log.append(f"Round 3 (AI): Agreed. We accept ₹{mock_supplier_counter} per unit if you agree to {payload.get('delivery_terms', 'FOB')} terms.")
                agreed_price = mock_supplier_counter
                success = True
            else:
                # One last aggressive push
                final_ai_offer = round(target_price * 1.04, 2)
                negotiation_log.append(f"Round 3 (AI): Maximum we can authorize today is ₹{final_ai_offer}.")
                
                time.sleep(1)
                
                # Assume supplier accepts final offer in this simulation
                negotiation_log.append(f"Round 4 (Supplier): Agreed to final price of ₹{final_ai_offer}.")
                agreed_price = final_ai_offer
                success = True

        print(f"   [Negotiation Agent] Final agreed price: ₹{agreed_price}")
        
        # Compute savings
        total_savings = round((supplier_initial_quote - agreed_price) * quantity, 2)
        
        return {
            "status": "success" if success else "failed",
            "commodity": commodity,
            "market_intelligence": market_analysis,
            "supplier_initial_quote": supplier_initial_quote,
            "final_agreed_price": agreed_price,
            "negotiation_log": negotiation_log,
            "total_savings": total_savings,
            "message": f"Negotiation finalized. Saved ₹{total_savings} against initial quote."
        }

# Singleton instance
negotiator = NegotiationAgent()
