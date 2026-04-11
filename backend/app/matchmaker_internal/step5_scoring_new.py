from typing import List, Dict, Any

class ScoringEngine:
    """
    🔹 STEP 5: Build Scoring Formula (Core Recommendation Engine)
    
    Example weighted scoring:
    Final Score =
    0.30 × Product Similarity +
    0.20 × Trust Score +
    0.15 × On-time Rate +
    0.15 × Capacity Score +
    0.10 × Certification Match +
    0.10 × (1 - Risk Score)
    """
    
    def calculate_final_scores(self, scored_suppliers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        final_results = []
        
        for s in scored_suppliers:
            # Weighted Scoring Formula
            final_score = (
                (s["product_similarity"] * 0.30) +
                (s["trust_score"] * 0.20) +
                (s["on_time_rate"] * 0.15) +
                (s["capability_score"] * 0.15) +
                (s["cert_match"] * 0.10) +
                (s["risk_adjustment"] * 0.10)
            )
            
            # Add bonus for verification
            if s.get("aadhaar_verified"):
                final_score += 0.05
            if s.get("kyc_verified"):
                final_score += 0.05
                
            # Cap score at 1.0
            s["final_score"] = min(1.0, round(final_score, 4))
            
            # Generate Explanation (Step 8)
            s["explanation"] = self._generate_explanation(s)
            
            final_results.append(s)
            
        # Ranking (Step 6)
        return sorted(final_results, key=lambda x: x["final_score"], reverse=True)
    
    def _generate_explanation(self, s: Dict[str, Any]) -> str:
        reasons = []
        
        if s["product_similarity"] > 0.8:
            reasons.append("excellent product match")
        if s["trust_score"] > 0.85:
            reasons.append(f"high trust rating ({s['rating']}/5)")
        if s["on_time_rate"] > 0.9:
            reasons.append(f"exceptional on-time delivery ({int(s['on_time_rate']*100)}%)")
        if s["aadhaar_verified"] and s["kyc_verified"]:
            reasons.append("fully verified identity and business")
        if s["cert_match"] == 1.0:
            reasons.append("matches all required certifications")
            
        if not reasons:
            reasons.append("balanced score across all metrics")
            
        prefix = f"Recommended because {', '.join(reasons[:-1])}"
        if len(reasons) > 1:
            prefix += f", and {reasons[-1]}."
        else:
            prefix = f"Recommended because {reasons[0]}."
            
        return prefix
