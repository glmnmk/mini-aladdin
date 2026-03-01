import os
import uuid
import secrets
import hashlib
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

from sqlalchemy import create_engine, Column, String, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback to local sqlite if no DB url provided
    DATABASE_URL = "sqlite:///./maas.db"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, connect_args={} if "sqlite" not in DATABASE_URL else {"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBUser(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    salt = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class DBPortfolio(Base):
    __tablename__ = "portfolios"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    tickers = Column(JSON)
    weights = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables in the database if they don't exist
Base.metadata.create_all(bind=engine)

class PortfolioModel(BaseModel):
    id: str
    name: str
    tickers: List[str]
    weights: Dict[str, float]
    created_at: str

class UserModel(BaseModel):
    id: str
    email: str
    password_hash: str
    salt: str
    created_at: str

def _hash_password(password: str, salt: str) -> str:
    """Hashes a password with the given salt using PBKDF2 HMAC SHA-256."""
    hash_obj = hashlib.pbkdf2_hmac(
        'sha256', 
        password.encode('utf-8'), 
        salt.encode('utf-8'), 
        100000
    )
    return hash_obj.hex()

def register_user(email: str, password: str) -> Optional[Dict]:
    db = SessionLocal()
    try:
        if db.query(DBUser).filter(DBUser.email == email).first():
            return None
            
        user_id = str(uuid.uuid4())
        salt = secrets.token_hex(16)
        password_hash = _hash_password(password, salt)
        
        db_user = DBUser(
            id=user_id,
            email=email,
            password_hash=password_hash,
            salt=salt,
            created_at=datetime.utcnow()
        )
        db.add(db_user)
        db.commit()
        return {"id": user_id, "email": email}
    finally:
        db.close()

def verify_user(email: str, password: str) -> Optional[Dict]:
    db = SessionLocal()
    try:
        user = db.query(DBUser).filter(DBUser.email == email).first()
        if user:
            attempt_hash = _hash_password(password, user.salt)
            if secrets.compare_digest(user.password_hash, attempt_hash):
                return {"id": user.id, "email": user.email}
        return None
    finally:
        db.close()

def save_portfolio(name: str, tickers: List[str], weights: Dict[str, float]) -> PortfolioModel:
    db = SessionLocal()
    try:
        portfolio_id = str(uuid.uuid4())
        db_port = DBPortfolio(
            id=portfolio_id,
            name=name,
            tickers=tickers,
            weights=weights,
            created_at=datetime.utcnow()
        )
        db.add(db_port)
        db.commit()
        return PortfolioModel(
            id=portfolio_id,
            name=name,
            tickers=tickers,
            weights=weights,
            created_at=db_port.created_at.isoformat()
        )
    finally:
        db.close()

def list_portfolios() -> List[PortfolioModel]:
    db = SessionLocal()
    try:
        ports = db.query(DBPortfolio).order_by(DBPortfolio.created_at.desc()).all()
        return [
            PortfolioModel(
                id=p.id,
                name=p.name,
                tickers=p.tickers,
                weights=p.weights,
                created_at=p.created_at.isoformat()
            )
            for p in ports
        ]
    finally:
        db.close()

def get_portfolio(portfolio_id: str) -> Optional[PortfolioModel]:
    db = SessionLocal()
    try:
        p = db.query(DBPortfolio).filter(DBPortfolio.id == portfolio_id).first()
        if p:
            return PortfolioModel(
                id=p.id,
                name=p.name,
                tickers=p.tickers,
                weights=p.weights,
                created_at=p.created_at.isoformat()
            )
        return None
    finally:
        db.close()

def delete_portfolio(portfolio_id: str) -> bool:
    db = SessionLocal()
    try:
        p = db.query(DBPortfolio).filter(DBPortfolio.id == portfolio_id).first()
        if p:
            db.delete(p)
            db.commit()
            return True
        return False
    finally:
        db.close()
