from typing import List, Dict
from datetime import datetime
from app.models.matchmaker import RiskAssessment, PartnerProfile

class RiskAgent:
    """Risk assessment agent for evaluating partner risks"""
    
    def __init__(self):
        self.risk_factors = {
            "low_trade_volume": 0.2,
            "low_rating": 0.3,
            "low_success_rate": 0.2,
            "high_response_time": 0.1,
            "new_partner": 0.15,
            "geographic_risk": 0.1
        }
    
    async def assess_partner_risk(self, partner: PartnerProfile) -> RiskAssessment:
        """Comprehensive risk assessment for a partner"""
        risk_score = 0.0
        risk_factors = []
        
        # 1. Trade volume risk
        if partner.total_trades < 5:
            risk_score += self.risk_factors["low_trade_volume"]
            risk_factors.append("Low trade volume (< 5 trades)")
        elif partner.total_trades < 20:
            risk_score += self.risk_factors["low_trade_volume"] * 0.5
            risk_factors.append("Limited trade history (< 20 trades)")
        
        # 2. Rating risk
        if partner.rating < 3.0:
            risk_score += self.risk_factors["low_rating"]
            risk_factors.append("Low rating (< 3.0)")
        elif partner.rating < 4.0:
            risk_score += self.risk_factors["low_rating"] * 0.5
            risk_factors.append("Moderate rating (< 4.0)")
        
        # 3. Success rate risk
        if partner.success_rate < 0.7:
            risk_score += self.risk_factors["low_success_rate"]
            risk_factors.append("Low success rate (< 70%)")
        elif partner.success_rate < 0.85:
            risk_score += self.risk_factors["low_success_rate"] * 0.5
            risk_factors.append("Moderate success rate (< 85%)")
        
        # 4. Response time risk
        if partner.average_response_time_hours > 72:
            risk_score += self.risk_factors["high_response_time"]
            risk_factors.append("Slow response time (> 72 hours)")
        elif partner.average_response_time_hours > 48:
            risk_score += self.risk_factors["high_response_time"] * 0.5
            risk_factors.append("Moderate response time (> 48 hours)")
        
        # 5. New partner risk
        days_since_creation = (datetime.now() - partner.created_at).days
        if days_since_creation < 30:
            risk_score += self.risk_factors["new_partner"]
            risk_factors.append("New partner (< 30 days)")
        elif days_since_creation < 90:
            risk_score += self.risk_factors["new_partner"] * 0.5
            risk_factors.append("Recent partner (< 90 days)")
        
        # 6. Geographic risk (simplified - would use real risk data)
        high_risk_countries = ["AF", "IR", "KP", "SY", "MM"]  # Example high-risk countries
        if partner.country in high_risk_countries:
            risk_score += self.risk_factors["geographic_risk"]
            risk_factors.append(f"High-risk country: {partner.country}")
        
        # Cap risk score at 1.0
        risk_score = min(risk_score, 1.0)
        
        return RiskAssessment(
            user_id=partner.user_id,
            risk_score=risk_score,
            risk_factors=risk_factors,
            last_assessed=datetime.now()
        )
    
    async def assess_batch_risk(self, partners: List[PartnerProfile]) -> Dict[str, RiskAssessment]:
        """Assess risk for multiple partners"""
        risk_assessments = {}
        
        for partner in partners:
            risk_assessments[partner.user_id] = await self.assess_partner_risk(partner)
        
        return risk_assessments
    
    def get_risk_level(self, risk_score: float) -> str:
        """Get risk level category from score"""
        if risk_score < 0.2:
            return "LOW"
        elif risk_score < 0.5:
            return "MEDIUM"
        elif risk_score < 0.8:
            return "HIGH"
        else:
            return "CRITICAL"

# Singleton instance
risk_agent = RiskAgent()
