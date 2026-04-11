"""
🔹 STEP 5: Trust Score Calculator (Core Brain)

This is the core intelligence of the Matchmaker Agent.
It calculates the final trust score using the exact formula:
Final Score = 0.30 × Similarity + 0.25 × Success Rate + 0.20 × On-time Rate + 0.15 × Rating + 0.10 × (1 - Risk)
"""

from typing import List, Dict, Any, Tuple
import numpy as np
from dataclasses import dataclass
from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import pickle
import os

from .step4_feature_extraction import SupplierFeatures

@dataclass
class TrustScoreResult:
    """Complete trust score calculation result"""
    supplier_id: str
    
    # Component scores
    similarity_score: float
    success_rate_score: float
    on_time_delivery_score: float
    rating_score: float
    risk_score: float
    
    # Weighted components
    weighted_similarity: float
    weighted_success_rate: float
    weighted_on_time_delivery: float
    weighted_rating: float
    weighted_risk: float
    
    # Final scores
    trust_score_classic: float  # Classic formula
    trust_score_ml: float       # ML-enhanced (if available)
    final_trust_score: float    # Final selected score
    
    # Confidence and metadata
    confidence_level: float    # How confident we are in this score
    calculation_method: str     # 'classic', 'ml', or 'hybrid'
    feature_importance: Dict[str, float]
    
    # Breakdown for explanation
    score_breakdown: Dict[str, Any]
    
    # Processing metadata
    calculated_at: datetime
    processing_time_ms: float

class ClassicTrustCalculator:
    """
    Classic trust score calculation using the exact formula:
    Final Score = 0.30 × Similarity + 0.25 × Success Rate + 0.20 × On-time Rate + 0.15 × Rating + 0.10 × (1 - Risk)
    """
    
    def __init__(self):
        # Exact weights as specified
        self.weights = {
            'similarity': 0.30,
            'success_rate': 0.25,
            'on_time_delivery': 0.20,
            'rating': 0.15,
            'risk': 0.10
        }
        
        self.calculation_stats = {
            "total_calculations": 0,
            "avg_score": 0.0,
            "score_distribution": {"high": 0, "medium": 0, "low": 0},
            "processing_time_ms": 0.0
        }
    
    def calculate_trust_score(self, features: SupplierFeatures) -> Tuple[float, Dict[str, Any]]:
        """
        Calculate trust score using classic formula
        
        Args:
            features: Extracted supplier features
            
        Returns:
            Tuple[float, Dict]: (trust_score, breakdown)
        """
        start_time = datetime.now()
        
        # Extract component scores
        similarity = features.overall_similarity
        success_rate = features.success_rate
        on_time_delivery = features.on_time_delivery_rate
        rating = features.average_rating
        risk = 1 - features.risk_score_normalized  # Convert back to risk score
        
        # Calculate weighted components
        weighted_similarity = self.weights['similarity'] * similarity
        weighted_success_rate = self.weights['success_rate'] * success_rate
        weighted_on_time_delivery = self.weights['on_time_delivery'] * on_time_delivery
        weighted_rating = self.weights['rating'] * rating
        weighted_risk = self.weights['risk'] * risk
        
        # Calculate final trust score
        trust_score = (
            weighted_similarity +
            weighted_success_rate +
            weighted_on_time_delivery +
            weighted_rating +
            weighted_risk
        )
        
        # Create breakdown for explanation
        breakdown = {
            'components': {
                'similarity': {
                    'raw_score': similarity,
                    'weight': self.weights['similarity'],
                    'weighted_score': weighted_similarity,
                    'contribution_percent': (weighted_similarity / trust_score) * 100 if trust_score > 0 else 0
                },
                'success_rate': {
                    'raw_score': success_rate,
                    'weight': self.weights['success_rate'],
                    'weighted_score': weighted_success_rate,
                    'contribution_percent': (weighted_success_rate / trust_score) * 100 if trust_score > 0 else 0
                },
                'on_time_delivery': {
                    'raw_score': on_time_delivery,
                    'weight': self.weights['on_time_delivery'],
                    'weighted_score': weighted_on_time_delivery,
                    'contribution_percent': (weighted_on_time_delivery / trust_score) * 100 if trust_score > 0 else 0
                },
                'rating': {
                    'raw_score': rating,
                    'weight': self.weights['rating'],
                    'weighted_score': weighted_rating,
                    'contribution_percent': (weighted_rating / trust_score) * 100 if trust_score > 0 else 0
                },
                'risk': {
                    'raw_score': risk,
                    'weight': self.weights['risk'],
                    'weighted_score': weighted_risk,
                    'contribution_percent': (weighted_risk / trust_score) * 100 if trust_score > 0 else 0
                }
            },
            'final_score': trust_score,
            'score_category': self._categorize_score(trust_score)
        }
        
        # Update statistics
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        self.calculation_stats["total_calculations"] += 1
        self.calculation_stats["avg_score"] = (
            (self.calculation_stats["avg_score"] * (self.calculation_stats["total_calculations"] - 1) + 
             trust_score) / self.calculation_stats["total_calculations"]
        )
        self.calculation_stats["processing_time_ms"] = processing_time
        
        # Update score distribution
        category = self._categorize_score(trust_score)
        self.calculation_stats["score_distribution"][category] += 1
        
        return trust_score, breakdown
    
    def _categorize_score(self, score: float) -> str:
        """Categorize trust score"""
        if score >= 0.8:
            return "high"
        elif score >= 0.6:
            return "medium"
        else:
            return "low"

class MLTrustCalculator:
    """
    Machine Learning enhanced trust score calculator
    Learns from historical data to improve scoring accuracy
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_columns = [
            'overall_similarity', 'success_rate', 'on_time_delivery_rate', 
            'average_rating', 'risk_score_normalized', 'total_trades_normalized',
            'verification_level_normalized', 'years_in_business_normalized',
            'certification_match_score', 'quality_standards_score'
        ]
        
        self.is_trained = False
        self.training_stats = {
            "samples_trained": 0,
            "training_accuracy": 0.0,
            "feature_importance": {},
            "last_trained": None
        }
    
    def train_model(self, training_data: List[Dict[str, Any]]):
        """
        Train the ML model on historical data
        
        Args:
            training_data: List of historical supplier performance data
        """
        if len(training_data) < 100:
            print("⚠️  Insufficient training data (need at least 100 samples)")
            return
        
        print(f"🧠 Training ML trust calculator on {len(training_data)} samples...")
        
        # Prepare training data
        X = []
        y = []
        
        for data in training_data:
            # Extract features
            features = []
            for col in self.feature_columns:
                features.append(data.get(col, 0.0))
            X.append(features)
            
            # Target variable (actual success outcome)
            y.append(data.get('actual_success_rate', 0.5))
        
        X = np.array(X)
        y = np.array(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train model
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        
        self.model.fit(X_scaled, y)
        
        # Update training stats
        self.is_trained = True
        self.training_stats["samples_trained"] = len(training_data)
        self.training_stats["training_accuracy"] = self.model.score(X_scaled, y)
        self.training_stats["feature_importance"] = dict(zip(
            self.feature_columns, 
            self.model.feature_importances_
        ))
        self.training_stats["last_trained"] = datetime.now()
        
        print(f"✅ ML model trained successfully")
        print(f"   Training accuracy: {self.training_stats['training_accuracy']:.3f}")
        print(f"   Top features: {sorted(self.training_stats['feature_importance'].items(), key=lambda x: x[1], reverse=True)[:3]}")
    
    def calculate_ml_score(self, features: SupplierFeatures) -> Tuple[float, float]:
        """
        Calculate ML-enhanced trust score
        
        Args:
            features: Supplier features
            
        Returns:
            Tuple[float, float]: (ml_score, confidence)
        """
        if not self.is_trained:
            return 0.5, 0.0  # Default score if not trained
        
        # Extract features for ML model
        feature_values = []
        for col in self.feature_columns:
            value = getattr(features, col, 0.0)
            feature_values.append(value)
        
        # Scale features
        X_scaled = self.scaler.transform([feature_values])
        
        # Predict
        ml_score = self.model.predict(X_scaled)[0]
        ml_score = max(0.0, min(1.0, ml_score))  # Ensure 0-1 range
        
        # Calculate confidence based on prediction variance
        confidence = self._calculate_prediction_confidence(features)
        
        return ml_score, confidence
    
    def _calculate_prediction_confidence(self, features: SupplierFeatures) -> float:
        """Calculate confidence in ML prediction"""
        # Base confidence on data quality and similarity to training data
        confidence_factors = [
            features.confidence_score,  # Feature extraction confidence
            features.total_trades_normalized,  # Data availability
            features.verification_level_normalized  # Verification level
        ]
        
        # Average confidence
        confidence = np.mean(confidence_factors)
        return max(0.0, min(1.0, confidence))
    
    def save_model(self, filepath: str):
        """Save trained model"""
        if self.is_trained:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'feature_columns': self.feature_columns,
                'training_stats': self.training_stats
            }
            with open(filepath, 'wb') as f:
                pickle.dump(model_data, f)
            print(f"💾 ML model saved to {filepath}")
    
    def load_model(self, filepath: str):
        """Load trained model"""
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                model_data = pickle.load(f)
            
            self.model = model_data['model']
            self.scaler = model_data['scaler']
            self.feature_columns = model_data['feature_columns']
            self.training_stats = model_data['training_stats']
            self.is_trained = True
            
            print(f"📂 ML model loaded from {filepath}")
        else:
            print(f"⚠️  Model file not found: {filepath}")

class HybridTrustCalculator:
    """
    Hybrid calculator that combines classic and ML approaches
    """
    
    def __init__(self):
        self.classic_calculator = ClassicTrustCalculator()
        self.ml_calculator = MLTrustCalculator()
        
        self.hybrid_weights = {
            'classic': 0.7,  # Prefer classic for stability
            'ml': 0.3        # Use ML for enhancement
        }
        
        self.hybrid_stats = {
            "total_calculations": 0,
            "classic_dominant": 0,
            "ml_dominant": 0,
            "hybrid_cases": 0
        }
    
    def calculate_hybrid_score(self, features: SupplierFeatures) -> TrustScoreResult:
        """
        Calculate hybrid trust score combining classic and ML approaches
        
        Args:
            features: Supplier features
            
        Returns:
            TrustScoreResult: Complete trust score result
        """
        start_time = datetime.now()
        
        # Calculate classic score
        classic_score, classic_breakdown = self.classic_calculator.calculate_trust_score(features)
        
        # Calculate ML score (if available)
        ml_score = 0.5
        ml_confidence = 0.0
        if self.ml_calculator.is_trained:
            ml_score, ml_confidence = self.ml_calculator.calculate_ml_score(features)
        
        # Determine final score and method
        if ml_confidence > 0.8 and self.ml_calculator.is_trained:
            # High confidence in ML - use ML-dominant approach
            final_score = (
                self.hybrid_weights['ml'] * ml_score + 
                self.hybrid_weights['classic'] * classic_score
            )
            method = "ml_dominant"
            self.hybrid_stats["ml_dominant"] += 1
        elif ml_confidence > 0.5 and self.ml_calculator.is_trained:
            # Medium confidence - use balanced hybrid
            final_score = (classic_score + ml_score) / 2
            method = "hybrid"
            self.hybrid_stats["hybrid_cases"] += 1
        else:
            # Low confidence or no ML model - use classic
            final_score = classic_score
            method = "classic"
            self.hybrid_stats["classic_dominant"] += 1
        
        # Calculate overall confidence
        overall_confidence = self._calculate_overall_confidence(
            classic_score, ml_score, ml_confidence, features.confidence_score
        )
        
        # Create result object
        result = TrustScoreResult(
            supplier_id=features.supplier_id,
            
            # Component scores
            similarity_score=features.overall_similarity,
            success_rate_score=features.success_rate,
            on_time_delivery_score=features.on_time_delivery_rate,
            rating_score=features.average_rating,
            risk_score=1 - features.risk_score_normalized,
            
            # Weighted components (from classic calculation)
            weighted_similarity=classic_breakdown['components']['similarity']['weighted_score'],
            weighted_success_rate=classic_breakdown['components']['success_rate']['weighted_score'],
            weighted_on_time_delivery=classic_breakdown['components']['on_time_delivery']['weighted_score'],
            weighted_rating=classic_breakdown['components']['rating']['weighted_score'],
            weighted_risk=classic_breakdown['components']['risk']['weighted_score'],
            
            # Final scores
            trust_score_classic=classic_score,
            trust_score_ml=ml_score,
            final_trust_score=final_score,
            
            # Confidence and metadata
            confidence_level=overall_confidence,
            calculation_method=method,
            feature_importance=self.ml_calculator.training_stats['feature_importance'] if self.ml_calculator.is_trained else {},
            
            # Breakdown for explanation
            score_breakdown={
                'classic': classic_breakdown,
                'ml': {
                    'score': ml_score,
                    'confidence': ml_confidence,
                    'available': self.ml_calculator.is_trained
                },
                'hybrid': {
                    'final_score': final_score,
                    'method': method,
                    'weights_used': self.hybrid_weights if method == "hybrid" else None
                }
            },
            
            # Processing metadata
            calculated_at=datetime.now(),
            processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
        )
        
        # Update statistics
        self.hybrid_stats["total_calculations"] += 1
        
        return result
    
    def _calculate_overall_confidence(
        self, 
        classic_score: float, 
        ml_score: float, 
        ml_confidence: float, 
        feature_confidence: float
    ) -> float:
        """Calculate overall confidence in the final score"""
        
        # Base confidence from feature extraction
        base_confidence = feature_confidence
        
        # Boost confidence if classic and ML scores agree
        score_agreement = 1.0 - abs(classic_score - ml_score)
        
        # Combine factors
        overall_confidence = (
            0.5 * base_confidence +
            0.3 * score_agreement +
            0.2 * ml_confidence
        )
        
        return max(0.0, min(1.0, overall_confidence))

class TrustScoreCalculator:
    """
    🔹 STEP 5: Trust Score Calculator (Core Brain)
    
    Main orchestrator for trust score calculation.
    Uses the exact formula: Final Score = 0.30 × Similarity + 0.25 × Success Rate + 0.20 × On-time Rate + 0.15 × Rating + 0.10 × (1 - Risk)
    """
    
    def __init__(self):
        self.hybrid_calculator = HybridTrustCalculator()
        
        # Overall statistics
        self.calculation_stats = {
            "total_suppliers_scored": 0,
            "avg_trust_score": 0.0,
            "high_confidence_scores": 0,
            "processing_time_ms": 0.0
        }
    
    def calculate_trust_scores(self, features_list: List[SupplierFeatures]) -> List[TrustScoreResult]:
        """
        Calculate trust scores for multiple suppliers
        
        Args:
            features_list: List of supplier features
            
        Returns:
            List[TrustScoreResult]: Trust score results for all suppliers
        """
        print(f"🧠 Calculating trust scores for {len(features_list)} suppliers...")
        
        results = []
        start_time = datetime.now()
        
        for features in features_list:
            try:
                result = self.hybrid_calculator.calculate_hybrid_score(features)
                results.append(result)
            except Exception as e:
                print(f"⚠️  Error calculating trust score for {features.supplier_id}: {e}")
                continue
        
        # Update statistics
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        self.calculation_stats["total_suppliers_scored"] += len(results)
        self.calculation_stats["processing_time_ms"] = processing_time
        
        if results:
            avg_score = np.mean([r.final_trust_score for r in results])
            self.calculation_stats["avg_trust_score"] = (
                (self.calculation_stats["avg_trust_score"] * 
                 (self.calculation_stats["total_suppliers_scored"] - len(results)) + 
                 avg_score * len(results)) / 
                self.calculation_stats["total_suppliers_scored"]
            )
            
            high_confidence_count = sum(1 for r in results if r.confidence_level >= 0.8)
            self.calculation_stats["high_confidence_scores"] += high_confidence_count
        
        print(f"✅ Trust score calculation completed:")
        print(f"   Average score: {self.calculation_stats['avg_trust_score']:.3f}")
        print(f"   Processing time: {processing_time:.2f}ms")
        print(f"   High confidence scores: {high_confidence_count}/{len(results)}")
        
        return results
    
    def train_ml_model(self, historical_data: List[Dict[str, Any]]):
        """Train the ML component with historical data"""
        self.hybrid_calculator.ml_calculator.train_model(historical_data)
    
    def save_models(self, model_dir: str):
        """Save trained models"""
        os.makedirs(model_dir, exist_ok=True)
        
        # Save ML model
        ml_model_path = os.path.join(model_dir, "trust_ml_model.pkl")
        self.hybrid_calculator.ml_calculator.save_model(ml_model_path)
    
    def load_models(self, model_dir: str):
        """Load trained models"""
        # Load ML model
        ml_model_path = os.path.join(model_dir, "trust_ml_model.pkl")
        self.hybrid_calculator.ml_calculator.load_model(ml_model_path)
    
    def get_calculation_stats(self) -> Dict[str, Any]:
        """Get comprehensive calculation statistics"""
        stats = self.calculation_stats.copy()
        stats["hybrid_stats"] = self.hybrid_calculator.hybrid_stats.copy()
        stats["classic_stats"] = self.hybrid_calculator.classic_calculator.calculation_stats.copy()
        stats["ml_stats"] = self.hybrid_calculator.ml_calculator.training_stats.copy()
        return stats

# Example Usage
if __name__ == "__main__":
    from .step4_feature_extraction import SupplierFeatures, FeatureExtractionEngine
    import numpy as np
    
    # Create calculator
    calculator = TrustScoreCalculator()
    
    # Create sample features
    sample_features = SupplierFeatures(
        supplier_id="sup_001",
        product_similarity=0.89,
        description_similarity=0.75,
        requirements_similarity=0.92,
        overall_similarity=0.85,
        success_rate=0.95,
        on_time_delivery_rate=0.92,
        average_rating=0.94,  # Normalized 0-1
        total_trades_normalized=0.8,
        response_time_score=0.9,
        verification_level_normalized=0.8,
        years_in_business_normalized=0.7,
        company_size_score=0.7,
        capacity_utilization_score=0.8,
        shipping_distance_score=0.7,
        regional_preference_score=0.8,
        time_zone_compatibility=0.6,
        risk_score_normalized=0.85,  # Low risk = high score
        compliance_score=1.0,
        certification_match_score=1.0,
        quality_standards_score=0.8,
        price_competitiveness=0.7,
        market_reputation=0.94,
        feature_vector=np.random.rand(22),
        feature_weights={},
        extraction_timestamp=datetime.now(),
        confidence_score=0.85
    )
    
    try:
        # Calculate trust score
        result = calculator.calculate_trust_scores([sample_features])[0]
        
        print(f"\n🧠 Trust Score Calculation Results:")
        print(f"   Supplier: {result.supplier_id}")
        print(f"   Final Trust Score: {result.final_trust_score:.3f}")
        print(f"   Method: {result.calculation_method}")
        print(f"   Confidence: {result.confidence_level:.3f}")
        print(f"   Processing time: {result.processing_time_ms:.2f}ms")
        
        print(f"\n📊 Component Breakdown:")
        print(f"   Similarity (30%): {result.similarity_score:.3f} → {result.weighted_similarity:.3f}")
        print(f"   Success Rate (25%): {result.success_rate_score:.3f} → {result.weighted_success_rate:.3f}")
        print(f"   On-time Delivery (20%): {result.on_time_delivery_score:.3f} → {result.weighted_on_time_delivery:.3f}")
        print(f"   Rating (15%): {result.rating_score:.3f} → {result.weighted_rating:.3f}")
        print(f"   Risk (10%): {result.risk_score:.3f} → {result.weighted_risk:.3f}")
        
        print(f"\n🎯 Score Category: {result.score_breakdown['classic']['final_score_category']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
