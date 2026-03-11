from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from .market_data import fetch_historical_data, fetch_fama_french_data
from .engine import run_monte_carlo, optimize_portfolio, backtest_portfolio, stress_test_portfolio, calculate_correlation, analyze_risk_factors, calculate_attribution, black_litterman_optimization, calculate_historical_var_cvar, calculate_mctr, project_wealth, calculate_relative_performance
from .models import PortfolioRequest, PortfolioResponse, BacktestRequest, BacktestResponse, CorrelationResponse, FactorAnalysisResponse, AttributionResponse, BLViewsRequest, BLOptimizationRequest, BLOptimizationResponse, UserCreate, UserLogin, TokenResponse, ProjectionRequest
from .ai_analyst import get_ai_analysis, get_mock_analysis, AIAnalysisRequest, generate_bl_views
from .storage import save_portfolio, list_portfolios, delete_portfolio, PortfolioModel, register_user, verify_user
from typing import List, Dict
from pydantic import BaseModel

app = FastAPI(title="MaaS API", description="Monte Carlo Portfolio Optimization Engine")

# ... CORS ...

class SavePortfolioRequest(BaseModel):
    name: str
    tickers: List[str]
    weights: Dict[str, float]

@app.post("/portfolios", response_model=PortfolioModel)
def create_portfolio(request: SavePortfolioRequest):
    return save_portfolio(request.name, request.tickers, request.weights)

@app.get("/portfolios", response_model=List[PortfolioModel])
def get_all_portfolios():
    return list_portfolios()

@app.delete("/portfolios/{portfolio_id}")
def remove_portfolio(portfolio_id: str):
    success = delete_portfolio(portfolio_id)
    if not success:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"status": "deleted"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MaaS Engine is Running"}

# --- Authentication Endpoints ---

@app.post("/register", response_model=TokenResponse)
def register(user: UserCreate):
    new_user = register_user(user.email, user.password)
    if not new_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    import uuid
    # Generate a simple session token (In production, use JWT)
    token = str(uuid.uuid4())
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": new_user["id"],
        "email": new_user["email"]
    }

@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin):
    verified_user = verify_user(user.email, user.password)
    if not verified_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    import uuid
    # Generate a simple session token
    token = str(uuid.uuid4())
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": verified_user["id"],
        "email": verified_user["email"]
    }

import requests

@app.get("/search")
def search_tickers(q: str):
    """
    Proxy endpoint to Yahoo Finance autocomplete API for ticker search.
    """
    if not q:
        return {"results": []}
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=5)
        data = response.json()
        quotes = data.get("quotes", [])
        results = [{"symbol": q.get("symbol"), "name": q.get("shortname", q.get("longname", ""))} 
                   for q in quotes if q.get("quoteType") in ["EQUITY", "ETF", "MUTUALFUND"] and "symbol" in q]
        return {"results": results[:8]} # Return top 8
    except Exception as e:
        return {"results": []}


# ... existing code ...

@app.post("/metrics")
async def calculate_metrics(request: BacktestRequest):
    """
    Calculates metrics for a specific portfolio allocation (Manual Mode).
    """
    try:
        log_returns = fetch_historical_data(request.tickers, period=request.period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
        
    if log_returns.empty:
        raise HTTPException(status_code=400, detail="No data found")

    mean_returns = log_returns.mean()
    cov_matrix = log_returns.cov()
    risk_free_rate = 0.04
    
    # Calculate metrics for the specific weights
    weights_array = np.array([request.weights.get(t, 0) for t in request.tickers])
    
    # Normalize if needed, though frontend should send valid weights
    if np.sum(weights_array) == 0:
        return {"return": 0, "volatility": 0, "sharpe": 0}
        
    ret = np.sum(mean_returns * weights_array) * 252
    vol = np.sqrt(np.dot(weights_array.T, np.dot(cov_matrix, weights_array))) * np.sqrt(252)
    sharpe = (ret - risk_free_rate) / vol
    
    basic_metrics = {"return": float(ret), "volatility": float(vol), "sharpe": float(sharpe)}
    
    # 1. Factor Analysis
    try:
        ff_data = fetch_fama_french_data(period=request.period)
        portfolio_returns = log_returns.dot(weights_array)
        factor_res = analyze_risk_factors(portfolio_returns, ff_data)
    except:
        factor_res = None
        
    # 2. Attribution
    try:
        attr_res = calculate_attribution(log_returns, request.weights, None)
    except:
        attr_res = None
        
    # 3. Correlation Matrix
    try:
        corr_matrix = calculate_correlation(log_returns)
    except:
        corr_matrix = []
        
    # 4. Stress Testing
    try:
        benchmark_returns = fetch_historical_data(["SPY"], period=request.period)
        f_beta = factor_res.get("market_beta") if factor_res else None
        stress_res = stress_test_portfolio(log_returns, request.weights, benchmark_returns, force_beta=f_beta)
    except:
        stress_res = None
        
    # 5. Advanced Risk (VaR & MCTR)
    try:
        var_metrics = calculate_historical_var_cvar(log_returns, request.weights)
        mctr_metrics = calculate_mctr(log_returns, request.weights)
    except:
        var_metrics = None
        mctr_metrics = None
    
    # 6. Benchmark Metrics
    try:
        benchmark_returns = fetch_historical_data(["SPY"], period=request.period)
        portfolio_returns = log_returns.dot(weights_array)
        benchmark_metrics = calculate_relative_performance(portfolio_returns, benchmark_returns, risk_free_rate)
    except:
        benchmark_metrics = None
        
    return {
        "metrics": basic_metrics,
        "factor_analysis": factor_res,
        "attribution": attr_res,
        "correlation": corr_matrix,
        "stress_test": stress_res,
        "var_metrics": var_metrics,
        "mctr_metrics": mctr_metrics,
        "benchmark_metrics": benchmark_metrics,
        "metadata": {
            "period": request.period,
            "risk_free_rate": risk_free_rate
        }
    }

@app.post("/backtest", response_model=BacktestResponse)
async def backtest(request: BacktestRequest):
    """
    Runs a historical backtest validation against SPY.
    """
    try:
        # Fetch Portfolio Data
        log_returns = fetch_historical_data(request.tickers, period=request.period)
        
        # Fetch Benchmark Data (SPY)
        benchmark_returns = fetch_historical_data(["SPY"], period=request.period)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
        
    if log_returns.empty or benchmark_returns.empty:
        raise HTTPException(status_code=400, detail="No data found")

    # Run Backtest
    results = backtest_portfolio(log_returns, request.weights, benchmark_returns)
    
    # Calculate final cumulative return for metrics
    if not results["portfolio"]:
         return BacktestResponse(dates=[], portfolio_cumulative_return=[], benchmark_cumulative_return=[], metrics={})

    final_port_ret = results["portfolio"][-1]
    final_bench_ret = results["benchmark"][-1]
    
    return BacktestResponse(
        dates=results["dates"],
        portfolio_cumulative_return=results["portfolio"],
        benchmark_cumulative_return=results["benchmark"],
        metrics={
            "portfolio_total_return": final_port_ret,
            "benchmark_total_return": final_bench_ret,
            "outperformance": final_port_ret - final_bench_ret
        }
    )


@app.post("/stress_test")
async def stress_test(request: BacktestRequest):
    """
    Runs stress tests on the portfolio using historical and hypothetical scenarios.
    """
    try:
        # Fetch Portfolio Data
        log_returns = fetch_historical_data(request.tickers, period=request.period)
        
        # Fetch Benchmark Data (SPY) for Beta calculation
        benchmark_returns = fetch_historical_data(["SPY"], period=request.period)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
        
    if log_returns.empty or benchmark_returns.empty:
        raise HTTPException(status_code=400, detail="No data found")

    # Run Stress Test
    results = stress_test_portfolio(log_returns, request.weights, benchmark_returns)
    
    return results


@app.post("/projection")
async def get_wealth_projection(request: ProjectionRequest):
    """
    Simulates long-term wealth projection using Geometric Brownian Motion.
    Returns the 10th, 50th, and 90th percentile wealth curves over time.
    """
    try:
        # 1. Fetch historical portfolio log returns
        log_returns = fetch_historical_data(request.tickers, period=request.period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
        
    if log_returns.empty:
        raise HTTPException(status_code=400, detail="No data found")
        
    # 2. Run GBM simulation
    results = project_wealth(
        log_returns,
        request.weights,
        initial_investment=request.initial_investment,
        years=request.years,
        num_paths=request.num_paths
    )
    
    return {"projection": results}


@app.post("/correlation", response_model=CorrelationResponse)
async def get_correlation(request: BacktestRequest):
    """
    Calculates the correlation matrix for the selected assets.
    """
    try:
        # Fetch Data
        log_returns = fetch_historical_data(request.tickers, period=request.period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
        
    if log_returns.empty:
        raise HTTPException(status_code=400, detail="No data found")

    matrix = calculate_correlation(log_returns)
    
    return CorrelationResponse(
        tickers=request.tickers,
        matrix=matrix
    )


@app.post("/factor_analysis", response_model=FactorAnalysisResponse)
async def get_factor_analysis(request: BacktestRequest):
    """
    Performs Fama-French 3-Factor Analysis on the portfolio.
    """
    try:
        # 1. Fetch Portfolio Data
        log_returns = fetch_historical_data(request.tickers, period=request.period)
        
        if log_returns.empty:
            raise HTTPException(status_code=400, detail="No portfolio data found")
            
        # Calculate Portfolio Returns (weighted)
        weights_array = np.array([request.weights.get(t, 0) for t in request.tickers])
        if np.sum(weights_array) == 0:
             raise HTTPException(status_code=400, detail="Weights cannot be zero")
             
        portfolio_returns = log_returns.dot(weights_array)
        
        # 2. Fetch F-F Data
        ff_data = fetch_fama_french_data(period=request.period)
        
        if ff_data.empty:
             raise HTTPException(status_code=500, detail="Failed to fetch Fama-French data")

        # 3. Run Regression
        results = analyze_risk_factors(portfolio_returns, ff_data)
        
        if not results:
             raise HTTPException(status_code=400, detail="Regression failed (insufficient overlapping data)")
             
        return FactorAnalysisResponse(**results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in factor analysis: {str(e)}")


@app.post("/attribution", response_model=AttributionResponse)
async def get_attribution(request: BacktestRequest):
    """
    Calculates Performance Attribution (Contribution to Return).
    """
    try:
        # 1. Fetch Portfolio Data
        log_returns = fetch_historical_data(request.tickers, period=request.period)
        
        if log_returns.empty:
            raise HTTPException(status_code=400, detail="No portfolio data found")
            
        # 2. Fetch Benchmark Data (SPY) for comparison context (optional for CTR but good for future)
        # We need asset-level returns, not just portfolio level.
        # fetch_historical_data returns a DataFrame of asset log returns.
        
        # 3. Calculate Attribution
        results = calculate_attribution(log_returns, request.weights, None)
        
        return AttributionResponse(**results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in attribution: {str(e)}")


@app.post("/ask")
async def ask_analyst(request: AIAnalysisRequest):
    """
    Routes query to Gemini AI Analyst.
    """
    # DEMO MODE
    if request.api_key.lower().strip() == "demo":
        return get_mock_analysis(request)

    result = get_ai_analysis(request)
    if "error" in result:
        # Return the error payload so frontend can display it
        return result
    return result

@app.post("/ask/views")
async def get_macro_views(request: BLViewsRequest):
    """
    Generates AI-driven structural views for Black-Litterman Optimization.
    """
    result = generate_bl_views(request)
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@app.post("/optimize/black_litterman", response_model=BLOptimizationResponse)
async def optimize_bl(request: BLOptimizationRequest):
    """
    Runs the Black-Litterman Optimization model incorporating AI views.
    """
    try:
        log_returns = fetch_historical_data(request.tickers, period=request.period)
        if log_returns.empty:
            raise HTTPException(status_code=400, detail="No data found")
            
        # Annualize inputs for Black-Litterman since views are annualized
        ann_mean_returns = log_returns.mean() * 252
        ann_cov_matrix = log_returns.cov() * 252
        
        # Build P (asset mapping) and Q (view values) matrices
        N = len(request.tickers)
        views_P = []
        views_Q = []
        
        for view in request.views:
            if view.asset in request.tickers:
                idx = request.tickers.index(view.asset)
                row = [0.0] * N
                row[idx] = 1.0  # Absolute view on this specific asset
                views_P.append(row)
                views_Q.append(view.view)
                
        # Run Mathematical Optimization
        result = black_litterman_optimization(
            ann_mean_returns,
            ann_cov_matrix,
            views_P,
            views_Q,
            request.market_weights
        )
        return BLOptimizationResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in Black-Litterman: {str(e)}")




@app.get("/")
def read_root():
    return {"status": "ok", "message": "Mini-Aladdin Engine is Running"}

@app.post("/analyze", response_model=PortfolioResponse)
async def analyze_portfolio(request: PortfolioRequest):
    if len(request.tickers) < 2:
        raise HTTPException(status_code=400, detail="Please provide at least 2 tickers")
        
    # 1. Fetch Data
    try:
        log_returns = fetch_historical_data(request.tickers, period=request.period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching data: {str(e)}")
        
    if log_returns.empty:
        raise HTTPException(status_code=400, detail="No data found for tickers")
        
    mean_returns = log_returns.mean()
    cov_matrix = log_returns.cov()
    risk_free_rate = 0.04 # hardcoded for now, could be dynamic
    
    # 2. Run Monte Carlo
    mc_results = run_monte_carlo(mean_returns, cov_matrix, request.num_simulations, risk_free_rate)
    
    # Format MC results for frontend: array of {return, volatility, sharpe}
    sim_data = []
    results_array = mc_results["results"]
    for i in range(results_array.shape[1]):
        sim_data.append({
            "return": float(results_array[0, i]),
            "volatility": float(results_array[1, i]),
            "sharpe": float(results_array[2, i])
        })
        
    # 3. Optimize
    opt_results = optimize_portfolio(mean_returns, cov_matrix, risk_free_rate)
    
    max_sharpe_weights = dict(zip(request.tickers, opt_results["max_sharpe"].x))
    min_vol_weights = dict(zip(request.tickers, opt_results["min_vol"].x))
    
    # helper for metrics
    def get_metrics(res):
        ret = np.sum(mean_returns * res.x) * 252
        vol = np.sqrt(np.dot(res.x.T, np.dot(cov_matrix, res.x))) * np.sqrt(252)
        sharpe = (ret - risk_free_rate) / vol
        return {"return": float(ret), "volatility": float(vol), "sharpe": float(sharpe)}

    # 4. Individual Asset Metrics
    from .market_data import is_bond_etf, get_bond_metadata, fetch_current_prices, fetch_risk_free_rate, get_asset_class, get_asset_metadata
    from .engine import calculate_ytm, calculate_duration_convexity
    
    individual_assets = []
    daily_std = log_returns.std()
    
    current_prices = fetch_current_prices(request.tickers)
    
    for ticker in request.tickers:
        ann_ret = mean_returns[ticker] * 252
        ann_vol = daily_std[ticker] * np.sqrt(252)
        geo_meta = get_asset_metadata(ticker)
        
        asset_info = {
            "ticker": ticker,
            "return": float(ann_ret),
            "volatility": float(ann_vol),
            "sharpe": float((ann_ret - risk_free_rate) / ann_vol if ann_vol > 0 else 0),
            "is_bond": False,
            "asset_class": get_asset_class(ticker),
            "country": geo_meta["country"],
            "sector": geo_meta["sector"]
        }
        
        if is_bond_etf(ticker) and ticker in current_prices:
            meta = get_bond_metadata(ticker)
            price = current_prices[ticker]
            # Calculate YTM
            ytm = calculate_ytm(price, meta["face_value"], meta["coupon"], meta["maturity"])
            # Calculate Duration/Convexity
            bond_stats = calculate_duration_convexity(ytm, meta["coupon"], meta["maturity"], face_value=meta["face_value"])
            
            asset_info["is_bond"] = True
            asset_info["ytm"] = float(ytm)
            asset_info["macaulay_duration"] = bond_stats["macaulay_duration"]
            asset_info["modified_duration"] = bond_stats["modified_duration"]
            asset_info["convexity"] = bond_stats["convexity"]
            
        individual_assets.append(asset_info)

    return PortfolioResponse(
        tickers=request.tickers,
        results=sim_data,
        max_sharpe_portfolio={
            "weights": max_sharpe_weights,
            "metrics": get_metrics(opt_results["max_sharpe"])
        },
        min_vol_portfolio={
            "weights": min_vol_weights,
            "metrics": get_metrics(opt_results["min_vol"])
        },
        individual_assets=individual_assets
    )
