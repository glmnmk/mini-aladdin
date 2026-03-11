from pydantic import BaseModel
from typing import List, Dict, Any

class PortfolioRequest(BaseModel):
    tickers: List[str]
    period: str = "5y"
    num_simulations: int = 5000

class PortfolioResponse(BaseModel):
    tickers: List[str]
    results: List[Dict[str, float]] # list of points (ret, vol, sharpe)
    max_sharpe_portfolio: Dict[str, Any]
    min_vol_portfolio: Dict[str, Any]
    individual_assets: List[Dict[str, Any]] # NEW: Single asset metrics

class BacktestRequest(BaseModel):
    tickers: List[str]
    weights: Dict[str, float]
    period: str = "5y"

class BacktestResponse(BaseModel):
    dates: List[str]
    portfolio_cumulative_return: List[float]
    benchmark_cumulative_return: List[float]
    metrics: Dict[str, float]


class ProjectionRequest(BaseModel):
    tickers: List[str]
    weights: Dict[str, float]
    initial_investment: float = 100000.0
    years: int = 30
    num_paths: int = 5000
    period: str = "5y"

class CorrelationResponse(BaseModel):
    tickers: List[str]
    matrix: List[List[float]]

class FactorAnalysisResponse(BaseModel):
    alpha: float
    market_beta: float
    size_beta: float
    value_beta: float
    r_squared: float

class AttributionResponse(BaseModel):
    total_return: float
    contributions: Dict[str, float]

class BLView(BaseModel):
    asset: str
    view: float
    confidence: float

class BLViewsRequest(BaseModel):
    tickers: List[str]
    api_key: str

class BLOptimizationRequest(BaseModel):
    tickers: List[str]
    views: List[BLView]
    market_weights: Dict[str, float]
    period: str = "5y"

class BLOptimizationResponse(BaseModel):
    prior_returns: Dict[str, float]
    posterior_returns: Dict[str, float]
    weights: Dict[str, float]

class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
