from typing import List, Dict, Any, Tuple
from app.models.supplier import Supplier

class HardConstraintsFilter:
    """
    🔹 STEP 3: Hard Constraints Filter
    
    Removes suppliers who:
    1. Don't supply that HS code
    2. Don't serve the destination country
    3. Capacity < required quantity
    4. Don't meet basic verification requirements
    """
    
    def filter_suppliers(self, trade_request: Dict[str, Any], suppliers: List[Supplier]) -> Tuple[List[Supplier], Dict[str, Any]]:
        eligible_suppliers = []
        report = {
            "initial_count": len(suppliers),
            "filtered_by_hs_code": 0,
            "filtered_by_country": 0,
            "filtered_by_capacity": 0,
            "filtered_by_verification": 0,
            "final_count": 0
        }
        
        req_hs = trade_request.get("hs_code_suggestion", "")[:4] # Use first 4 digits for broad matching
        dest_country = trade_request.get("destination_country", "")
        req_quantity = trade_request.get("quantity", 0)
        
        for supplier in suppliers:
            # 1. HS Code Check
            hs_match = any(hs.startswith(req_hs) for hs in supplier.hs_codes)
            if not hs_match:
                report["filtered_by_hs_code"] += 1
                continue
            
            # 2. Destination Country Check
            if dest_country and dest_country not in supplier.delivery_countries:
                report["filtered_by_country"] += 1
                continue
            
            # 3. Capacity Check
            if req_quantity > supplier.production_capacity:
                report["filtered_by_capacity"] += 1
                continue
                
            # 4. Basic Verification Check (Min verification level 2 for demo)
            if supplier.verification_level < 2:
                report["filtered_by_verification"] += 1
                continue
            
            eligible_suppliers.append(supplier)
            
        report["final_count"] = len(eligible_suppliers)
        return eligible_suppliers, report
