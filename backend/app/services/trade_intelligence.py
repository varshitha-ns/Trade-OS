from typing import Dict, Any, List
import random

class TradeIntelligenceService:
    """
    Expert system for Indian SME Import Intelligence.
    Focuses on 'Should I Import?' decision support.
    """
    
    def calculate_landed_cost(self, base_price: float, hs_code: str, origin: str) -> Dict[str, Any]:
        """
        Simulates the 'Three-Bracket' Landed Cost (Best/Expected/Worst Case).
        Calculates Duty based on HS Code patterns and adds IGST/Freight.
        """
        # Simulated duty rates based on HS code chapters
        # 74 (Copper), 76 (Aluminum) -> 5-7.5%
        # 85 (Electronics) -> 10-20%
        # 39 (Plastics) -> 7.5-10%
        chapter = hs_code[:2]
        base_duty = 10.0 # Default
        
        if chapter in ['74', '76']: base_duty = 7.5
        elif chapter == '85': base_duty = 20.0
        elif chapter == '39': base_duty = 10.0
        elif chapter == '29': base_duty = 7.5 # Pharma
        
        igst = 18.0 # Standard for most industrial imports
        
        # Freight range simulation (USD/ton)
        freight_per_ton = random.uniform(50, 150) 
        
        def compute_total(duty_var, freight_var, hidden_var):
            cost_with_duty = base_price * (1 + (duty_var / 100))
            cost_with_igst = cost_with_duty * (1 + (igst / 100))
            return round(cost_with_igst + freight_var + hidden_var, 2)

        return {
            "currency": "INR",
            "base_price": base_price,
            "breakdown": {
                "basic_customs_duty": f"{base_duty}%",
                "igst": f"{igst}%",
                "social_welfare_surcharge": "10% of BCD"
            },
            "simulations": {
                "best_case": compute_total(base_duty, freight_per_ton * 0.8, 2000),
                "expected_case": compute_total(base_duty, freight_per_ton, 5000),
                "worst_case": compute_total(base_duty + 2, freight_per_ton * 1.5, 15000)
            },
            "verdict": "Importing remains 14% cheaper than local traders in Mumbai hub." if random.random() > 0.3 else "High duty on this HS Code makes local sourcing more viable."
        }

    def get_feasibility_report(self, product_name: str, hs_code: str) -> Dict[str, Any]:
        """
        Determines if importing is recommended based on Indian compliance.
        """
        compliance_needed = []
        chapter = hs_code[:2]
        
        if chapter == '85': compliance_needed = ["BIS Registration", "WPC Approval (if wireless)"]
        elif chapter == '29': compliance_needed = ["Drug Controller License", "Form 10 Import License"]
        elif chapter in ['74', '76']: compliance_needed = ["SIMS Registration"]
        
        return {
            "product": product_name,
            "hs_code": hs_code,
            "import_status": "Restricted" if chapter == '30' else "Free",
            "compliance_checklist": compliance_needed,
            "risk_score": round(random.uniform(1, 5), 1),
            "recommendation": "PROCEED: High supply gap in India for this grade." if len(compliance_needed) < 2 else "CAUTION: Heavy certification load. Factor in 60-day delay."
        }

intelligence_service = TradeIntelligenceService()
