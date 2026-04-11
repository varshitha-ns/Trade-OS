"""
🔹 STEP 6: ML Adjustment Layer (Collaborative Filtering)

This layer applies machine learning adjustments to the trust scores.
It uses collaborative filtering, matrix factorization, and gradient boosting
to learn from historical user behavior and improve rankings.
"""

from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import pandas as pd
from dataclasses import dataclass
from datetime import datetime, timedelta
from sklearn.decomposition import NMF
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os

from .step5_trust_score_calculator import TrustScoreResult

@dataclass
class MLAdjustmentResult:
    """Result of ML adjustment to trust scores"""
    supplier_id: str
    
    # Original and adjusted scores
    original_trust_score: float
    adjusted_trust_score: float
    adjustment_delta: float
    
    # ML insights
    collaborative_boost: float
    behavioral_adjustment: float
    market_trend_adjustment: float
    
    # Similarity information
    similar_buyers_score: float
    similar_products_score: float
    seasonal_adjustment: float
    
    # Confidence and reasoning
    adjustment_confidence: float
    adjustment_reasons: List[str]
    
    # Metadata
    adjusted_at: datetime
    ml_model_version: str

class CollaborativeFiltering:
    """
    Collaborative filtering based on similar buyers' preferences
    """
    
    def __init__(self):
        self.user_item_matrix = None  # Users (buyers) x Items (suppliers)
        self.supplier_features = {}
        self.user_profiles = {}
        
        self.nmf_model = NMF(n_components=50, random_state=42)
        self.is_trained = False
        
        self.training_stats = {
            "total_interactions": 0,
            "unique_users": 0,
            "unique_suppliers": 0,
            "reconstruction_error": 0.0,
            "last_trained": None
        }
    
    def train(self, interactions: List[Dict[str, Any]]):
        """
        Train collaborative filtering model on user interactions
        
        Args:
            interactions: List of {user_id, supplier_id, rating, outcome}
        """
        if len(interactions) < 100:
            print("⚠️  Insufficient interaction data for collaborative filtering")
            return
        
        print(f"🤝 Training collaborative filtering on {len(interactions)} interactions...")
        
        # Create user-item matrix
        df = pd.DataFrame(interactions)
        
        # Get unique users and suppliers
        users = df['user_id'].unique()
        suppliers = df['supplier_id'].unique()
        
        self.training_stats["unique_users"] = len(users)
        self.training_stats["unique_suppliers"] = len(suppliers)
        self.training_stats["total_interactions"] = len(interactions)
        
        # Create mappings
        self.user_to_idx = {user: idx for idx, user in enumerate(users)}
        self.supplier_to_idx = {supplier: idx for idx, supplier in enumerate(suppliers)}
        self.idx_to_supplier = {idx: supplier for supplier, idx in self.supplier_to_idx.items()}
        
        # Initialize matrix
        matrix = np.zeros((len(users), len(suppliers)))
        
        # Fill matrix with ratings/outcomes
        for _, row in df.iterrows():
            user_idx = self.user_to_idx[row['user_id']]
            supplier_idx = self.supplier_to_idx[row['supplier_id']]
            
            # Use outcome (success/failure) or rating as the value
            value = row.get('outcome', row.get('rating', 0.5))
            matrix[user_idx, supplier_idx] = value
        
        # Train NMF model
        try:
            W = self.nmf_model.fit_transform(matrix)
            H = self.nmf_model.components_
            
            # Reconstruct matrix
            reconstructed = np.dot(W, H)
            self.user_item_matrix = reconstructed
            
            # Calculate reconstruction error
            error = np.linalg.norm(matrix - reconstructed, 'fro') / np.linalg.norm(matrix, 'fro')
            self.training_stats["reconstruction_error"] = error
            self.training_stats["last_trained"] = datetime.now()
            
            self.is_trained = True
            
            print(f"✅ Collaborative filtering trained:")
            print(f"   Users: {len(users)}, Suppliers: {len(suppliers)}")
            print(f"   Reconstruction error: {error:.4f}")
            
        except Exception as e:
            print(f"❌ Error training collaborative filtering: {e}")
    
    def predict_supplier_preference(self, user_id: str, supplier_id: str) -> float:
        """
        Predict how much a user would prefer a supplier
        
        Args:
            user_id: User identifier
            supplier_id: Supplier identifier
            
        Returns:
            float: Predicted preference score (0-1)
        """
        if not self.is_trained:
            return 0.5  # Default prediction
        
        if user_id not in self.user_to_idx or supplier_id not in self.supplier_to_idx:
            return 0.5
        
        user_idx = self.user_to_idx[user_id]
        supplier_idx = self.supplier_to_idx[supplier_id]
        
        predicted_score = self.user_item_matrix[user_idx, supplier_idx]
        return max(0.0, min(1.0, predicted_score))
    
    def find_similar_users(self, user_id: str, top_k: int = 10) -> List[str]:
        """Find users with similar preferences"""
        if not self.is_trained or user_id not in self.user_to_idx:
            return []
        
        user_idx = self.user_to_idx[user_id]
        user_vector = self.user_item_matrix[user_idx, :]
        
        # Calculate similarities
        similarities = []
        for other_user_idx in range(self.user_item_matrix.shape[0]):
            if other_user_idx == user_idx:
                continue
            
            other_vector = self.user_item_matrix[other_user_idx, :]
            similarity = cosine_similarity(
                user_vector.reshape(1, -1),
                other_vector.reshape(1, -1)
            )[0][0]
            
            similarities.append((similarity, other_user_idx))
        
        # Sort by similarity and return top-k
        similarities.sort(reverse=True)
        similar_users = []
        
        for similarity, other_user_idx in similarities[:top_k]:
            # Find user ID from index (reverse mapping)
            for uid, idx in self.user_to_idx.items():
                if idx == other_user_idx:
                    similar_users.append(uid)
                    break
        
        return similar_users

class BehavioralAdjustment:
    """
    Adjusts scores based on behavioral patterns and trends
    """
    
    def __init__(self):
        self.behavior_patterns = {}
        self.trend_models = {}
        
        self.behavior_stats = {
            "patterns_detected": 0,
            "trend_accuracy": 0.0,
            "last_updated": None
        }
    
    def analyze_user_behavior(self, user_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze user's historical behavior patterns
        
        Args:
            user_history: List of user's past interactions
            
        Returns:
            Dict: Behavior analysis results
        """
        if not user_history:
            return {"pattern": "new_user", "confidence": 0.0}
        
        # Analyze patterns
        patterns = {
            "prefers_verified": 0,
            "prefers_local": 0,
            "price_sensitive": 0,
            "quality_focused": 0,
            "risk_averse": 0
        }
        
        for interaction in user_history:
            # Check verification preference
            if interaction.get('supplier_verification', 0) >= 3:
                patterns["prefers_verified"] += 1
            
            # Check geographic preference
            if interaction.get('same_continent', False):
                patterns["prefers_local"] += 1
            
            # Check price sensitivity
            if interaction.get('price_comparison', False):
                patterns["price_sensitive"] += 1
            
            # Check quality focus
            if interaction.get('certifications_required', []):
                patterns["quality_focused"] += 1
            
            # Check risk aversion
            if interaction.get('supplier_risk_score', 0.5) < 0.3:
                patterns["risk_averse"] += 1
        
        # Normalize patterns
        total_interactions = len(user_history)
        for key in patterns:
            patterns[key] = patterns[key] / total_interactions
        
        # Identify dominant pattern
        dominant_pattern = max(patterns, key=patterns.get)
        confidence = patterns[dominant_pattern]
        
        return {
            "pattern": dominant_pattern,
            "confidence": confidence,
            "all_patterns": patterns
        }
    
    def calculate_behavioral_adjustment(
        self, 
        user_behavior: Dict[str, Any], 
        supplier_features: Dict[str, Any]
    ) -> Tuple[float, List[str]]:
        """
        Calculate behavioral adjustment score
        
        Args:
            user_behavior: User behavior analysis
            supplier_features: Supplier feature data
            
        Returns:
            Tuple[float, List[str]: (adjustment_score, reasoning)
        """
        adjustment = 0.0
        reasoning = []
        
        pattern = user_behavior.get("pattern", "new_user")
        confidence = user_behavior.get("confidence", 0.0)
        
        if pattern == "prefers_verified" and supplier_features.get("verification_level", 0) >= 3:
            adjustment += 0.1 * confidence
            reasoning.append("High verification level matches user preference")
        
        if pattern == "prefers_local" and supplier_features.get("same_continent", False):
            adjustment += 0.08 * confidence
            reasoning.append("Local supplier matches geographic preference")
        
        if pattern == "quality_focused" and supplier_features.get("certification_count", 0) >= 2:
            adjustment += 0.12 * confidence
            reasoning.append("Quality certifications match user focus")
        
        if pattern == "risk_averse" and supplier_features.get("risk_score", 0.5) < 0.2:
            adjustment += 0.15 * confidence
            reasoning.append("Low risk matches risk-averse behavior")
        
        return max(-0.2, min(0.2, adjustment)), reasoning

class MarketTrendAdjustment:
    """
    Adjusts scores based on market trends and seasonality
    """
    
    def __init__(self):
        self.market_trends = {}
        self.seasonal_patterns = {}
        
        self.trend_stats = {
            "trends_tracked": 0,
            "seasonal_patterns": 0,
            "last_updated": None
        }
    
    def analyze_market_trends(self, market_data: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Analyze current market trends
        
        Args:
            market_data: Recent market data and transactions
            
        Returns:
            Dict: Trend scores by category
        """
        trends = {}
        
        # Analyze by product category
        category_demand = {}
        for data in market_data:
            category = data.get("product_category", "other")
            demand = data.get("demand_score", 0.5)
            
            if category not in category_demand:
                category_demand[category] = []
            category_demand[category].append(demand)
        
        # Calculate trend scores
        for category, demands in category_demand.items():
            if demands:
                trends[category] = np.mean(demands)
            else:
                trends[category] = 0.5
        
        self.market_trends = trends
        self.trend_stats["trends_tracked"] = len(trends)
        self.trend_stats["last_updated"] = datetime.now()
        
        return trends
    
    def calculate_seasonal_adjustment(
        self, 
        product_category: str, 
        destination_country: str
    ) -> Tuple[float, str]:
        """
        Calculate seasonal adjustment for product/category
        
        Args:
            product_category: Product category
            destination_country: Destination country
            
        Returns:
            Tuple[float, str]: (adjustment, reasoning)
        """
        # Simplified seasonal patterns (would use real data in production)
        seasonal_patterns = {
            ("Spices", "US"): (0.1, "Winter spice season in US"),
            ("Spices", "DE"): (0.05, "Stable spice demand in Germany"),
            ("Coffee", "US"): (0.08, "Fall coffee season"),
            ("Coffee", "DE"): (0.12, "Winter coffee season in Germany"),
        }
        
        key = (product_category, destination_country)
        if key in seasonal_patterns:
            return seasonal_patterns[key]
        
        # Default seasonal adjustment based on hemisphere
        northern_hemisphere = ["US", "DE", "FR", "IT", "GB", "CA"]
        if destination_country in northern_hemisphere:
            current_month = datetime.now().month
            if current_month in [11, 12, 1, 2]:  # Winter months
                return 0.05, "Winter season demand"
            elif current_month in [6, 7, 8]:  # Summer months
                return -0.03, "Summer slowdown"
        
        return 0.0, "No significant seasonal effect"

class MLAdjustmentLayer:
    """
    🔹 STEP 6: ML Adjustment Layer (Collaborative Filtering)
    
    Applies machine learning adjustments to trust scores using:
    1. Collaborative filtering from similar users
    2. Behavioral pattern analysis
    3. Market trend adjustments
    4. Seasonal variations
    """
    
    def __init__(self):
        self.collaborative_filter = CollaborativeFiltering()
        self.behavioral_adjustment = BehavioralAdjustment()
        self.market_trend_adjustment = MarketTrendAdjustment()
        
        # Gradient boosting model for final adjustment
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42
        )
        
        self.is_trained = False
        self.model_version = "1.0"
        
        # Adjustment statistics
        self.adjustment_stats = {
            "total_adjustments": 0,
            "avg_adjustment_delta": 0.0,
            "positive_adjustments": 0,
            "negative_adjustments": 0,
            "avg_confidence": 0.0
        }
    
    def train_models(
        self, 
        interaction_data: List[Dict[str, Any]], 
        market_data: List[Dict[str, Any]]
    ):
        """
        Train all ML models
        
        Args:
            interaction_data: Historical user interactions
            market_data: Market trend data
        """
        print(f"🧠 Training ML adjustment models...")
        
        # Train collaborative filtering
        self.collaborative_filter.train(interaction_data)
        
        # Analyze market trends
        self.market_trend_adjustment.analyze_market_trends(market_data)
        
        # Train gradient boosting model if enough data
        if len(interaction_data) >= 500:
            self._train_gradient_boosting(interaction_data)
        
        self.is_trained = True
        print(f"✅ ML adjustment models trained")
    
    def _train_gradient_boosting(self, interaction_data: List[Dict[str, Any]]):
        """Train gradient boosting model for final adjustments"""
        # Prepare training data
        X = []
        y = []
        
        for interaction in interaction_data:
            # Extract features
            features = [
                interaction.get('trust_score', 0.5),
                interaction.get('collaborative_score', 0.5),
                interaction.get('behavioral_score', 0.5),
                interaction.get('trend_score', 0.5),
                interaction.get('user_history_length', 0),
                interaction.get('supplier_experience', 0.5),
                interaction.get('price_competitiveness', 0.5)
            ]
            X.append(features)
            
            # Target: actual outcome/success
            y.append(interaction.get('actual_success', 0.5))
        
        if len(X) >= 100:  # Minimum samples for training
            X = np.array(X)
            y = np.array(y)
            
            self.gb_model.fit(X, y)
            print(f"   Gradient boosting model trained on {len(X)} samples")
    
    def adjust_trust_scores(
        self, 
        trust_results: List[TrustScoreResult],
        user_id: str,
        request_context: Dict[str, Any]
    ) -> List[MLAdjustmentResult]:
        """
        Apply ML adjustments to trust scores
        
        Args:
            trust_results: Original trust score results
            user_id: Current user ID
            request_context: Request context information
            
        Returns:
            List[MLAdjustmentResult]: Adjusted trust score results
        """
        print(f"🔧 Applying ML adjustments to {len(trust_results)} suppliers...")
        
        adjusted_results = []
        
        for result in trust_results:
            try:
                adjusted_result = self._adjust_single_score(
                    result, user_id, request_context
                )
                adjusted_results.append(adjusted_result)
            except Exception as e:
                print(f"⚠️  Error adjusting score for {result.supplier_id}: {e}")
                # Create unadjusted result
                adjusted_results.append(MLAdjustmentResult(
                    supplier_id=result.supplier_id,
                    original_trust_score=result.final_trust_score,
                    adjusted_trust_score=result.final_trust_score,
                    adjustment_delta=0.0,
                    collaborative_boost=0.0,
                    behavioral_adjustment=0.0,
                    market_trend_adjustment=0.0,
                    similar_buyers_score=0.0,
                    similar_products_score=0.0,
                    seasonal_adjustment=0.0,
                    adjustment_confidence=0.0,
                    adjustment_reasons=["ML adjustment failed"],
                    adjusted_at=datetime.now(),
                    ml_model_version=self.model_version
                ))
        
        # Update statistics
        self._update_adjustment_stats(adjusted_results)
        
        print(f"✅ ML adjustments completed:")
        print(f"   Average adjustment: {self.adjustment_stats['avg_adjustment_delta']:+.3f}")
        print(f"   Positive adjustments: {self.adjustment_stats['positive_adjustments']}")
        print(f"   Negative adjustments: {self.adjustment_stats['negative_adjustments']}")
        
        return adjusted_results
    
    def _adjust_single_score(
        self, 
        result: TrustScoreResult, 
        user_id: str, 
        request_context: Dict[str, Any]
    ) -> MLAdjustmentResult:
        """Apply ML adjustments to a single trust score"""
        
        original_score = result.final_trust_score
        
        # 1. Collaborative filtering adjustment
        collaborative_boost = 0.0
        similar_buyers_score = 0.0
        
        if self.collaborative_filter.is_trained:
            # Predict user preference for this supplier
            predicted_preference = self.collaborative_filter.predict_supplier_preference(
                user_id, result.supplier_id
            )
            collaborative_boost = (predicted_preference - 0.5) * 0.2  # Scale to [-0.1, 0.1]
            
            # Get similar users' preference
            similar_users = self.collaborative_filter.find_similar_users(user_id, top_k=5)
            if similar_users:
                similar_preferences = []
                for similar_user in similar_users:
                    pref = self.collaborative_filter.predict_supplier_preference(
                        similar_user, result.supplier_id
                    )
                    similar_preferences.append(pref)
                
                similar_buyers_score = np.mean(similar_preferences)
        
        # 2. Behavioral adjustment
        behavioral_adjustment = 0.0
        behavioral_reasons = []
        
        user_history = request_context.get("user_history", [])
        if user_history:
            user_behavior = self.behavioral_adjustment.analyze_user_behavior(user_history)
            
            # Mock supplier features for behavioral analysis
            supplier_features = {
                "verification_level": result.verification_level_normalized * 5,
                "same_continent": request_context.get("same_continent", False),
                "certification_count": len(result.score_breakdown.get('certifications', [])),
                "risk_score": result.risk_score
            }
            
            behavioral_adjustment, behavioral_reasons = self.behavioral_adjustment.calculate_behavioral_adjustment(
                user_behavior, supplier_features
            )
        
        # 3. Market trend adjustment
        market_trend_adjustment = 0.0
        similar_products_score = 0.0
        seasonal_adjustment = 0.0
        
        product_category = request_context.get("product_category", "General")
        destination_country = request_context.get("destination_country", "")
        
        # Get market trend for category
        trends = self.market_trend_adjustment.market_trends
        if product_category in trends:
            market_trend_adjustment = (trends[product_category] - 0.5) * 0.1  # Scale to [-0.05, 0.05]
            similar_products_score = trends[product_category]
        
        # Get seasonal adjustment
        seasonal_adjustment, seasonal_reason = self.market_trend_adjustment.calculate_seasonal_adjustment(
            product_category, destination_country
        )
        
        # 4. Combine all adjustments
        total_adjustment = (
            collaborative_boost +
            behavioral_adjustment +
            market_trend_adjustment +
            seasonal_adjustment
        )
        
        # 5. Apply gradient boosting adjustment if model is trained
        if self.is_trained and hasattr(self.gb_model, 'feature_importances_'):
            gb_features = [
                original_score,
                similar_buyers_score,
                behavioral_adjustment,
                market_trend_adjustment,
                len(user_history),
                result.years_in_business_normalized,
                0.7  # Mock price competitiveness
            ]
            
            try:
                gb_adjustment = self.gb_model.predict([gb_features])[0] - original_score
                total_adjustment += gb_adjustment * 0.3  # Scale down GB adjustment
            except:
                pass
        
        # 6. Calculate final adjusted score
        adjusted_score = max(0.0, min(1.0, original_score + total_adjustment))
        adjustment_delta = adjusted_score - original_score
        
        # 7. Calculate confidence
        confidence = self._calculate_adjustment_confidence(
            collaborative_boost, behavioral_adjustment, market_trend_adjustment,
            similar_buyers_score, len(user_history)
        )
        
        # 8. Compile reasoning
        adjustment_reasons = []
        if abs(collaborative_boost) > 0.01:
            adjustment_reasons.append(f"Similar buyers preference: {collaborative_boost:+.3f}")
        if abs(behavioral_adjustment) > 0.01:
            adjustment_reasons.extend(behavioral_reasons)
        if abs(market_trend_adjustment) > 0.01:
            adjustment_reasons.append(f"Market trend: {market_trend_adjustment:+.3f}")
        if abs(seasonal_adjustment) > 0.01:
            adjustment_reasons.append(seasonal_reason)
        
        return MLAdjustmentResult(
            supplier_id=result.supplier_id,
            original_trust_score=original_score,
            adjusted_trust_score=adjusted_score,
            adjustment_delta=adjustment_delta,
            collaborative_boost=collaborative_boost,
            behavioral_adjustment=behavioral_adjustment,
            market_trend_adjustment=market_trend_adjustment,
            similar_buyers_score=similar_buyers_score,
            similar_products_score=similar_products_score,
            seasonal_adjustment=seasonal_adjustment,
            adjustment_confidence=confidence,
            adjustment_reasons=adjustment_reasons,
            adjusted_at=datetime.now(),
            ml_model_version=self.model_version
        )
    
    def _calculate_adjustment_confidence(
        self,
        collaborative_boost: float,
        behavioral_adjustment: float,
        market_trend_adjustment: float,
        similar_buyers_score: float,
        user_history_length: int
    ) -> float:
        """Calculate confidence in the ML adjustment"""
        
        confidence_factors = []
        
        # Collaborative filtering confidence
        if abs(collaborative_boost) > 0.01:
            confidence_factors.append(min(0.8, similar_buyers_score))
        
        # Behavioral adjustment confidence
        if abs(behavioral_adjustment) > 0.01:
            behavior_confidence = min(0.7, user_history_length / 50)  # More history = more confidence
            confidence_factors.append(behavior_confidence)
        
        # Market trend confidence
        if abs(market_trend_adjustment) > 0.01:
            confidence_factors.append(0.6)  # Moderate confidence in trends
        
        # Overall confidence
        if confidence_factors:
            return np.mean(confidence_factors)
        else:
            return 0.1  # Low confidence if no significant adjustments
    
    def _update_adjustment_stats(self, adjusted_results: List[MLAdjustmentResult]):
        """Update adjustment statistics"""
        if not adjusted_results:
            return
        
        self.adjustment_stats["total_adjustments"] += len(adjusted_results)
        
        deltas = [r.adjustment_delta for r in adjusted_results]
        self.adjustment_stats["avg_adjustment_delta"] = (
            (self.adjustment_stats["avg_adjustment_delta"] * 
             (self.adjustment_stats["total_adjustments"] - len(adjusted_results)) + 
             np.mean(deltas)) / self.adjustment_stats["total_adjustments"]
        )
        
        self.adjustment_stats["positive_adjustments"] += sum(1 for d in deltas if d > 0)
        self.adjustment_stats["negative_adjustments"] += sum(1 for d in deltas if d < 0)
        
        confidences = [r.adjustment_confidence for r in adjusted_results]
        self.adjustment_stats["avg_confidence"] = np.mean(confidences)
    
    def get_adjustment_stats(self) -> Dict[str, Any]:
        """Get comprehensive adjustment statistics"""
        stats = self.adjustment_stats.copy()
        stats["collaborative_stats"] = self.collaborative_filter.training_stats.copy()
        stats["behavioral_stats"] = self.behavioral_adjustment.behavior_stats.copy()
        stats["trend_stats"] = self.market_trend_adjustment.trend_stats.copy()
        stats["model_version"] = self.model_version
        stats["is_trained"] = self.is_trained
        return stats
    
    def save_models(self, model_dir: str):
        """Save trained models"""
        os.makedirs(model_dir, exist_ok=True)
        
        # Save collaborative filtering model
        cf_data = {
            'user_item_matrix': self.collaborative_filter.user_item_matrix,
            'user_to_idx': self.collaborative_filter.user_to_idx,
            'supplier_to_idx': self.collaborative_filter.supplier_to_idx,
            'idx_to_supplier': self.collaborative_filter.idx_to_supplier,
            'nmmf_model': self.collaborative_filter.nmf_model,
            'training_stats': self.collaborative_filter.training_stats
        }
        
        with open(os.path.join(model_dir, "collaborative_filter.pkl"), 'wb') as f:
            pickle.dump(cf_data, f)
        
        # Save gradient boosting model
        if self.is_trained:
            with open(os.path.join(model_dir, "ml_adjustment_gb.pkl"), 'wb') as f:
                pickle.dump(self.gb_model, f)
        
        print(f"💾 ML adjustment models saved to {model_dir}")
    
    def load_models(self, model_dir: str):
        """Load trained models"""
        # Load collaborative filtering model
        cf_path = os.path.join(model_dir, "collaborative_filter.pkl")
        if os.path.exists(cf_path):
            with open(cf_path, 'rb') as f:
                cf_data = pickle.load(f)
            
            self.collaborative_filter.user_item_matrix = cf_data['user_item_matrix']
            self.collaborative_filter.user_to_idx = cf_data['user_to_idx']
            self.collaborative_filter.supplier_to_idx = cf_data['supplier_to_idx']
            self.collaborative_filter.idx_to_supplier = cf_data['idx_to_supplier']
            self.collaborative_filter.nmf_model = cf_data['nmmf_model']
            self.collaborative_filter.training_stats = cf_data['training_stats']
            self.collaborative_filter.is_trained = True
        
        # Load gradient boosting model
        gb_path = os.path.join(model_dir, "ml_adjustment_gb.pkl")
        if os.path.exists(gb_path):
            with open(gb_path, 'rb') as f:
                self.gb_model = pickle.load(f)
            self.is_trained = True
        
        print(f"📂 ML adjustment models loaded from {model_dir}")

# Example Usage
if __name__ == "__main__":
    from .step5_trust_score_calculator import TrustScoreResult, TrustScoreCalculator
    import numpy as np
    
    # Create ML adjustment layer
    ml_layer = MLAdjustmentLayer()
    
    # Create sample trust result
    sample_result = TrustScoreResult(
        supplier_id="sup_001",
        similarity_score=0.85,
        success_rate_score=0.95,
        on_time_delivery_score=0.92,
        rating_score=0.94,
        risk_score=0.15,
        weighted_similarity=0.255,
        weighted_success_rate=0.238,
        weighted_on_time_delivery=0.184,
        weighted_rating=0.141,
        weighted_risk=0.085,
        trust_score_classic=0.903,
        trust_score_ml=0.88,
        final_trust_score=0.89,
        confidence_level=0.85,
        calculation_method="classic",
        feature_importance={},
        score_breakdown={},
        calculated_at=datetime.now(),
        processing_time_ms=15.0
    )
    
    # Sample request context
    request_context = {
        "product_category": "Spices",
        "destination_country": "DE",
        "user_history": [
            {"supplier_verification": 4, "certifications_required": ["Organic"]},
            {"supplier_verification": 3, "certifications_required": ["FDA"]},
        ],
        "same_continent": False
    }
    
    try:
        # Apply ML adjustments (without training - will use defaults)
        adjusted_results = ml_layer.adjust_trust_scores(
            [sample_result], "user_123", request_context
        )
        
        result = adjusted_results[0]
        print(f"\n🧠 ML Adjustment Results:")
        print(f"   Supplier: {result.supplier_id}")
        print(f"   Original Score: {result.original_trust_score:.3f}")
        print(f"   Adjusted Score: {result.adjusted_trust_score:.3f}")
        print(f"   Adjustment Delta: {result.adjustment_delta:+.3f}")
        print(f"   Confidence: {result.adjustment_confidence:.3f}")
        print(f"   Reasons: {', '.join(result.adjustment_reasons)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
