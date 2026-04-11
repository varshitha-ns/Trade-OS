# 🤖 TradeOS Matchmaker Agent

An intelligent B2B recommendation engine that connects buyers, suppliers, and logistics partners using AI-driven matching techniques.

## 🎯 Overview

The Matchmaker Agent is the core intelligence behind TradeOS, designed to:
- Analyze SME trade requirements
- Search and filter verified partners
- Rank partners based on trust & relevance
- Recommend best trade partners with risk assessment

## 🏗️ Architecture

### Multi-Phase Matching Pipeline

1. **Rule-Based Filtering** - Basic eligibility screening
2. **Trust Score Calculation** - Historical performance analysis
3. **Similarity Matching** - AI-powered content similarity
4. **Risk Assessment** - Multi-factor risk evaluation
5. **Compliance Checking** - Regulatory and sanctions screening
6. **Recommendation Generation** - Final ranked recommendations

### Agent Integration

- **Matchmaker Agent** - Core matching logic
- **Risk Agent** - Risk assessment and scoring
- **Compliance Agent** - Regulatory compliance checks

## 📊 Core Components

### Database Models

- **TradeRequest** - Trade requirements from SMEs
- **PartnerProfile** - Comprehensive partner information
- **TrustScore** - Trustworthiness metrics
- **SimilarityScore** - Content similarity metrics
- **RiskAssessment** - Risk evaluation results
- **ComplianceCheck** - Compliance verification
- **MatchRecommendation** - Final recommendations

### Scoring Algorithms

#### Trust Score Formula
```
Trust Score = (0.4 × Success Rate) + (0.2 × On-time Delivery Rate) + (0.2 × Average Rating) + (0.2 × Verification Level)
```

#### Overall Score
```
Overall Score = (0.4 × Trust) + (0.3 × Similarity) + (0.2 × (1 - Risk)) + (0.1 × Compliance)
```

## 🚀 API Endpoints

### Core Matching
- `POST /api/matchmaker/trade-request` - Create trade request & get matches
- `GET /api/matchmaker/match-results/{request_id}` - Get match results
- `GET /api/matchmaker/partner-profile/{partner_id}` - Get partner details

### Feedback & Learning
- `POST /api/matchmaker/feedback` - Submit match feedback
- `GET /api/matchmaker/trade-requests/{user_id}` - Get user's trade requests

### Evaluation & Monitoring
- `GET /api/matchmaker/evaluation/performance` - Performance metrics
- `GET /api/matchmaker/evaluation/health` - System health
- `GET /api/matchmaker/evaluation/daily-report` - Daily performance report
- `GET /api/matchmaker/evaluation/precision-recall` - Precision/Recall metrics

### System
- `GET /api/matchmaker/health` - Service health check

## 🔧 Installation & Setup

### Dependencies
```bash
pip install -r requirements.txt
```

Key dependencies:
- FastAPI - Web framework
- MongoDB + Motor - Database
- Scikit-learn - ML algorithms
- NumPy - Numerical operations

### Environment Variables
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=tradeos_platform
```

## 📈 Evaluation Metrics

### Performance Metrics
- **Precision@K** - Accuracy of top-K recommendations
- **Recall@K** - Coverage of relevant partners
- **F1-Score** - Balance of precision and recall
- **User Satisfaction** - Average feedback ratings
- **Deal Success Rate** - Long-term conversion metrics

### System Metrics
- **Processing Time** - Average matching latency
- **Throughput** - Requests per second
- **Error Rate** - System reliability
- **Database Health** - Connection status

## 🧪 Demo Usage

### Run Demo Script
```bash
python demo_matchmaker.py
```

### Sample API Call
```python
import requests

trade_request = {
    "product_name": "Organic Coffee Beans",
    "product_description": "Premium organic Arabica coffee beans",
    "hs_code": "090111",
    "quantity": 1000,
    "unit": "kg",
    "destination_country": "US",
    "timeline_days": 30,
    "budget_max": 5000.0,
    "requirements": ["Organic certification", "Fair trade preferred"]
}

response = requests.post(
    "http://localhost:8000/api/matchmaker/trade-request",
    json=trade_request
)

match_result = response.json()
print(f"Found {len(match_result['recommendations'])} recommendations")
```

## 🔍 Risk Assessment Factors

### Risk Categories
1. **Trade Volume Risk** - Low number of historical trades
2. **Rating Risk** - Poor performance ratings
3. **Success Rate Risk** - Low completion rates
4. **Response Time Risk** - Slow communication
5. **Partner Age Risk** - New platform members
6. **Geographic Risk** - High-risk locations

### Risk Levels
- **LOW** (< 0.2) - Minimal risk
- **MEDIUM** (0.2-0.5) - Moderate risk
- **HIGH** (0.5-0.8) - Significant risk
- **CRITICAL** (> 0.8) - High risk

## 🛡️ Compliance Features

### Compliance Checks
- **Verification Status** - Minimum verification levels
- **Sanctions Screening** - Watchlist checking
- **Geographic Restrictions** - Trade compliance
- **Industry Restrictions** - High-risk industries
- **Trade History** - Compliance record

### Restricted Elements
- Sanctioned entities and countries
- Export-controlled destinations
- High-risk industry sectors

## 📊 Matching Algorithm Details

### Phase 1: Rule-Based Filtering
```python
# Basic eligibility criteria
if partner.hs_code == request.hs_code \
   and partner.country != request.destination_country \
   and partner.capacity >= request.quantity \
   and partner.verification_level >= 2:
       eligible_partners.append(partner)
```

### Phase 2: Similarity Matching
- **TF-IDF Vectorization** - Text feature extraction
- **Cosine Similarity** - Content similarity scoring
- **N-gram Analysis** - Phrase-level matching
- **Product Relevance** - Keyword overlap scoring

### Phase 3: Trust Scoring
- **Success Rate** - Historical trade completion
- **On-time Delivery** - Punctuality metrics
- **Average Rating** - User feedback scores
- **Verification Level** - Platform verification status

## 🔄 Learning & Improvement

### Feedback Loop
1. User submits feedback on recommendations
2. System updates partner metrics
3. Algorithm weights are adjusted
4. Future recommendations improve

### Continuous Learning
- **Implicit Feedback** - User selection patterns
- **Explicit Feedback** - Ratings and reviews
- **Performance Metrics** - System effectiveness
- **A/B Testing** - Algorithm improvements

## 🚀 Advanced Features (Future Roadmap)

### Phase 4: ML Enhancement
- **Collaborative Filtering** - User behavior patterns
- **Hybrid Recommendations** - Multiple algorithm combination
- **Neural Networks** - Deep learning models
- **Real-time Learning** - Online model updates

### Phase 5: Full Integration
- **Multi-Agent Communication** - LangChain integration
- **Advanced Risk Models** - Machine learning risk assessment
- **Predictive Analytics** - Success probability prediction
- **Market Intelligence** - Trend analysis and insights

## 📚 Technical Documentation

### File Structure
```
backend/
├── app/
│   ├── models/
│   │   ├── __init__.py          # All model imports
│   │   └── matchmaker.py        # Matchmaker-specific models
│   ├── services/
│   │   ├── matchmaker.py        # Core matching logic
│   │   ├── risk_agent.py        # Risk assessment
│   │   ├── compliance_agent.py  # Compliance checking
│   │   └── evaluation_service.py # Performance metrics
│   ├── routes/
│   │   └── matchmaker.py        # API endpoints
│   └── main.py                  # FastAPI app setup
├── demo_matchmaker.py           # Demo script
└── requirements.txt             # Dependencies
```

### Key Classes
- **MatchmakerAgent** - Main orchestration service
- **RiskAgent** - Risk assessment service
- **ComplianceAgent** - Compliance checking service
- **EvaluationService** - Performance monitoring

## 🎯 Success Metrics

### Business KPIs
- **Match Accuracy** - >85% precision@5
- **User Satisfaction** - >4.0/5.0 average rating
- **Deal Success Rate** - >70% conversion
- **Processing Time** - <500ms average

### Technical KPIs
- **System Availability** - >99.9% uptime
- **API Response Time** - <200ms p95
- **Error Rate** - <1% of requests
- **Database Performance** - <100ms query time

## 🤝 Contributing

### Development Guidelines
1. Follow existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Monitor performance impact
5. Ensure backward compatibility

### Testing Strategy
- **Unit Tests** - Individual component testing
- **Integration Tests** - End-to-end workflows
- **Performance Tests** - Load and stress testing
- **A/B Tests** - Algorithm comparison

---

**🚀 Ready to transform B2B trade with intelligent matching!**
