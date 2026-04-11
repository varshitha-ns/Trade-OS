from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.agents.intelligence_agent import IntelligenceAgent
from app.agents.learning_agent import LearningAgent
from app.agents.risk_agent import RiskAgent
from app.database import get_database, mongodb


class AutonomousMatchmakerService:
    """
    Mongo-backed autonomous matchmaker.
    Phases covered:
    - core multi-factor ranking
    - dynamic risk adjustment
    - intelligence (market trend) adjustment
    - learning loop feedback persistence and score updates
    """

    def __init__(self) -> None:
        self.risk_agent = RiskAgent()
        self.intelligence_agent = IntelligenceAgent()
        self.learning_agent = LearningAgent()
        self.default_weights = {
            "reliability_score": 0.20,
            "risk_component": 0.15,
            "delivery_component": 0.15,
            "buyer_rating": 0.15,
            "esg_score": 0.10,
            "flexibility_score": 0.10,
            "growth_component": 0.10,
            "price_component": 0.05,
        }

    @staticmethod
    def _to_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _normalize(value: float, scale: float) -> float:
        if scale <= 0:
            return 0.0
        return max(0.0, min(value / scale, 1.0))

    @staticmethod
    def _extract_hs_code(request: Dict[str, Any]) -> str:
        for key in ("hs_code", "hs_code_suggestion"):
            value = str(request.get(key, "")).strip()
            if value and value != "0000":
                return value
        return ""

    @staticmethod
    def _normalize_hs_code(value: Any) -> str:
        raw = "".join(ch for ch in str(value or "").strip() if ch.isdigit())
        if not raw:
            return ""
        normalized = raw.lstrip("0")
        return normalized or "0"

    @staticmethod
    def _normalize_country(value: Any) -> str:
        raw = str(value or "").strip().lower()
        if not raw:
            return ""
        aliases = {
            "united states": "usa",
            "us": "usa",
            "u.s.": "usa",
            "u.s.a": "usa",
            "u.s.a.": "usa",
            "united kingdom": "uk",
            "great britain": "uk",
            "uae": "uae",
            "united arab emirates": "uae",
        }
        return aliases.get(raw, raw)

    def _supplier_capacity_value(self, supplier: Dict[str, Any]) -> float:
        """
        Determine effective supplier capacity for filtering.
        Prefer `production_capacity_monthly` (large monthly output from dataset),
        then fallback to `estimated_capacity`.
        """
        monthly_capacity = self._to_float(supplier.get("production_capacity_monthly"), default=0.0)
        estimated_capacity = self._to_float(supplier.get("estimated_capacity"), default=0.0)
        return monthly_capacity if monthly_capacity > 0 else estimated_capacity

    @staticmethod
    def _extract_buyer_preferences(request: Dict[str, Any]) -> Dict[str, float]:
        raw = request.get("buyer_preferences") or {}
        if not isinstance(raw, dict):
            return {}
        prefs: Dict[str, float] = {}
        for key, value in raw.items():
            try:
                prefs[key] = max(0.0, min(float(value), 1.0))
            except (TypeError, ValueError):
                continue
        return prefs

    def _resolve_weights(self, buyer_preferences: Dict[str, float]) -> Dict[str, float]:
        weights = dict(self.default_weights)

        # Buyer personalization layer.
        if buyer_preferences.get("low_risk", 0.0) > 0.5:
            weights["risk_component"] += 0.08
            weights["price_component"] -= 0.03

        if buyer_preferences.get("fast_delivery", 0.0) > 0.5:
            weights["delivery_component"] += 0.06
            weights["risk_component"] -= 0.02

        if buyer_preferences.get("low_price", 0.0) > 0.5:
            weights["price_component"] += 0.06
            weights["growth_component"] -= 0.03

        if buyer_preferences.get("esg_priority", 0.0) > 0.5:
            weights["esg_score"] += 0.08
            weights["price_component"] -= 0.03

        total = sum(max(v, 0.0) for v in weights.values())
        if total <= 0:
            return dict(self.default_weights)
        return {k: max(v, 0.0) / total for k, v in weights.items()}

    async def _load_suppliers(self, request: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        db = get_database()
        if db is None:
            raise RuntimeError("Database not connected. Ensure startup event has run.")

        hs_code = self._extract_hs_code(request)
        normalized_hs_code = self._normalize_hs_code(hs_code)
        max_risk = self._to_float(request.get("max_risk"), default=10.0)
        min_capacity = self._to_float(request.get("quantity"), default=0.0)
        destination_country = str(request.get("destination_country", "")).strip()
        destination_country_norm = self._normalize_country(destination_country)

        base_query: Dict[str, Any] = {"risk_score": {"$lte": max_risk}}

        source_db_name = db.name
        all_candidates = await db.suppliers_master.count_documents(base_query)
        # Compatibility fallback: many local scripts load data into `tradeos_db`.
        if all_candidates == 0 and mongodb.client is not None and db.name != "tradeos_db":
            fallback_db = mongodb.client["tradeos_db"]
            fallback_count = await fallback_db.suppliers_master.count_documents(base_query)
            if fallback_count > 0:
                db = fallback_db
                source_db_name = db.name
                all_candidates = fallback_count
        cursor = db.suppliers_master.find(base_query)
        suppliers = await cursor.to_list(length=2000)
        after_risk_count = len(suppliers)

        # HS matching supports exact and prefix matches (e.g. 0904 <-> 090421).
        if hs_code:
            hs_eligible: List[Dict[str, Any]] = []
            for supplier in suppliers:
                supplier_hs = self._normalize_hs_code(supplier.get("hs_code", ""))
                if not supplier_hs:
                    continue
                if (
                    supplier_hs == normalized_hs_code
                    or supplier_hs.startswith(normalized_hs_code)
                    or normalized_hs_code.startswith(supplier_hs)
                ):
                    hs_eligible.append(supplier)
            suppliers = hs_eligible
        after_hs_count = len(suppliers)

        # STRICT Text-Based Product Matching
        product_name = str(request.get("product_name", "")).strip().lower()
        if product_name:
            product_eligible = []
            for supplier in suppliers:
                supplier_commodity = str(supplier.get("commodity_name", "")).strip().lower()
                supplier_products = [str(p).strip().lower() for p in supplier.get("products", [])]
                
                # Verify if 'turmeric' matches 'turmeric powder' or similar
                if (product_name in supplier_commodity) or any(product_name in p for p in supplier_products):
                    product_eligible.append(supplier)
            
            # If we found exact product matches, heavily prune the generic HS-code bucket
            if product_eligible:
                suppliers = product_eligible
        
        after_product_count = len(suppliers)

        if min_capacity > 0:
            suppliers = [
                supplier
                for supplier in suppliers
                if self._supplier_capacity_value(supplier) >= min_capacity
            ]
        after_capacity_count = len(suppliers)

        destination_exact_matches = 0
        destination_filter_applied = False
        destination_filter_fallback = False
        if destination_country_norm:
            matched = []
            for supplier in suppliers:
                partner = self._normalize_country(supplier.get("main_import_partner", ""))
                if partner == destination_country_norm:
                    matched.append(supplier)
            destination_exact_matches = len(matched)
            if matched:
                suppliers = matched
                destination_filter_applied = True
            else:
                # Keep candidates when destination signal is missing/noisy.
                destination_filter_fallback = True
        after_destination_count = len(suppliers)

        report = {
            "initial_count": all_candidates,
            "final_count": len(suppliers),
            "hs_code": hs_code,
            "normalized_hs_code": normalized_hs_code,
            "max_risk": max_risk,
            "source_database": source_db_name,
            "filter_breakdown": {
                "after_risk": after_risk_count,
                "after_hs": after_hs_count,
                "after_product": after_product_count,
                "after_capacity": after_capacity_count,
                "after_destination": after_destination_count,
            },
            "destination_filter_applied": destination_filter_applied,
            "destination_filter_fallback": destination_filter_fallback,
            "destination_exact_matches": destination_exact_matches,
        }
        return suppliers, report

    def _score_supplier(
        self,
        supplier: Dict[str, Any],
        *,
        dynamic_risk: float,
        market_adjustment: float,
        weights: Dict[str, float],
    ) -> Tuple[float, Dict[str, float]]:
        reliability = self._to_float(supplier.get("reliability_score"), default=0.5)
        on_time = self._normalize(self._to_float(supplier.get("on_time_delivery_rate_percent"), default=0.0), 100.0)
        rating = self._normalize(self._to_float(supplier.get("buyer_rating"), default=0.0), 5.0)
        esg = self._normalize(self._to_float(supplier.get("esg_score"), default=0.0), 10.0)
        flexibility = self._normalize(self._to_float(supplier.get("flexibility_score"), default=0.0), 10.0)
        growth = self._normalize(self._to_float(supplier.get("export_growth_rate"), default=0.0) + 30.0, 60.0)
        avg_price = self._to_float(supplier.get("avg_unit_price_usd"), default=0.0)
        price_component = 1.0 / (1.0 + max(avg_price, 0.0) / 100.0)
        risk_component = self._normalize(10.0 - dynamic_risk, 10.0)

        base_score = (
            weights["reliability_score"] * reliability
            + weights["risk_component"] * risk_component
            + weights["delivery_component"] * on_time
            + weights["buyer_rating"] * rating
            + weights["esg_score"] * esg
            + weights["flexibility_score"] * flexibility
            + weights["growth_component"] * growth
            + weights["price_component"] * price_component
        )

        final_score = max(0.0, min(base_score + market_adjustment, 1.0))
        components = {
            "reliability_score": round(reliability, 4),
            "risk_component": round(risk_component, 4),
            "delivery_component": round(on_time, 4),
            "buyer_rating": round(rating, 4),
            "esg_score": round(esg, 4),
            "flexibility_score": round(flexibility, 4),
            "growth_component": round(growth, 4),
            "price_component": round(price_component, 4),
            "market_adjustment": round(market_adjustment, 4),
        }
        return final_score, components

    def _build_explanation(self, supplier: Dict[str, Any], dynamic_risk: float, score_components: Dict[str, float]) -> str:
        reasons: List[str] = []
        if score_components["reliability_score"] >= 0.85:
            reasons.append("high reliability")
        if score_components["delivery_component"] >= 0.85:
            reasons.append("strong on-time delivery")
        if score_components["esg_score"] >= 0.7:
            reasons.append("good ESG profile")
        if dynamic_risk <= 3.0:
            reasons.append("low dynamic risk")
        if score_components["market_adjustment"] > 0.02:
            reasons.append("positive market trend")
        return "Matched for " + ", ".join(reasons) if reasons else "Balanced supplier profile across risk, delivery, and reliability."

    async def recommend_suppliers(self, request: Dict[str, Any], top_k: int = 5) -> Dict[str, Any]:
        start_time = datetime.utcnow()

        suppliers, filter_report = await self._load_suppliers(request)
        if not suppliers:
            return {
                "success": False,
                "message": "No eligible suppliers found matching your criteria.",
                "filter_report": filter_report,
                "recommendations": [],
                "processing_time_ms": 0.0,
            }

        hs_growth = self.intelligence_agent.compute_hs_growth_index(suppliers)
        country_stability = self.intelligence_agent.compute_country_stability_index(suppliers)
        self.risk_agent.build_country_risk_baseline(suppliers)

        weights = self._resolve_weights(self._extract_buyer_preferences(request))
        ranked: List[Dict[str, Any]] = []

        for supplier in suppliers:
            dynamic_risk = self.risk_agent.dynamic_risk_adjustment(supplier)
            market_adjustment = self.intelligence_agent.supplier_market_adjustment(
                supplier, hs_growth, country_stability
            )
            final_score, components = self._score_supplier(
                supplier,
                dynamic_risk=dynamic_risk,
                market_adjustment=market_adjustment,
                weights=weights,
            )

            ranked.append(
                {
                    "supplier_id": supplier.get("supplier_id"),
                    "company_name": supplier.get("company_name"),
                    "country": supplier.get("country"),
                    "hs_code": supplier.get("hs_code"),
                    "commodity_name": supplier.get("commodity_name"),
                    "final_score": round(final_score, 4),
                    "success_rate": round(self._to_float(supplier.get("reliability_score"), default=0.0), 4),
                    "rating": round(self._to_float(supplier.get("buyer_rating"), default=0.0), 2),
                    "risk_score": round(dynamic_risk, 3),
                    "aadhaar_verified": False,
                    "kyc_verified": bool(supplier.get("certification_iso") == "Yes"),
                    "explanation": self._build_explanation(supplier, dynamic_risk, components),
                    "score_breakdown": components,
                }
            )

        ranked.sort(key=lambda item: item["final_score"], reverse=True)
        recommendations = ranked[: max(1, top_k)]
        processing_time_ms = round((datetime.utcnow() - start_time).total_seconds() * 1000, 2)

        return {
            "success": True,
            "message": "Autonomous supplier recommendations generated.",
            "recommendations": recommendations,
            "filter_report": filter_report,
            "weights_used": weights,
            "processing_time_ms": processing_time_ms,
        }

    async def record_feedback(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        db = get_database()
        if db is None:
            raise RuntimeError("Database not connected. Ensure startup event has run.")

        supplier_id = str(payload.get("supplier_id", "")).strip()
        if not supplier_id:
            return {"success": False, "message": "supplier_id is required."}

        return await self.learning_agent.record_outcome(
            db,
            supplier_id=supplier_id,
            deal_success=bool(payload.get("deal_success")),
            delivery_delay=payload.get("delivery_delay"),
            buyer_rating_after=payload.get("buyer_rating_after"),
            buyer_id=payload.get("buyer_id"),
            hs_code=payload.get("hs_code"),
        )


autonomous_matchmaker_service = AutonomousMatchmakerService()
