from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime
import uuid

from app.models.matchmaker import (
    TradeRequest, MatchResult, MatchingMetrics, PartnerProfile
)
from app.models import User
from app.services.matchmaker import matchmaker_agent
from app.services.evaluation_service import evaluation_service
from app.database import get_database

router = APIRouter()

@router.post("/trade-request", response_model=MatchResult)
async def create_trade_request(
    trade_request_data: dict,
    current_user: User = Depends(None)  # Add auth dependency
):
    """Create a new trade request and get matching recommendations"""
    try:
        # Create trade request
        trade_request = TradeRequest(
            id=str(uuid.uuid4()),
            user_id=current_user.id if current_user else "demo-user",
            product_name=trade_request_data["product_name"],
            product_description=trade_request_data["product_description"],
            hs_code=trade_request_data["hs_code"],
            quantity=trade_request_data["quantity"],
            unit=trade_request_data.get("unit", "units"),
            destination_country=trade_request_data["destination_country"],
            origin_country=trade_request_data.get("origin_country"),
            timeline_days=trade_request_data["timeline_days"],
            budget_max=trade_request_data["budget_max"],
            budget_currency=trade_request_data.get("budget_currency", "USD"),
            requirements=trade_request_data.get("requirements", []),
            created_at=datetime.now()
        )
        
        # Store trade request in database
        db = get_database()
        await db.trade_requests.insert_one(trade_request.dict())
        
        # Get match recommendations
        match_result = await matchmaker_agent.find_matches(trade_request)
        
        # Store match result in database
        await db.match_results.insert_one(match_result.dict())
        
        return match_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing trade request: {str(e)}")

@router.get("/trade-requests/{user_id}", response_model=List[dict])
async def get_user_trade_requests(user_id: str):
    """Get all trade requests for a user"""
    try:
        db = get_database()
        cursor = db.trade_requests.find({"user_id": user_id}).sort("created_at", -1)
        
        requests = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            requests.append(doc)
        
        return requests
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching trade requests: {str(e)}")

@router.get("/match-results/{request_id}", response_model=MatchResult)
async def get_match_result(request_id: str):
    """Get match results for a specific trade request"""
    try:
        db = get_database()
        result = await db.match_results.find_one({"trade_request_id": request_id})
        
        if not result:
            raise HTTPException(status_code=404, detail="Match result not found")
        
        result["_id"] = str(result["_id"])
        return MatchResult(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching match result: {str(e)}")

@router.get("/partner-profile/{partner_id}", response_model=PartnerProfile)
async def get_partner_profile(partner_id: str):
    """Get detailed profile for a partner"""
    try:
        db = get_database()
        
        # Get user data
        user_doc = await db.users.find_one({"_id": partner_id})
        if not user_doc:
            raise HTTPException(status_code=404, detail="Partner not found")
        
        # Get partner's trade history
        trade_history_cursor = db.trade_history.find({
            "$or": [
                {"exporter_id": partner_id},
                {"importer_id": partner_id}
            ]
        })
        
        total_trades = 0
        successful_trades = 0
        on_time_deliveries = 0
        
        async for trade in trade_history_cursor:
            total_trades += 1
            if trade.get("status") == "completed":
                successful_trades += 1
            if trade.get("delay_days", 0) <= 0:
                on_time_deliveries += 1
        
        # Calculate metrics
        success_rate = successful_trades / total_trades if total_trades > 0 else 0.0
        on_time_rate = on_time_deliveries / total_trades if total_trades > 0 else 0.0
        
        # Create partner profile
        partner_profile = PartnerProfile(
            user_id=partner_id,
            company_name=user_doc.get("company_name", ""),
            role="supplier",  # Determine from user_type
            country=user_doc.get("country", ""),
            hs_codes=[],  # Would come from products collection
            products=user_doc.get("products", []),
            capacity=1000,  # Mock capacity
            unit="units",
            delivery_countries=[],  # Would come from partner profile
            certifications=[],
            verification_level=3,  # Would come from verification status
            rating=4.0,  # Would come from reviews collection
            total_trades=total_trades,
            success_rate=success_rate,
            on_time_delivery_rate=on_time_rate,
            average_response_time_hours=24.0,  # Would come from communications
            created_at=user_doc.get("created_at", datetime.now()),
            updated_at=user_doc.get("updated_at", datetime.now())
        )
        
        return partner_profile
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching partner profile: {str(e)}")

@router.post("/feedback")
async def submit_match_feedback(feedback_data: dict):
    """Submit feedback for match recommendations"""
    try:
        db = get_database()
        
        feedback = {
            "id": str(uuid.uuid4()),
            "user_id": feedback_data["user_id"],
            "trade_request_id": feedback_data["trade_request_id"],
            "partner_id": feedback_data["partner_id"],
            "rating": feedback_data["rating"],  # 1-5 scale
            "feedback_text": feedback_data.get("feedback_text", ""),
            "was_selected": feedback_data.get("was_selected", False),
            "deal_successful": feedback_data.get("deal_successful", None),
            "created_at": datetime.now()
        }
        
        await db.match_feedback.insert_one(feedback)
        
        # Update partner metrics based on feedback
        if feedback["was_selected"] and feedback["deal_successful"]:
            await _update_partner_success_metrics(feedback["partner_id"])
        
        return {"message": "Feedback submitted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@router.get("/metrics", response_model=MatchingMetrics)
async def get_matching_metrics(date: Optional[str] = None):
    """Get matching system metrics for monitoring"""
    try:
        db = get_database()
        
        # Parse date (simplified - in production would use proper date parsing)
        target_date = datetime.now()
        
        # Get metrics for the date
        requests_count = await db.trade_requests.count_documents({
            "created_at": {
                "$gte": target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            }
        })
        
        # Calculate successful matches (where feedback indicates selection)
        successful_matches = await db.match_feedback.count_documents({
            "created_at": {
                "$gte": target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            },
            "was_selected": True
        })
        
        # Get average response time
        match_results_cursor = db.match_results.find({
            "created_at": {
                "$gte": target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            }
        })
        
        processing_times = []
        async for result in match_results_cursor:
            processing_times.append(result.get("processing_time_ms", 0))
        
        avg_response_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        # Calculate user satisfaction (average feedback rating)
        feedback_cursor = db.match_feedback.find({
            "created_at": {
                "$gte": target_date.replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            },
            "rating": {"$exists": True}
        })
        
        ratings = []
        async for feedback in feedback_cursor:
            ratings.append(feedback["rating"])
        
        satisfaction_score = sum(ratings) / len(ratings) if ratings else None
        
        metrics = MatchingMetrics(
            date=target_date,
            total_requests=requests_count,
            successful_matches=successful_matches,
            average_response_time_ms=avg_response_time,
            user_satisfaction_score=satisfaction_score,
            deal_success_rate=None  # Would calculate from long-term data
        )
        
        return metrics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching metrics: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint for the matchmaker service"""
    return {
        "status": "healthy",
        "service": "Matchmaker Agent",
        "version": "1.0.0",
        "timestamp": datetime.now()
    }

@router.get("/evaluation/performance")
async def get_performance_metrics(days: int = 30):
    """Get comprehensive performance metrics"""
    try:
        metrics = await evaluation_service.get_performance_metrics(days=days)
        return {
            "period_days": days,
            "metrics": metrics,
            "generated_at": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching performance metrics: {str(e)}")

@router.get("/evaluation/health")
async def get_system_health():
    """Get system health metrics"""
    try:
        health = await evaluation_service.get_system_health_metrics()
        return health
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching health metrics: {str(e)}")

@router.get("/evaluation/patterns")
async def get_recommendation_patterns(days: int = 30):
    """Get recommendation pattern analysis"""
    try:
        patterns = await evaluation_service.analyze_recommendation_patterns(days=days)
        return {
            "period_days": days,
            "patterns": patterns,
            "generated_at": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing patterns: {str(e)}")

@router.get("/evaluation/daily-report")
async def get_daily_report():
    """Get comprehensive daily performance report"""
    try:
        report = await evaluation_service.generate_daily_report()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating daily report: {str(e)}")

@router.get("/evaluation/precision-recall")
async def get_precision_recall_metrics(k: int = 5, days: int = 30):
    """Get precision and recall metrics"""
    try:
        precision = await evaluation_service.calculate_precision_at_k(k=k, days=days)
        recall = await evaluation_service.calculate_recall_at_k(k=k, days=days)
        
        return {
            "k": k,
            "period_days": days,
            "precision_at_k": precision,
            "recall_at_k": recall,
            "f1_score": 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0,
            "calculated_at": datetime.now()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating precision/recall: {str(e)}")

async def _update_partner_success_metrics(partner_id: str):
    """Update partner metrics after successful deal"""
    try:
        db = get_database()
        
        # Increment successful trades count
        await db.users.update_one(
            {"_id": partner_id},
            {"$inc": {"successful_trades": 1}}
        )
        
        # In a real implementation, this would update more complex metrics
        # like success rate, rating, etc.
        
    except Exception as e:
        print(f"Error updating partner metrics: {e}")
