from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, users, marketplace
from app.core.subscribers import startup_event_subscriptions
from app.api import matchmaker, trade_parser, ocr, aadhaar_verification, document_agent_api, negotiation_api, orchestrator_api, risk_api, logistics_api, buyer_matchmaker_api, catalog_api, qc_api, escrow_api, co_import_api, live_feed_api, deal_room_api
from app.services.trade_intelligence import intelligence_service

app = FastAPI(title="TradeOS Platform", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # Allow any localhost/127.0.0.1 port in local development.
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(matchmaker.router, prefix="/api/matchmaker", tags=["Matchmaker"])
app.include_router(trade_parser.router, prefix="/api/trade-parser", tags=["Trade Parser"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(aadhaar_verification.router, prefix="/api/aadhaar", tags=["Aadhaar Verification"])
app.include_router(document_agent_api.router, prefix="/api/document-agent", tags=["Document Agent"])
app.include_router(negotiation_api.router, prefix="/api/intelligence", tags=["Market Intelligence & Negotiation"])
app.include_router(orchestrator_api.router, prefix="/api/orchestrator", tags=["LangChain Orchestrator"])
app.include_router(risk_api.router, prefix="/api/risk", tags=["Risk Agent"])
app.include_router(logistics_api.router, prefix="/api/logistics", tags=["Logistics Agent"])
app.include_router(buyer_matchmaker_api.router, prefix="/api/matchmaker_buyer", tags=["Buyer Matchmaker"])
app.include_router(catalog_api.router, prefix="/api/catalog", tags=["Catalog Generation"])
app.include_router(qc_api.router, prefix="/api/qc", tags=["Quality Control"])
app.include_router(escrow_api.router, prefix="/api/escrow", tags=["Escrow Ledger"])
app.include_router(co_import_api.router, prefix="/api/co-import", tags=["MOQ Aggregator"])
app.include_router(live_feed_api.router, prefix="/api/live-feed", tags=["Live Dashboard Feed"])
app.include_router(deal_room_api.router, prefix="/api/deal-room", tags=["Multiplayer Deal Room"])

@app.get("/api/intelligence/feasibility")
async def get_feasibility(product: str, hs_code: str):
    return intelligence_service.get_feasibility_report(product, hs_code)

@app.get("/api/intelligence/landed-cost")
async def get_landed_cost(price: float, hs_code: str, origin: str):
    return intelligence_service.calculate_landed_cost(price, hs_code, origin)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    await startup_event_subscriptions()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Welcome to TradeOS Platform API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TradeOS Platform API"}
