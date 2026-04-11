"""
🔹 STEP 4: Feature Extraction Engine

This layer extracts comprehensive features for each supplier.
It transforms supplier data into feature vectors for AI scoring.
"""

from typing import List, Dict, Any, Tuple
import numpy as np
from dataclasses import dataclass
from datetime import datetime, timedelta
from sklearn.metrics.pairwise import cosine_similarity
import math

from .step1_request_parser import TradeRequest
from .step2_preprocessing_engine import PreprocessedRequest
from .step3_hard_constraints_filter import Supplier

@dataclass
class SupplierFeatures:
    """Complete feature set for a supplier"""
    supplier_id: str
    
    # Similarity features
    product_similarity: float
    description_similarity: float
    requirements_similarity: float
    overall_similarity: float
    
    # Performance features
    success_rate: float
    on_time_delivery_rate: float
    average_rating: float
    total_trades_normalized: float
    response_time_score: float
    
    # Business features
    verification_level_normalized: float
    years_in_business_normalized: float
    company_size_score: float
    capacity_utilization_score: float
    
    # Geographic features
    shipping_distance_score: float
    regional_preference_score: float
    time_zone_compatibility: float
    
    # Risk and compliance
    risk_score_normalized: float
    compliance_score: float
    
    # Quality features
    certification_match_score: float
    quality_standards_score: float
    
    # Market features
    price_competitiveness: float
    market_reputation: float
    
    # Combined feature vector
    feature_vector: np.ndarray
    
    # Feature importance weights
    feature_weights: Dict[str, float]
    
    # Metadata
    extraction_timestamp: datetime
    confidence_score: float

class SimilarityCalculator:
    """Calculates various similarity scores between request and supplier"""
    
    def __init__(self):
        self.similarity_weights = {
            'product_name': 0.4,
            'description': 0.3,
            'requirements': 0.3
        }
    
    def calculate_product_similarity(
        self, 
        request_vector: np.ndarray, 
        supplier_products: List[str],
        vectorizer
    ) -> float:
        """Calculate product name similarity"""
        if not supplier_products:
            return 0.0
        
        # Vectorize supplier products
        supplier_vectors = []
        for product in supplier_products:
            vector = vectorizer.vectorize_text(product, method='tfidf')
            supplier_vectors.append(vector)
        
        if not supplier_vectors:
            return 0.0
        
        # Calculate similarity with each product
        similarities = []
        for supplier_vector in supplier_vectors:
            try:
                # Ensure vectors have same dimensions
                if len(request_vector) == len(supplier_vector):
                    sim = cosine_similarity(
                        request_vector.reshape(1, -1),
                        supplier_vector.reshape(1, -1)
                    )[0][0]
                    similarities.append(sim)
            except:
                continue
        
        # Return maximum similarity (best matching product)
        return max(similarities) if similarities else 0.0
    
    def calculate_description_similarity(
        self, 
        request_vector: np.ndarray, 
        supplier_description: str,
        vectorizer
    ) -> float:
        """Calculate description similarity"""
        if not supplier_description:
            return 0.0
        
        supplier_vector = vectorizer.vectorize_text(supplier_description, method='tfidf')
        
        try:
            if len(request_vector) == len(supplier_vector):
                sim = cosine_similarity(
                    request_vector.reshape(1, -1),
                    supplier_vector.reshape(1, -1)
                )[0][0]
                return max(0.0, sim)  # Ensure non-negative
        except:
            pass
        
        return 0.0
    
    def calculate_requirements_similarity(
        self, 
        request_requirements: List[str],
        supplier_capabilities: List[str],
        vectorizer
    ) -> float:
        """Calculate requirements similarity"""
        if not request_requirements or not supplier_capabilities:
            return 0.0
        
        # Combine all text
        req_text = ' '.join(request_requirements)
        cap_text = ' '.join(supplier_capabilities)
        
        req_vector = vectorizer.vectorize_text(req_text, method='tfidf')
        cap_vector = vectorizer.vectorize_text(cap_text, method='tfidf')
        
        try:
            if len(req_vector) == len(cap_vector):
                sim = cosine_similarity(
                    req_vector.reshape(1, -1),
                    cap_vector.reshape(1, -1)
                )[0][0]
                return max(0.0, sim)
        except:
            pass
        
        return 0.0
    
    def calculate_overall_similarity(
        self, 
        product_sim: float, 
        desc_sim: float, 
        req_sim: float
    ) -> float:
        """Calculate weighted overall similarity"""
        return (
            self.similarity_weights['product_name'] * product_sim +
            self.similarity_weights['description'] * desc_sim +
            self.similarity_weights['requirements'] * req_sim
        )

class PerformanceExtractor:
    """Extracts performance-related features"""
    
    def extract_success_rate_feature(self, supplier: Supplier) -> float:
        """Extract and normalize success rate"""
        return supplier.success_rate  # Already 0-1 normalized
    
    def extract_delivery_rate_feature(self, supplier: Supplier) -> float:
        """Extract and normalize on-time delivery rate"""
        return supplier.on_time_delivery_rate  # Already 0-1 normalized
    
    def extract_rating_feature(self, supplier: Supplier) -> float:
        """Extract and normalize average rating"""
        # Convert 1-5 rating to 0-1 scale
        return (supplier.average_rating - 1) / 4
    
    def extract_trade_volume_feature(self, supplier: Supplier) -> float:
        """Extract normalized trade volume"""
        # Log normalization of trade count
        if supplier.total_trades == 0:
            return 0.0
        
        # Log scale: 0 trades = 0, 1000+ trades = 1
        normalized = math.log1p(supplier.total_trades) / math.log1p(1000)
        return min(1.0, normalized)
    
    def extract_response_time_feature(self, supplier: Supplier) -> float:
        """Extract response time score (lower is better)"""
        # Convert response time to score (0-48 hours = good, >48 hours = bad)
        if supplier.response_time_hours <= 12:
            return 1.0
        elif supplier.response_time_hours <= 24:
            return 0.8
        elif supplier.response_time_hours <= 48:
            return 0.6
        elif supplier.response_time_hours <= 72:
            return 0.4
        else:
            return 0.2

class BusinessExtractor:
    """Extracts business-related features"""
    
    def extract_verification_feature(self, supplier: Supplier) -> float:
        """Extract normalized verification level"""
        return supplier.verification_level / 5.0  # 0-5 scale to 0-1
    
    def extract_experience_feature(self, supplier: Supplier) -> float:
        """Extract normalized years in business"""
        # Log normalization: 0 years = 0, 50+ years = 1
        normalized = math.log1p(supplier.years_in_business) / math.log1p(50)
        return min(1.0, normalized)
    
    def extract_company_size_feature(self, supplier: Supplier) -> float:
        """Extract company size score"""
        size_scores = {
            'micro': 0.2,
            'small': 0.4,
            'medium': 0.7,
            'large': 1.0
        }
        return size_scores.get(supplier.company_size.lower(), 0.5)
    
    def extract_capacity_feature(self, supplier: Supplier, request: PreprocessedRequest) -> float:
        """Extract capacity utilization score"""
        requested_qty = request.original_request.quantity
        
        # Calculate how well the order fits supplier's capacity
        annual_capacity = supplier.production_capacity
        
        # Ideal: order is 1-10% of annual capacity
        order_percentage = (requested_qty * 12) / annual_capacity  # Annualized order
        
        if 0.01 <= order_percentage <= 0.1:
            return 1.0  # Ideal fit
        elif 0.005 <= order_percentage <= 0.2:
            return 0.8  # Good fit
        elif 0.001 <= order_percentage <= 0.5:
            return 0.6  # Acceptable fit
        else:
            return 0.3  # Poor fit (too small or too large)

class GeographicExtractor:
    """Extracts geographic-related features"""
    
    def __init__(self):
        self.regional_distances = {
            ('europe', 'europe'): 1.0,
            ('north_america', 'north_america'): 1.0,
            ('asia', 'asia'): 1.0,
            ('europe', 'north_america'): 0.7,
            ('north_america', 'europe'): 0.7,
            ('asia', 'europe'): 0.6,
            ('europe', 'asia'): 0.6,
            ('asia', 'north_america'): 0.5,
            ('north_america', 'asia'): 0.5,
            ('middle_east', 'europe'): 0.6,
            ('europe', 'middle_east'): 0.6,
            ('south_america', 'north_america'): 0.8,
            ('north_america', 'south_america'): 0.8,
        }
    
    def get_region(self, country_code: str) -> str:
        """Get region from country code"""
        regions = {
            'europe': ['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'se', 'no', 'dk', 'fi', 'gb', 'pl', 'cz'],
            'north_america': ['us', 'ca', 'mx'],
            'asia': ['cn', 'in', 'jp', 'kr', 'sg', 'th', 'vn', 'my', 'id', 'ph'],
            'middle_east': ['ae', 'sa', 'qa', 'kw', 'bh', 'om', 'il'],
            'south_america': ['br', 'ar', 'cl', 'pe', 'co', 've', 'uy', 'py'],
            'africa': ['za', 'ng', 'ke', 'eg', 'ma', 'tz', 'gh', 'tn']
        }
        
        for region, countries in regions.items():
            if country_code.lower() in countries:
                return region
        return 'unknown'
    
    def extract_distance_feature(self, supplier: Supplier, request: PreprocessedRequest) -> float:
        """Extract shipping distance score"""
        supplier_region = self.get_region(supplier.country)
        dest_region = self.get_region(request.original_request.destination_country)
        
        if supplier_region == 'unknown' or dest_region == 'unknown':
            return 0.5  # Default score
        
        # Get distance score from predefined matrix
        distance_score = self.regional_distances.get(
            (supplier_region, dest_region), 0.3
        )
        
        return distance_score
    
    def extract_regional_preference_feature(self, supplier: Supplier, request: PreprocessedRequest) -> float:
        """Extract regional preference score"""
        # Preference for suppliers in same or nearby regions
        supplier_region = self.get_region(supplier.country)
        dest_region = self.get_region(request.original_request.destination_country)
        
        if supplier_region == dest_region:
            return 1.0  # Same region - highest preference
        elif supplier_region in ['europe', 'north_america'] and dest_region in ['europe', 'north_america']:
            return 0.8  # Major trade corridors
        else:
            return 0.5  # Different regions
    
    def extract_timezone_feature(self, supplier: Supplier, request: PreprocessedRequest) -> float:
        """Extract time zone compatibility score"""
        # Simplified timezone calculation
        timezones = {
            'europe': 1, 'north_america': 0, 'asia': 8, 'middle_east': 4,
            'south_america': -3, 'africa': 2
        }
        
        supplier_tz = timezones.get(self.get_region(supplier.country), 0)
        dest_tz = timezones.get(self.get_region(request.original_request.destination_country), 0)
        
        # Calculate time difference (absolute)
        time_diff = abs(supplier_tz - dest_tz)
        
        # Convert to compatibility score (0-12 hours = good, >12 hours = poor)
        if time_diff <= 2:
            return 1.0
        elif time_diff <= 6:
            return 0.8
        elif time_diff <= 12:
            return 0.6
        else:
            return 0.4

class QualityExtractor:
    """Extracts quality-related features"""
    
    def extract_certification_match_feature(
        self, 
        supplier: Supplier, 
        request: PreprocessedRequest
    ) -> float:
        """Extract certification match score"""
        required_certs = [cert.lower() for cert in request.original_request.certifications_required]
        supplier_certs = [cert.lower() for cert in supplier.certifications]
        
        if not required_certs:
            return 1.0  # No requirements = full score
        
        if not supplier_certs:
            return 0.0  # No certifications = no score
        
        # Calculate match percentage
        matches = 0
        for req_cert in required_certs:
            for sup_cert in supplier_certs:
                if req_cert in sup_cert or sup_cert in req_cert:
                    matches += 1
                    break
        
        return matches / len(required_certs)
    
    def extract_quality_standards_feature(self, supplier: Supplier) -> float:
        """Extract quality standards score"""
        # High-quality standards get higher scores
        high_quality_standards = ['iso 9001', 'gmp', 'haccp', 'fssc 22000', 'brc']
        medium_quality_standards = ['iso 22000', 'halal', 'kosher']
        
        supplier_standards = [std.lower() for std in supplier.quality_standards]
        
        score = 0.0
        for std in supplier_standards:
            if std in high_quality_standards:
                score += 0.3
            elif std in medium_quality_standards:
                score += 0.2
            else:
                score += 0.1
        
        return min(1.0, score)

class FeatureExtractionEngine:
    """
    🔹 STEP 4: Feature Extraction Engine
    
    Orchestrates extraction of all features for suppliers.
    Creates comprehensive feature vectors for AI scoring.
    """
    
    def __init__(self):
        self.similarity_calculator = SimilarityCalculator()
        self.performance_extractor = PerformanceExtractor()
        self.business_extractor = BusinessExtractor()
        self.geographic_extractor = GeographicExtractor()
        self.quality_extractor = QualityExtractor()
        
        # Feature importance weights
        self.feature_weights = {
            'similarity': 0.30,
            'performance': 0.25,
            'business': 0.20,
            'geographic': 0.15,
            'quality': 0.10
        }
        
        # Extraction statistics
        self.extraction_stats = {
            "total_suppliers_processed": 0,
            "avg_extraction_time_ms": 0,
            "feature_dimensions": 0,
            "confidence_distribution": {"high": 0, "medium": 0, "low": 0}
        }
    
    def extract_supplier_features(
        self, 
        supplier: Supplier, 
        request: PreprocessedRequest,
        vectorizer
    ) -> SupplierFeatures:
        """
        Extract complete feature set for a supplier
        
        Args:
            supplier: Supplier data
            request: Preprocessed trade request
            vectorizer: Text vectorization engine
            
        Returns:
            SupplierFeatures: Complete feature set
        """
        start_time = datetime.now()
        
        # 1. Similarity features
        product_similarity = self.similarity_calculator.calculate_product_similarity(
            request.combined_text_vector, supplier.products, vectorizer
        )
        
        description_similarity = self.similarity_calculator.calculate_description_similarity(
            request.combined_text_vector, 
            f"{' '.join(supplier.products)} {' '.join(supplier.categories)}",
            vectorizer
        )
        
        requirements_similarity = self.similarity_calculator.calculate_requirements_similarity(
            request.original_request.special_requirements,
            supplier.quality_standards + supplier.certifications,
            vectorizer
        )
        
        overall_similarity = self.similarity_calculator.calculate_overall_similarity(
            product_similarity, description_similarity, requirements_similarity
        )
        
        # 2. Performance features
        success_rate = self.performance_extractor.extract_success_rate_feature(supplier)
        delivery_rate = self.performance_extractor.extract_delivery_rate_feature(supplier)
        rating = self.performance_extractor.extract_rating_feature(supplier)
        trade_volume = self.performance_extractor.extract_trade_volume_feature(supplier)
        response_time = self.performance_extractor.extract_response_time_feature(supplier)
        
        # 3. Business features
        verification = self.business_extractor.extract_verification_feature(supplier)
        experience = self.business_extractor.extract_experience_feature(supplier)
        company_size = self.business_extractor.extract_company_size_feature(supplier)
        capacity = self.business_extractor.extract_capacity_feature(supplier, request)
        
        # 4. Geographic features
        distance = self.geographic_extractor.extract_distance_feature(supplier, request)
        regional = self.geographic_extractor.extract_regional_preference_feature(supplier, request)
        timezone = self.geographic_extractor.extract_timezone_feature(supplier, request)
        
        # 5. Risk and compliance features
        risk_normalized = 1 - supplier.risk_score  # Invert risk score (lower risk = higher score)
        compliance_score = 1.0 if supplier.compliance_status == 'compliant' else 0.0
        
        # 6. Quality features
        cert_match = self.quality_extractor.extract_certification_match_feature(supplier, request)
        quality_standards = self.quality_extractor.extract_quality_standards_feature(supplier)
        
        # 7. Market features (mock for now)
        price_competitiveness = 0.7  # Would come from market data
        market_reputation = supplier.average_rating / 5.0  # Normalized rating
        
        # 8. Create feature vector
        feature_vector = np.array([
            # Similarity features (4)
            product_similarity, description_similarity, requirements_similarity, overall_similarity,
            # Performance features (5)
            success_rate, delivery_rate, rating, trade_volume, response_time,
            # Business features (4)
            verification, experience, company_size, capacity,
            # Geographic features (3)
            distance, regional, timezone,
            # Risk features (2)
            risk_normalized, compliance_score,
            # Quality features (2)
            cert_match, quality_standards,
            # Market features (2)
            price_competitiveness, market_reputation
        ])
        
        # 9. Calculate confidence score
        confidence = self._calculate_confidence_score(
            overall_similarity, success_rate, verification, trade_volume
        )
        
        # 10. Create feature object
        features = SupplierFeatures(
            supplier_id=supplier.supplier_id,
            # Similarity features
            product_similarity=product_similarity,
            description_similarity=description_similarity,
            requirements_similarity=requirements_similarity,
            overall_similarity=overall_similarity,
            # Performance features
            success_rate=success_rate,
            on_time_delivery_rate=delivery_rate,
            average_rating=rating,
            total_trades_normalized=trade_volume,
            response_time_score=response_time,
            # Business features
            verification_level_normalized=verification,
            years_in_business_normalized=experience,
            company_size_score=company_size,
            capacity_utilization_score=capacity,
            # Geographic features
            shipping_distance_score=distance,
            regional_preference_score=regional,
            time_zone_compatibility=timezone,
            # Risk and compliance
            risk_score_normalized=risk_normalized,
            compliance_score=compliance_score,
            # Quality features
            certification_match_score=cert_match,
            quality_standards_score=quality_standards,
            # Market features
            price_competitiveness=price_competitiveness,
            market_reputation=market_reputation,
            # Combined data
            feature_vector=feature_vector,
            feature_weights=self.feature_weights,
            extraction_timestamp=datetime.now(),
            confidence_score=confidence
        )
        
        # Update statistics
        extraction_time = (datetime.now() - start_time).total_seconds() * 1000
        self.extraction_stats["total_suppliers_processed"] += 1
        self.extraction_stats["avg_extraction_time_ms"] = (
            (self.extraction_stats["avg_extraction_time_ms"] * 
             (self.extraction_stats["total_suppliers_processed"] - 1) + 
             extraction_time) / self.extraction_stats["total_suppliers_processed"]
        )
        self.extraction_stats["feature_dimensions"] = len(feature_vector)
        
        # Update confidence distribution
        if confidence >= 0.8:
            self.extraction_stats["confidence_distribution"]["high"] += 1
        elif confidence >= 0.5:
            self.extraction_stats["confidence_distribution"]["medium"] += 1
        else:
            self.extraction_stats["confidence_distribution"]["low"] += 1
        
        return features
    
    def extract_batch_features(
        self, 
        suppliers: List[Supplier], 
        request: PreprocessedRequest,
        vectorizer
    ) -> List[SupplierFeatures]:
        """Extract features for multiple suppliers"""
        features_list = []
        
        print(f"🔍 Extracting features for {len(suppliers)} suppliers...")
        
        for supplier in suppliers:
            try:
                features = self.extract_supplier_features(supplier, request, vectorizer)
                features_list.append(features)
            except Exception as e:
                print(f"⚠️  Error extracting features for {supplier.supplier_id}: {e}")
                continue
        
        print(f"✅ Extracted features for {len(features_list)} suppliers")
        print(f"   Feature dimensions: {len(features_list[0].feature_vector) if features_list else 0}")
        
        return features_list
    
    def _calculate_confidence_score(
        self, 
        similarity: float, 
        success_rate: float, 
        verification: float, 
        trade_volume: float
    ) -> float:
        """Calculate confidence score for feature extraction"""
        # Weighted combination of key indicators
        confidence = (
            0.3 * similarity +
            0.3 * success_rate +
            0.2 * verification +
            0.2 * trade_volume
        )
        
        return max(0.0, min(1.0, confidence))
    
    def get_extraction_stats(self) -> Dict[str, Any]:
        """Get extraction statistics"""
        return self.extraction_stats.copy()
    
    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance weights"""
        return self.feature_weights.copy()

# Example Usage
if __name__ == "__main__":
    from .step1_request_parser import TradeRequestParser
    from step2_preprocessing_engine import PreprocessingEngine
    from .step3_hard_constraints_filter import Supplier, HardConstraintsFilter
    
    # Initialize components
    parser = TradeRequestParser()
    preprocessor = PreprocessingEngine()
    filter_engine = HardConstraintsFilter()
    feature_engine = FeatureExtractionEngine()
    
    # Sample data
    raw_request = {
        "user_id": "user_123",
        "product_name": "Organic Turmeric Powder",
        "product_description": "Premium quality organic turmeric powder",
        "hs_code": "091030",
        "quantity": 5000,
        "unit": "kg",
        "destination_country": "Germany",
        "delivery_deadline": "2026-05-01",
        "budget_max": 12000,
        "certifications_required": ["Organic", "FDA Approved"]
    }
    
    sample_supplier = Supplier(
        supplier_id="sup_001",
        company_name="Global Spices Ltd",
        country="IN",
        business_type="exporter",
        hs_codes=["091030", "091020"],
        products=["Turmeric Powder", "Curry Powder"],
        categories=["Spices"],
        production_capacity=50000,
        capacity_unit="kg/year",
        min_order_quantity=100,
        delivery_countries=["DE", "FR", "IT", "US"],
        verification_level=4,
        certifications=["Organic", "FDA Approved", "ISO 9001"],
        quality_standards=["GMP", "HACCP"],
        total_trades=150,
        success_rate=0.95,
        on_time_delivery_rate=0.92,
        average_rating=4.7,
        years_in_business=15,
        company_size="medium",
        response_time_hours=12,
        risk_score=0.15,
        compliance_status="compliant",
        last_updated=datetime.now(),
        active=True
    )
    
    try:
        # Step 1: Parse
        trade_request = parser.parse_request(raw_request)
        
        # Step 2: Preprocess
        preprocessed = preprocessor.preprocess_request(trade_request)
        
        # Step 3: Filter (single supplier passes)
        eligible_suppliers, _ = filter_engine.filter_suppliers([sample_supplier], preprocessed)
        
        if eligible_suppliers:
            # Step 4: Extract features
            features = feature_engine.extract_supplier_features(
                eligible_suppliers[0], preprocessed, preprocessor.vectorizer
            )
            
            print(f"\n📊 Feature Extraction Results:")
            print(f"   Supplier: {features.supplier_id}")
            print(f"   Overall similarity: {features.overall_similarity:.3f}")
            print(f"   Success rate: {features.success_rate:.3f}")
            print(f"   Verification score: {features.verification_level_normalized:.3f}")
            print(f"   Geographic score: {features.shipping_distance_score:.3f}")
            print(f"   Confidence score: {features.confidence_score:.3f}")
            print(f"   Feature vector length: {len(features.feature_vector)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
