from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import statistics
from app.models.matchmaker import MatchingMetrics, MatchResult, MatchRecommendation
from app.database import get_database

class EvaluationService:
    """Service for evaluating matchmaker performance and generating metrics"""
    
    def __init__(self):
        self.db = get_database()
    
    async def calculate_precision_at_k(self, k: int = 5, days: int = 30) -> float:
        """Calculate Precision@K - proportion of relevant items in top-k recommendations"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get feedback data for the period
        cursor = self.db.match_feedback.find({
            "created_at": {"$gte": start_date, "$lte": end_date},
            "rating": {"$exists": True}
        })
        
        feedback_data = []
        async for feedback in cursor:
            feedback_data.append(feedback)
        
        if not feedback_data:
            return 0.0
        
        # Group by trade request
        requests_feedback = {}
        for feedback in feedback_data:
            request_id = feedback["trade_request_id"]
            if request_id not in requests_feedback:
                requests_feedback[request_id] = []
            requests_feedback[request_id].append(feedback)
        
        # Calculate precision for each request
        precisions = []
        for request_id, feedback_list in requests_feedback.items():
            # Sort by recommendation order (would need to store order in feedback)
            feedback_list.sort(key=lambda x: x.get("recommendation_order", 999))
            
            # Get top-k feedback
            top_k_feedback = feedback_list[:k]
            
            if not top_k_feedback:
                continue
            
            # Count relevant items (rating >= 3 or was_selected)
            relevant_count = sum(1 for f in top_k_feedback 
                                if f.get("rating", 0) >= 3 or f.get("was_selected", False))
            
            precision = relevant_count / len(top_k_feedback)
            precisions.append(precision)
        
        return statistics.mean(precisions) if precisions else 0.0
    
    async def calculate_recall_at_k(self, k: int = 10, days: int = 30) -> float:
        """Calculate Recall@K - proportion of relevant items found in top-k recommendations"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get feedback data
        cursor = self.db.match_feedback.find({
            "created_at": {"$gte": start_date, "$lte": end_date},
            "rating": {"$exists": True}
        })
        
        feedback_data = []
        async for feedback in cursor:
            feedback_data.append(feedback)
        
        if not feedback_data:
            return 0.0
        
        # Group by trade request
        requests_feedback = {}
        for feedback in feedback_data:
            request_id = feedback["trade_request_id"]
            if request_id not in requests_feedback:
                requests_feedback[request_id] = []
            requests_feedback[request_id].append(feedback)
        
        # Calculate recall for each request
        recalls = []
        for request_id, feedback_list in requests_feedback.items():
            # Count all relevant items
            all_relevant = sum(1 for f in feedback_list 
                             if f.get("rating", 0) >= 3 or f.get("was_selected", False))
            
            if all_relevant == 0:
                continue
            
            # Count relevant items in top-k
            feedback_list.sort(key=lambda x: x.get("recommendation_order", 999))
            top_k_feedback = feedback_list[:k]
            
            relevant_in_top_k = sum(1 for f in top_k_feedback 
                                  if f.get("rating", 0) >= 3 or f.get("was_selected", False))
            
            recall = relevant_in_top_k / all_relevant
            recalls.append(recall)
        
        return statistics.mean(recalls) if recalls else 0.0
    
    async def calculate_matching_accuracy(self, days: int = 30) -> float:
        """Calculate overall matching accuracy"""
        # This is a simplified version - would need more sophisticated logic
        precision = await self.calculate_precision_at_k(k=5, days=days)
        recall = await self.calculate_recall_at_k(k=10, days=days)
        
        if precision + recall == 0:
            return 0.0
        
        # F1-score as accuracy metric
        return 2 * (precision * recall) / (precision + recall)
    
    async def calculate_user_satisfaction(self, days: int = 30) -> float:
        """Calculate average user satisfaction score"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        cursor = self.db.match_feedback.find({
            "created_at": {"$gte": start_date, "$lte": end_date},
            "rating": {"$exists": True}
        })
        
        ratings = []
        async for feedback in cursor:
            ratings.append(feedback["rating"])
        
        return statistics.mean(ratings) if ratings else 0.0
    
    async def calculate_deal_success_rate(self, days: int = 60) -> float:
        """Calculate deal success rate (requires longer time window)"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        cursor = self.db.match_feedback.find({
            "created_at": {"$gte": start_date, "$lte": end_date},
            "was_selected": True,
            "deal_successful": {"$exists": True}
        })
        
        successful_deals = 0
        total_deals = 0
        
        async for feedback in cursor:
            total_deals += 1
            if feedback["deal_successful"]:
                successful_deals += 1
        
        return successful_deals / total_deals if total_deals > 0 else 0.0
    
    async def get_performance_metrics(self, days: int = 30) -> Dict[str, float]:
        """Get comprehensive performance metrics"""
        metrics = {
            "precision_at_5": await self.calculate_precision_at_k(k=5, days=days),
            "precision_at_10": await self.calculate_precision_at_k(k=10, days=days),
            "recall_at_5": await self.calculate_recall_at_k(k=5, days=days),
            "recall_at_10": await self.calculate_recall_at_k(k=10, days=days),
            "matching_accuracy": await self.calculate_matching_accuracy(days=days),
            "user_satisfaction": await self.calculate_user_satisfaction(days=days),
            "deal_success_rate": await self.calculate_deal_success_rate(days=days*2)  # Longer window
        }
        
        return metrics
    
    async def get_system_health_metrics(self) -> Dict[str, any]:
        """Get system health and performance metrics"""
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Today's metrics
        today_requests = await self.db.trade_requests.count_documents({
            "created_at": {"$gte": today_start}
        })
        
        today_matches = await self.db.match_results.count_documents({
            "created_at": {"$gte": today_start}
        })
        
        # Average processing time
        cursor = self.db.match_results.find({
            "created_at": {"$gte": today_start}
        })
        
        processing_times = []
        async for result in cursor:
            processing_times.append(result.get("processing_time_ms", 0))
        
        avg_processing_time = statistics.mean(processing_times) if processing_times else 0
        
        # Error rate (simplified - would track actual errors)
        error_rate = 0.0  # Placeholder
        
        # Database health
        try:
            await self.db.command("ping")
            db_healthy = True
        except:
            db_healthy = False
        
        return {
            "daily_requests": today_requests,
            "daily_matches": today_matches,
            "avg_processing_time_ms": avg_processing_time,
            "error_rate": error_rate,
            "database_healthy": db_healthy,
            "timestamp": now
        }
    
    async def analyze_recommendation_patterns(self, days: int = 30) -> Dict[str, any]:
        """Analyze patterns in recommendations and user choices"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get all match results and feedback
        match_cursor = self.db.match_results.find({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        feedback_cursor = self.db.match_feedback.find({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Analyze score distributions
        trust_scores = []
        similarity_scores = []
        overall_scores = []
        
        async for match_result in match_cursor:
            for rec in match_result.get("recommendations", []):
                trust_scores.append(rec.get("trust_score", 0))
                similarity_scores.append(rec.get("similarity_score", 0))
                overall_scores.append(rec.get("overall_score", 0))
        
        # Analyze selection patterns
        selected_partners = []
        all_partners = []
        
        async for feedback in feedback_cursor:
            all_partners.append(feedback["partner_id"])
            if feedback.get("was_selected", False):
                selected_partners.append(feedback["partner_id"])
        
        return {
            "score_distributions": {
                "trust_score": {
                    "mean": statistics.mean(trust_scores) if trust_scores else 0,
                    "median": statistics.median(trust_scores) if trust_scores else 0,
                    "min": min(trust_scores) if trust_scores else 0,
                    "max": max(trust_scores) if trust_scores else 0
                },
                "similarity_score": {
                    "mean": statistics.mean(similarity_scores) if similarity_scores else 0,
                    "median": statistics.median(similarity_scores) if similarity_scores else 0,
                    "min": min(similarity_scores) if similarity_scores else 0,
                    "max": max(similarity_scores) if similarity_scores else 0
                },
                "overall_score": {
                    "mean": statistics.mean(overall_scores) if overall_scores else 0,
                    "median": statistics.median(overall_scores) if overall_scores else 0,
                    "min": min(overall_scores) if overall_scores else 0,
                    "max": max(overall_scores) if overall_scores else 0
                }
            },
            "selection_rate": len(selected_partners) / len(all_partners) if all_partners else 0,
            "total_recommendations": len(all_partners),
            "total_selections": len(selected_partners)
        }
    
    async def generate_daily_report(self) -> Dict[str, any]:
        """Generate comprehensive daily performance report"""
        performance_metrics = await self.get_performance_metrics(days=1)
        health_metrics = await self.get_system_health_metrics()
        patterns = await self.analyze_recommendation_patterns(days=1)
        
        return {
            "date": datetime.now().date().isoformat(),
            "performance": performance_metrics,
            "health": health_metrics,
            "patterns": patterns,
            "generated_at": datetime.now()
        }

# Singleton instance
evaluation_service = EvaluationService()
