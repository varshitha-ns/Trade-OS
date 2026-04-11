from typing import List, Dict, Optional
from datetime import datetime
import asyncio
from math import sqrt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.models.matchmaker import (
    TradeRequest, PartnerProfile, TrustScore, SimilarityScore,
    RiskAssessment, ComplianceCheck, MatchRecommendation,
    MatchResult, UserRole
)
from app.database import get_database
from app.services.risk_agent import risk_agent
from app.services.compliance_agent import compliance_agent

class MatchmakerAgent:
    def __init__(self):
        self.db = get_database()
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
    async def find_matches(self, trade_request: TradeRequest) -> MatchResult:
        """Main matching orchestration method"""
        start_time = datetime.now()
        
        # Phase 1: Rule-based filtering
        eligible_partners = await self._rule_based_filtering(trade_request)
        
        # FALLBACK: If no partners found, try relaxed filtering
        if not eligible_partners:
            print("DEBUG: No eligible partners in strict filtering, attempting relaxed filtering...")
            eligible_partners = await self._relaxed_filtering(trade_request)
        
        print(f"DEBUG: Processing {len(eligible_partners)} eligible partners")
        
        if not eligible_partners:
            # Return empty results if still no partners
            print("DEBUG: No partners found even with relaxed filtering")
            return MatchResult(
                trade_request_id=trade_request.id,
                recommendations=[],
                total_candidates_evaluated=0,
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
                created_at=datetime.now()
            )
        
        # Phase 2: Calculate trust scores
        trust_scores = await self._calculate_trust_scores(eligible_partners)
        
        # Phase 3: Calculate similarity scores
        similarity_scores = await self._calculate_similarity_scores(
            trade_request, eligible_partners
        )
        
        # Phase 4: Risk assessment (mock for now)
        risk_scores = await self._assess_risks(eligible_partners)
        
        # Phase 5: Compliance check (mock for now)
        compliance_results = await self._check_compliance(
            eligible_partners, trade_request.destination_country
        )
        
        # Phase 6: Generate final recommendations
        recommendations = await self._generate_recommendations(
            eligible_partners, trust_scores, similarity_scores, 
            risk_scores, compliance_results, trade_request
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        return MatchResult(
            trade_request_id=trade_request.request_id,  # Use request_id instead of id
            recommendations=recommendations,
            total_candidates_evaluated=len(eligible_partners),
            processing_time_ms=processing_time,
            created_at=datetime.now()
        )
    
    async def _rule_based_filtering(self, request: TradeRequest) -> List[PartnerProfile]:
        """Phase 1: Basic rule-based filtering using suppliers_master data"""
        partners = []
        filtered_count = 0
        
        # Get all eligible suppliers from suppliers_master collection
        cursor = self.db.suppliers_master.find({
            "category": {"$exists": True},  # Has category data
            "reliability_score": {"$gte": 0.7}  # Lower threshold
        })
        
        async for supplier_doc in cursor:
            filtered_count += 1
            try:
                # Convert CSV data to PartnerProfile
                partner = PartnerProfile(
                    user_id=supplier_doc.get("supplier_id", ""),
                    company_name=supplier_doc.get("company_name", ""),
                    role=UserRole.SUPPLIER,
                    country=supplier_doc.get("country", ""),
                    hs_codes=[str(supplier_doc.get("hs_code", ""))],  # Ensure HS code is string
                    products=[supplier_doc.get("commodity_name", "")],
                    capacity=float(supplier_doc.get("production_capacity_monthly", supplier_doc.get("estimated_capacity", 1000))) * 100,  # Higher baseline
                    unit="kg",  # CSV data is in kg
                    delivery_countries=[],  # Can be expanded based on trade history
                    certifications=[],  # Extract from cert fields
                    verification_level=self._extract_verification_level(supplier_doc),
                    rating=float(supplier_doc.get("buyer_rating", 3.0)),
                    total_trades=int(supplier_doc.get("total_export_quantity", 0)),  # Mock total trades
                    success_rate=float(supplier_doc.get("on_time_delivery_rate_percent", 85.0)) / 100.0,
                    on_time_delivery_rate=float(supplier_doc.get("on_time_delivery_rate_percent", 85.0)) / 100.0,
                    average_response_time_hours=float(supplier_doc.get("avg_lead_time_days", 7)) * 24,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                # Extract certifications
                certifications = []
                if supplier_doc.get("certification_iso") == "Yes":
                    certifications.append("ISO 9001")
                if supplier_doc.get("certification_haccp") == "Yes":
                    certifications.append("HACCP")
                if supplier_doc.get("certification_fda") == "Yes":
                    certifications.append("FDA")
                partner.certifications = certifications
                
                # Apply filtering rules
                if self._meets_basic_criteria(partner, request):
                    partners.append(partner)
                    
            except Exception as e:
                print(f"Error processing supplier {supplier_doc.get('supplier_id')}: {e}")
                continue
        
        print(f"DEBUG: Filtered {filtered_count} suppliers, found {len(partners)} eligible")
        return partners
    
    def _extract_verification_level(self, supplier_doc: dict) -> int:
        """Extract verification level (1-5) based on supplier attributes"""
        level = 2  # Base level
        
        # Add points for certifications
        if supplier_doc.get("certification_iso") == "Yes":
            level += 1
        if supplier_doc.get("certification_haccp") == "Yes":
            level += 1
        if supplier_doc.get("certification_fda") == "Yes":
            level += 0.5
        
        # Add points for years in business
        years = float(supplier_doc.get("years_in_business", 1))
        if years > 20:
            level += 1
        elif years > 10:
            level += 0.5
        
        # Add points for reliability score
        reliability = float(supplier_doc.get("reliability_score", 0.5))
        if reliability > 0.9:
            level += 0.5
        
        return min(int(level), 5)  # Cap at 5
    
    def _meets_basic_criteria(self, partner: PartnerProfile, request: TradeRequest) -> bool:
        """Check if partner meets basic requirements"""
        # PRIORITY filtering rules (keep it simple for CSV data matching)
        
        # Rule 1: Check reliability score (must be reasonable)
        # Skip this - will be handled in trust scoring
        
        # Rule 2: Product category must match (if available)
        # This is handled at the database query level (category filter)
        
        # Rule 3: Verification level - prefer verified suppliers but don't block unverified
        if partner.verification_level < 1:  # Must have minimum verification
            return False
        
        # Rule 4: Basic capacity check (allow some flexibility)
        # CSV provides estimated_capacity, we converted it
        if partner.capacity and partner.capacity > 0:
            # Allow 90% of request quantity as minimum acceptable
            if partner.capacity < (request.quantity * 0.5):
                print(f"   ❌ {partner.company_name}: Capacity too low ({partner.capacity} < {request.quantity * 0.5})")
                return False  # Too small
        
        # Rule 5: HS code matching (lenient - allow similar categories)
        if request.hs_code and partner.hs_codes:
            request_hs = str(request.hs_code).strip()
            
            # Check for exact match or prefix match (first 4 digits)
            exact_match = any(str(code).strip() == request_hs for code in partner.hs_codes)
            prefix_match = any(str(code).strip().startswith(request_hs[:4]) for code in partner.hs_codes)
            
            if not (exact_match or prefix_match):
                # Allow if HS codes are in same general category (first 2 digits)
                category_match = any(str(code).strip().startswith(request_hs[:2]) for code in partner.hs_codes)
                if not category_match:
                    print(f"   ❌ {partner.company_name}: HS code mismatch (req: {request_hs}, has: {partner.hs_codes})")
                    return False
        
        # Rule 6: Country filter (optional - allow international trade)
        # Don't filter by country - this is international trade
        
        print(f"   ✅ {partner.company_name}: ELIGIBLE (Capacity: {partner.capacity}, HS: {partner.hs_codes})")
        return True
    
    async def _relaxed_filtering(self, request: TradeRequest) -> List[PartnerProfile]:
        """Fallback filtering with relaxed criteria when strict filtering returns nothing"""
        partners = []
        
        # Get all suppliers with any reasonable reliability score
        cursor = self.db.suppliers_master.find({
            "reliability_score": {"$gte": 0.5}  # Even lower threshold
        }).sort("reliability_score", -1).limit(100)  # Get top 100 by reliability
        
        async for supplier_doc in cursor:
            try:
                # Convert CSV data to PartnerProfile
                partner = PartnerProfile(
                    user_id=supplier_doc.get("supplier_id", ""),
                    company_name=supplier_doc.get("company_name", ""),
                    role=UserRole.SUPPLIER,
                    country=supplier_doc.get("country", ""),
                    hs_codes=[str(supplier_doc.get("hs_code", ""))],  # Ensure HS code is string
                    products=[supplier_doc.get("commodity_name", "")],
                    capacity=float(supplier_doc.get("production_capacity_monthly", supplier_doc.get("estimated_capacity", 1000))) * 100,
                    unit="kg",
                    delivery_countries=[],
                    certifications=[],
                    verification_level=self._extract_verification_level(supplier_doc),
                    rating=float(supplier_doc.get("buyer_rating", 3.0)),
                    total_trades=int(supplier_doc.get("total_export_quantity", 0)),
                    success_rate=float(supplier_doc.get("on_time_delivery_rate_percent", 85.0)) / 100.0,
                    on_time_delivery_rate=float(supplier_doc.get("on_time_delivery_rate_percent", 85.0)) / 100.0,
                    average_response_time_hours=float(supplier_doc.get("avg_lead_time_days", 7)) * 24,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                # Extract certifications
                certifications = []
                if supplier_doc.get("certification_iso") == "Yes":
                    certifications.append("ISO 9001")
                if supplier_doc.get("certification_haccp") == "Yes":
                    certifications.append("HACCP")
                if supplier_doc.get("certification_fda") == "Yes":
                    certifications.append("FDA")
                partner.certifications = certifications
                
                # Just check minimum verification
                if partner.verification_level >= 1:
                    partners.append(partner)
                    if len(partners) >= 20:  # Get at least 20 partners
                        break
                    
            except Exception as e:
                print(f"Error in relaxed filtering: {e}")
                continue
        
        print(f"DEBUG: Relaxed filtering found {len(partners)} partners")
        return partners
    
    async def _calculate_trust_scores(self, partners: List[PartnerProfile]) -> Dict[str, TrustScore]:
        """Phase 2: Calculate trust scores for all partners"""
        trust_scores = {}
        
        for partner in partners:
            # Trust Score Formula:
            # (0.4 × Success Rate) + (0.2 × On-time Delivery Rate) + 
            # (0.2 × Average Rating) + (0.2 × Verification Level)
            
            success_rate = partner.success_rate or 0.5  # Default 50%
            on_time_rate = partner.on_time_delivery_rate or 0.5  # Default 50%
            rating = partner.rating or 3.0  # Default 3.0/5.0
            verification_score = partner.verification_level / 5.0  # Normalize to 0-1
            
            total_score = (
                0.4 * success_rate +
                0.2 * on_time_rate +
                0.2 * (rating / 5.0) +  # Normalize rating to 0-1
                0.2 * verification_score
            )
            
            trust_scores[partner.user_id] = TrustScore(
                user_id=partner.user_id,
                total_score=total_score,
                calculated_at=datetime.now()
            )
        
        return trust_scores
    
    async def _calculate_similarity_scores(
        self, request: TradeRequest, partners: List[PartnerProfile]
    ) -> Dict[str, SimilarityScore]:
        """Phase 3: Calculate similarity scores using TF-IDF and cosine similarity"""
        similarity_scores = {}
        
        # Prepare text data for TF-IDF
        # Handle both model types (from step1_request_parser and models/matchmaker)
        quality_reqs = getattr(request, 'quality_requirements', [])
        cert_reqs = getattr(request, 'certifications_required', [])
        requirements = getattr(request, 'requirements', [])
        
        all_reqs = quality_reqs + cert_reqs + requirements
        request_text = f"{request.product_name} {getattr(request, 'product_description', '')} {' '.join(all_reqs)}"
        partner_texts = []
        
        for partner in partners:
            partner_text = f"{' '.join(partner.products)} {partner.company_name}"
            partner_texts.append(partner_text)
        
        if not partner_texts:
            return similarity_scores
        
        # Calculate TF-IDF vectors
        all_texts = [request_text] + partner_texts
        try:
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(all_texts)
            
            # Calculate cosine similarity
            request_vector = tfidf_matrix[0:1]
            partner_vectors = tfidf_matrix[1:]
            
            similarities = cosine_similarity(request_vector, partner_vectors).flatten()
            
            # Create similarity scores
            for i, partner in enumerate(partners):
                similarity_score = similarities[i]
                
                # Additional matching factors
                matching_factors = {
                    "text_similarity": float(similarity_score),
                    "product_relevance": self._calculate_product_relevance(partner, request),
                    "geographic_relevance": self._calculate_geographic_relevance(partner, request)
                }
                
                similarity_scores[partner.user_id] = SimilarityScore(
                    user_id=partner.user_id,
                    similarity_score=float(similarity_score),
                    matching_factors=matching_factors
                )
                
        except Exception as e:
            print(f"Error calculating similarity scores: {e}")
            # Fallback to basic matching
            for partner in partners:
                similarity_scores[partner.user_id] = SimilarityScore(
                    user_id=partner.user_id,
                    similarity_score=0.5,  # Default similarity
                    matching_factors={}
                )
        
        return similarity_scores
    
    def _calculate_product_relevance(self, partner: PartnerProfile, request: TradeRequest) -> float:
        """Calculate product relevance score"""
        if not partner.products:
            return 0.0
        
        # Simple keyword matching
        request_keywords = set(request.product_name.lower().split())
        partner_keywords = set(' '.join(partner.products).lower().split())
        
        if not request_keywords:
            return 0.0
        
        intersection = request_keywords.intersection(partner_keywords)
        return len(intersection) / len(request_keywords)
    
    def _calculate_geographic_relevance(self, partner: PartnerProfile, request: TradeRequest) -> float:
        """Calculate geographic relevance score"""
        # Simple scoring based on regional proximity (mock implementation)
        # In real implementation, this would use actual geographic data
        return 0.5  # Default geographic relevance
    
    async def _assess_risks(self, partners: List[PartnerProfile]) -> Dict[str, RiskAssessment]:
        """Phase 4: Assess risks for all partners using Risk Agent"""
        return await risk_agent.assess_batch_risk(partners)
    
    async def _check_compliance(
        self, partners: List[PartnerProfile], destination_country: str
    ) -> Dict[str, ComplianceCheck]:
        """Phase 5: Check compliance for all partners using Compliance Agent"""
        return await compliance_agent.check_batch_compliance(partners, destination_country)
    
    async def _generate_recommendations(
        self,
        partners: List[PartnerProfile],
        trust_scores: Dict[str, TrustScore],
        similarity_scores: Dict[str, SimilarityScore],
        risk_scores: Dict[str, RiskAssessment],
        compliance_results: Dict[str, ComplianceCheck],
        request: TradeRequest
    ) -> List[MatchRecommendation]:
        """Phase 6: Generate final recommendations with overall scoring"""
        recommendations = []
        
        for partner in partners:
            # Get scores
            trust_score = trust_scores.get(partner.user_id, TrustScore(user_id=partner.user_id, total_score=0.7, calculated_at=datetime.now()))
            similarity_score = similarity_scores.get(partner.user_id, SimilarityScore(user_id=partner.user_id, similarity_score=0.5))
            # Compliance check is optional (use default values if missing)
            compliance = compliance_results.get(partner.user_id)
            is_compliant = compliance.compliant if compliance else True  # Default to compliant if not checked
            
            # Skip only if explicitly non-compliant
            if compliance and not is_compliant:
                print(f"   ⏭️  {partner.company_name}: Skipped (non-compliant)")
                continue
            
            # Fix: Default RiskAssessment must include `last_assessed`
            risk_score = risk_scores.get(partner.user_id, RiskAssessment(user_id=partner.user_id, risk_score=0.3, last_assessed=datetime.now()))
            
            # Calculate overall score (weighted combination)
            overall_score = (
                0.4 * (trust_score.total_score or 0.7) +
                0.3 * (similarity_score.similarity_score or 0.5) +
                0.2 * (1 - (risk_score.risk_score or 0.3)) +  # Invert risk score (lower risk = higher score)
                0.1  # Compliance bonus (fixed 0.1 for all)
            )
            
            # Generate match reasons and concerns
            match_reasons = []
            concerns = []
            recommended_actions = []
            
            # Trust-based reasons
            trust_val = trust_score.total_score or 0.7
            if trust_val > 0.8:
                match_reasons.append("High trust score with excellent track record")
            elif trust_val > 0.6:
                match_reasons.append("Good trust score and reliable history")
            elif trust_val > 0.4:
                match_reasons.append("Acceptable trust score")
            
            # Similarity-based reasons
            sim_val = similarity_score.similarity_score or 0.5
            if sim_val > 0.7:
                match_reasons.append("Strong product and requirements match")
            elif sim_val > 0.5:
                match_reasons.append("Decent product match")
            
            # Risk-based concerns  
            risk_val = risk_score.risk_score or 0.3
            if risk_val > 0.7:
                concerns.append("High risk factors detected")
                recommended_actions.append("Proceed with caution and extensive verification")
            elif risk_val > 0.5:
                concerns.append("Moderate risk factors detected")
                recommended_actions.append("Verify credentials and start with smaller orders")
            
            # Capacity-based reasons
            if partner.capacity and partner.capacity > 0:
                if partner.capacity >= request.quantity * 2:
                    match_reasons.append("Sufficient capacity for your requirements")
                elif partner.capacity >= request.quantity:
                    match_reasons.append("Adequate production capacity for order")
                else:
                    concerns.append("Limited production capacity")
                    recommended_actions.append("May need to negotiate smaller batches")
            
            # Experience-based reasons
            total_trades = partner.total_trades or 0
            if total_trades > 100:
                match_reasons.append("Extensive trade experience")
            elif total_trades > 50:
                match_reasons.append("Strong trade history")
            elif total_trades < 5:
                concerns.append("Limited trade history")
                recommended_actions.append("Consider additional verification")
            
            recommendation = MatchRecommendation(
                partner_id=partner.user_id,
                trust_score=trust_score.total_score or 0.7,
                similarity_score=similarity_score.similarity_score or 0.5,
                risk_score=risk_score.risk_score or 0.3,
                overall_score=max(0, min(1, overall_score)),  # Clamp between 0 and 1
                match_reasons=match_reasons if match_reasons else ["Supplier match found"],
                concerns=concerns,
                recommended_actions=recommended_actions if recommended_actions else ["Contact for more information"]
            )
            
            recommendations.append(recommendation)
        
        # Sort by overall score (descending)
        recommendations.sort(key=lambda x: x.overall_score, reverse=True)
        
        # Return top 10 recommendations
        return recommendations[:10]

# Singleton instance
matchmaker_agent = MatchmakerAgent()
