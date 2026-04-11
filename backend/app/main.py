from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import connect_to_mongo, close_mongo_connection
from app.routes import auth, users, marketplace, onboard
from app.api import matchmaker, trade_parser, registration, ocr, aadhaar_verification, document_agent_api, negotiation_api, orchestrator_api, risk_api, logistics_api

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
app.include_router(onboard.router, prefix="/api/onboard", tags=["Onboard"])
app.include_router(matchmaker.router, prefix="/api/matchmaker", tags=["Matchmaker"])
app.include_router(trade_parser.router, prefix="/api/trade-parser", tags=["Trade Parser"])
app.include_router(registration.router, prefix="/api/registration", tags=["Registration"])
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
app.include_router(aadhaar_verification.router, prefix="/api/aadhaar", tags=["Aadhaar Verification"])
app.include_router(document_agent_api.router, prefix="/api/document-agent", tags=["Document Agent"])
app.include_router(negotiation_api.router, prefix="/api/intelligence", tags=["Market Intelligence & Negotiation"])
app.include_router(orchestrator_api.router, prefix="/api/orchestrator", tags=["LangChain Orchestrator"])
app.include_router(risk_api.router, prefix="/api/risk", tags=["Risk Agent"])
app.include_router(logistics_api.router, prefix="/api/logistics", tags=["Logistics Agent"])

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/")
async def root():
    return {"message": "Welcome to TradeOS Platform API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TradeOS Platform API"}
