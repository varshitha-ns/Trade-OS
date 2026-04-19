import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import asyncio

Base = declarative_base()

class ProtocolState(enum.Enum):
    AWAITING_FUNDS = "AWAITING_FUNDS"
    IN_TRANSIT = "IN_TRANSIT"
    DELIVERED = "DELIVERED"
    DISPUTED = "DISPUTED"
    REFUNDED = "REFUNDED"
    SETTLED = "SETTLED"

class TransactionRecord(Base):
    __tablename__ = "transaction_records"

    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(String, index=True)
    milestone_index = Column(Integer)
    blockchain_tx_hash = Column(String, unique=True, index=True)
    verified_by_oracle = Column(Boolean, default=False)
    status_enum = Column(Enum(ProtocolState), default=ProtocolState.AWAITING_FUNDS)
    amount_eth = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

# SQLite serves as an asynchronous relational drop-in mapping for PostgreSQL 
# during un-configured local testing. Fully asyncpg / psycopg compatible.
DATABASE_URL = "sqlite+aiosqlite:///./escrow_ledger.db"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
