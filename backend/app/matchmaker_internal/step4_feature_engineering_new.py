import numpy as np
from typing import List, Dict, Any
from app.models.supplier import Supplier

class FeatureEngineeringLayer:
    """
    🔹 STEP 4: Build Feature Engineering Layer
    
    For each supplier, compute:
    1. Product Similarity Score (Simplified for demo)
    2. Capability Score
    3. Trust Score
    4. Risk Adjustment (Simplified for demo)
    """
    
    def compute_features(self, trade_request: Dict[str, Any], eligible_suppliers: List[Supplier]) -> List[Dict[str, Any]]:
        scored_suppliers = []
        
        req_product = trade_request.get("product_name", "").lower()
        req_quantity = trade_request.get("quantity", 0)
        req_certs = [c.lower() for c in trade_request.get("certifications_required", [])]
        
        for supplier in eligible_suppliers:
            # 1. Product Similarity (Keyword based for demo)
            # In a real app, use SentenceEmbeddings or TF-IDF
            matches = 0
            supplier_products = [p.lower() for p in supplier.products]
            for word in req_product.split():
                if any(word in p for p in supplier_products):
                    matches += 1
            
            product_similarity = min(1.0, matches / max(1, len(req_product.split())))
            
            # 2. Capability Score
            # Ratio of requested quantity to total production capacity
            capability_score = min(1.0, supplier.production_capacity / (req_quantity * 2)) if req_quantity > 0 else 1.0
            
            # 3. Trust Score
            # Weighted average of success rate, rating, and verification
            trust_score = (
                (supplier.success_rate * 0.4) + 
                (supplier.average_rating / 5.0 * 0.3) + 
                (supplier.on_time_delivery_rate * 0.2) +
                ((supplier.verification_level / 5.0) * 0.1)
            )
            
            # 4. Certification Match
            cert_match = 0
            if req_certs:
                supplier_certs = [c.lower() for c in supplier.certifications]
                matches = sum(1 for c in req_certs if c in supplier_certs)
                cert_match = matches / len(req_certs)
            else:
                cert_match = 1.0 # No certifications required
                
            # 5. Risk Score (Inverted: 1.0 is low risk, 0.0 is high risk)
            risk_adjustment = 1.0 - supplier.risk_score
            
            scored_suppliers.append({
                "supplier_id": supplier.supplier_id,
                "company_name": supplier.company_name,
                "country": supplier.country,
                "product_similarity": product_similarity,
                "capability_score": capability_score,
                "trust_score": trust_score,
                "cert_match": cert_match,
                "risk_adjustment": risk_adjustment,
                "aadhaar_verified": supplier.aadhaar_verified,
                "kyc_verified": supplier.kyc_verified,
                "success_rate": supplier.success_rate,
                "on_time_rate": supplier.on_time_delivery_rate,
                "rating": supplier.average_rating
            })
            
        return scored_suppliers
