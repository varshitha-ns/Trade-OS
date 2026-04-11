from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional


class LearningAgent:
    """
    Stores transaction outcomes and applies bounded score updates.
    This is the first learning loop layer and can be replaced with ML retraining later.
    """

    @staticmethod
    def _to_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    async def record_outcome(
        self,
        db,
        *,
        supplier_id: str,
        deal_success: bool,
        delivery_delay: Optional[float] = None,
        buyer_rating_after: Optional[float] = None,
        buyer_id: Optional[str] = None,
        hs_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        outcome = {
            "supplier_id": supplier_id,
            "deal_success": bool(deal_success),
            "delivery_delay": delivery_delay,
            "buyer_rating_after": buyer_rating_after,
            "buyer_id": buyer_id,
            "hs_code": hs_code,
            "created_at": datetime.utcnow().isoformat(),
        }
        await db.matchmaker_feedback.insert_one(outcome)

        supplier = await db.suppliers_master.find_one({"supplier_id": supplier_id})
        if not supplier:
            return {
                "success": False,
                "message": "Outcome stored, supplier not found for score update.",
            }

        current_reliability = self._to_float(supplier.get("reliability_score"), default=0.5)
        reliability_delta = 0.01 if deal_success else -0.02

        new_reliability = min(1.0, max(0.0, current_reliability + reliability_delta))

        update_fields: Dict[str, Any] = {
            "reliability_score": round(new_reliability, 4),
            "last_learning_update": datetime.utcnow().isoformat(),
        }

        if buyer_rating_after is not None:
            normalized_rating = min(5.0, max(0.0, float(buyer_rating_after)))
            update_fields["buyer_rating"] = round(normalized_rating, 2)

        if delivery_delay is not None:
            delay = float(delivery_delay)
            current_risk = self._to_float(supplier.get("risk_score"), default=5.0)
            if delay > 7:
                current_risk += 0.5
            elif delay < 1 and deal_success:
                current_risk -= 0.2
            update_fields["risk_score"] = round(min(10.0, max(0.0, current_risk)), 3)

        await db.suppliers_master.update_one(
            {"supplier_id": supplier_id},
            {"$set": update_fields},
        )

        return {
            "success": True,
            "message": "Outcome stored and supplier profile updated.",
            "updated_fields": update_fields,
        }
