from typing import List, Dict, Set
from datetime import datetime
from app.models.matchmaker import ComplianceCheck, PartnerProfile

class ComplianceAgent:
    """Compliance checking agent for regulatory and sanctions screening"""
    
    def __init__(self):
        # Mock sanctions lists (in production would use real data)
        self.sanctioned_entities = set()
        self.restricted_countries = {
            "AF", "IR", "KP", "SY", "MM", "BY", "CF", "CI", "CU", 
            "ER", "IQ", "LR", "LY", "ML", "NI", "RU", "SD", "SO", "SS", "VE", "YE", "ZW"
        }
        self.export_controlled_countries = {"CN", "RU", "IR", "KP"}
        
        # High-risk industries for additional scrutiny
        self.high_risk_industries = {
            "weapons", "military", "nuclear", "chemical", "biological",
            "dual_use", "cryptocurrency", "gambling"
        }
    
    async def check_partner_compliance(
        self, partner: PartnerProfile, destination_country: str = None
    ) -> ComplianceCheck:
        """Comprehensive compliance check for a partner"""
        restrictions = []
        compliant = True
        
        # 1. Verification status check
        if partner.verification_level < 2:
            restrictions.append("Insufficient verification level")
            compliant = False
        
        # 2. Sanctions screening
        sanctions_check = await self._check_sanctions(partner)
        if not sanctions_check:
            restrictions.append("Entity appears on sanctions list")
            compliant = False
        
        # 3. Geographic restrictions
        geo_restrictions = await self._check_geographic_restrictions(
            partner, destination_country
        )
        restrictions.extend(geo_restrictions)
        
        # 4. Industry restrictions
        industry_restrictions = await self._check_industry_restrictions(partner)
        restrictions.extend(industry_restrictions)
        
        # 5. Trade history compliance
        trade_restrictions = await self._check_trade_history_compliance(partner)
        restrictions.extend(trade_restrictions)
        
        return ComplianceCheck(
            user_id=partner.user_id,
            compliant=compliant,
            restrictions=restrictions,
            sanctions_check=sanctions_check,
            last_checked=datetime.now()
        )
    
    async def check_batch_compliance(
        self, partners: List[PartnerProfile], destination_country: str = None
    ) -> Dict[str, ComplianceCheck]:
        """Check compliance for multiple partners"""
        compliance_results = {}
        
        for partner in partners:
            compliance_results[partner.user_id] = await self.check_partner_compliance(
                partner, destination_country
            )
        
        return compliance_results
    
    async def _check_sanctions(self, partner: PartnerProfile) -> bool:
        """Check if partner appears on sanctions lists"""
        # Mock implementation - would integrate with real sanctions screening APIs
        sanctioned_keywords = ["sanctioned", "blocked", "designated", "prohibited"]
        
        company_name_lower = partner.company_name.lower()
        
        for keyword in sanctioned_keywords:
            if keyword in company_name_lower:
                return False
        
        # Check against mock sanctioned entities
        if partner.company_name in self.sanctioned_entities:
            return False
        
        return True
    
    async def _check_geographic_restrictions(
        self, partner: PartnerProfile, destination_country: str = None
    ) -> List[str]:
        """Check geographic trade restrictions"""
        restrictions = []
        
        # Check if partner is in restricted country
        if partner.country in self.restricted_countries:
            restrictions.append(f"Partner located in restricted country: {partner.country}")
        
        # Check if destination is restricted
        if destination_country and destination_country in self.restricted_countries:
            restrictions.append(f"Destination country is restricted: {destination_country}")
        
        # Check export control requirements
        if destination_country in self.export_controlled_countries:
            restrictions.append(f"Export license required for: {destination_country}")
        
        return restrictions
    
    async def _check_industry_restrictions(self, partner: PartnerProfile) -> List[str]:
        """Check industry-specific restrictions"""
        restrictions = []
        
        products_text = " ".join(partner.products).lower()
        
        for industry in self.high_risk_industries:
            if industry in products_text:
                restrictions.append(f"High-risk industry detected: {industry}")
        
        return restrictions
    
    async def _check_trade_history_compliance(self, partner: PartnerProfile) -> List[str]:
        """Check trade history for compliance issues"""
        restrictions = []
        
        # Mock implementation - would analyze actual trade history
        if partner.total_trades > 0 and partner.success_rate < 0.5:
            restrictions.append("Poor trade compliance history")
        
        return restrictions
    
    async def update_sanctions_list(self, new_entities: Set[str]):
        """Update sanctions list (would be called periodically)"""
        self.sanctioned_entities.update(new_entities)
    
    async def update_restricted_countries(self, new_countries: Set[str]):
        """Update restricted countries list"""
        self.restricted_countries.update(new_countries)

# Singleton instance
compliance_agent = ComplianceAgent()
