from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class TradeState(BaseModel):
    """
    The Single Source of Truth that flows sequentially between the agents.
    Acts as our LangGraph-like state object.
    """
    # Metadata
    trade_id: str = Field(default_factory=lambda: f"TRD-{uuid.uuid4().hex[:8]}")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status: str = "INITIATED"
    
    # Exporter / Importer Basic info
    exporter_id: Optional[str] = None
    buyer_id: Optional[str] = None
    
    # 1. Catalog Agent Output
    catalog_item: Optional[Dict[str, Any]] = None
    
    # 2. Matchmaker Agent Output
    matched_buyers: List[Dict[str, Any]] = []
    selected_buyer: Optional[Dict[str, Any]] = None
    
    # 3. Negotiation Agent Output
    agreed_price: Optional[float] = None
    currency: str = "USD"
    payment_terms: str = "LC"
    
    # 4. Risk Agent Output
    risk_score: Optional[float] = None
    risk_clearance: bool = False
    
    # 5. Document Agent Output
    contract_hash: Optional[str] = None
    document_uri: Optional[str] = None
    
    def advance_state(self, step: str, data: Any):
        """Update the state based on which agent just finished."""
        if step == "CATALOG_GENERATED":
            self.catalog_item = data
            self.status = "CATALOG_READY"
        elif step == "BUYERS_MATCHED":
            self.matched_buyers = data
            self.status = "MATCHED"
        elif step == "NEGOTIATION_COMPLETE":
            self.agreed_price = data.get("price")
            self.payment_terms = data.get("terms", "LC")
            self.status = "NEGOTIATED"
        elif step == "RISK_ASSESSED":
            self.risk_score = data.get("risk_score")
            self.risk_clearance = data.get("proceed_recommended", False)
            self.status = "RISK_CLEARED" if self.risk_clearance else "RISK_FLAGGED"
        elif step == "DOCUMENTS_GENERATED":
            self.contract_hash = data.get("hash")
            self.status = "COMPLETED"
