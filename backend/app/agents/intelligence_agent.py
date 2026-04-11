from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, Iterable, Tuple


class IntelligenceAgent:
    """
    Generates market-aware adjustments from supplier corpus trends.
    This is a lightweight analytics layer that can later be replaced by
    a dedicated forecasting pipeline.
    """

    @staticmethod
    def _to_float(value: Any, default: float = 0.0) -> float:
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def compute_hs_growth_index(self, suppliers: Iterable[Dict[str, Any]]) -> Dict[str, float]:
        """Returns normalized growth index per HS code in range [-1, 1]."""
        grouped: Dict[str, Tuple[float, int]] = defaultdict(lambda: (0.0, 0))

        for supplier in suppliers:
            hs_code = str(supplier.get("hs_code", "")).strip()
            if not hs_code:
                continue
            growth = self._to_float(supplier.get("export_growth_rate"), default=0.0)
            total, count = grouped[hs_code]
            grouped[hs_code] = (total + growth, count + 1)

        avg_by_hs: Dict[str, float] = {
            hs_code: total / max(count, 1)
            for hs_code, (total, count) in grouped.items()
        }
        if not avg_by_hs:
            return {}

        min_growth = min(avg_by_hs.values())
        max_growth = max(avg_by_hs.values())
        spread = max(max_growth - min_growth, 1e-6)

        # 0..1 normalize then map to -1..1
        return {
            hs_code: ((value - min_growth) / spread) * 2.0 - 1.0
            for hs_code, value in avg_by_hs.items()
        }

    def compute_country_stability_index(self, suppliers: Iterable[Dict[str, Any]]) -> Dict[str, float]:
        """
        Country trend metric in range [0, 1], where 1 is most stable.
        Uses dispute rate and currency volatility as proxies.
        """
        grouped: Dict[str, Dict[str, float]] = defaultdict(lambda: {"dispute": 0.0, "volatility": 0.0, "count": 0.0})

        for supplier in suppliers:
            country = str(supplier.get("country", "")).strip().lower()
            if not country:
                continue
            grouped[country]["dispute"] += self._to_float(supplier.get("dispute_rate_percent"), default=0.0)
            grouped[country]["volatility"] += self._to_float(supplier.get("currency_volatility"), default=0.0)
            grouped[country]["count"] += 1.0

        if not grouped:
            return {}

        raw_scores: Dict[str, float] = {}
        for country, metrics in grouped.items():
            count = max(metrics["count"], 1.0)
            avg_dispute = metrics["dispute"] / count
            avg_volatility = metrics["volatility"] / count
            raw_scores[country] = max(0.0, 100.0 - (avg_dispute * 8.0 + avg_volatility * 4.0))

        lo = min(raw_scores.values())
        hi = max(raw_scores.values())
        spread = max(hi - lo, 1e-6)
        return {country: (score - lo) / spread for country, score in raw_scores.items()}

    def supplier_market_adjustment(
        self,
        supplier: Dict[str, Any],
        hs_growth_index: Dict[str, float],
        country_stability_index: Dict[str, float],
    ) -> float:
        """
        Returns adjustment in approximately [-0.08, +0.08].
        Positive for high-growth HS and stable countries.
        """
        hs_code = str(supplier.get("hs_code", "")).strip()
        country = str(supplier.get("country", "")).strip().lower()

        hs_factor = hs_growth_index.get(hs_code, 0.0)
        country_factor = country_stability_index.get(country, 0.5) - 0.5
        return hs_factor * 0.05 + country_factor * 0.06
