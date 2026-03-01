import numpy as np
import pandas as pd
import scipy.optimize as sco
import statsmodels.api as sm

# Simulation Constants

def run_monte_carlo(mean_returns, cov_matrix, num_simulations, risk_free_rate):
    """
    Runs Monte Carlo simulations to generate random portfolios.
    Returns a dictionary with results.
    """
    num_assets = len(mean_returns)
    
    # 1. Generate random weights (num_simulations x num_assets)
    weights = np.random.random((num_simulations, num_assets))
    
    # 2. Normalize weights to sum to 1
    weights = weights / np.sum(weights, axis=1)[:, np.newaxis]
    
    # 3. Calculate Portfolio Returns
    # Matrix multiplication: (N x M) @ (M) -> (N)
    portfolio_returns = np.dot(weights, mean_returns) * 252
    
    # 4. Calculate Portfolio Volatility
    # Variance = w.T @ Cov @ w
    # We need diagonal of (weights @ cov @ weights.T) but that's expensive (NxN)
    # Instead: sum( (weights @ cov) * weights, axis=1 )
    # weights @ cov -> (N, M)
    # (weights @ cov) * weights -> (N, M) element-wise
    # sum(..., axis=1) -> (N)
    portfolio_variance = np.sum(np.dot(weights, cov_matrix) * weights, axis=1) * 252
    portfolio_std_devs = np.sqrt(portfolio_variance)
    
    # 5. Calculate Sharpe Ratios
    sharpe_ratios = (portfolio_returns - risk_free_rate) / portfolio_std_devs
    
    # 6. Assemble Results
    # Shape: (3, num_simulations) -> [returns, vols, sharpes]
    results = np.vstack([portfolio_returns, portfolio_std_devs, sharpe_ratios])
    
    return {
        "results": results,
        "weights": weights # This is now a numpy array (N, M)
    }

def optimize_portfolio(mean_returns, cov_matrix, risk_free_rate):
    """
    Finds the Max Sharpe Ratio and Min Volatility portfolios using Scipy Optimize.
    """
    num_assets = len(mean_returns)
    args = (mean_returns, cov_matrix, risk_free_rate)
    
    # Constraints: sum of weights = 1
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    
    # Bounds: weights between 0 and 1
    bounds = tuple((0, 1) for asset in range(num_assets))
    
    # helper for negative sharpe
    def neg_sharpe_ratio(weights, mean_returns, cov_matrix, risk_free_rate):
        p_ret = np.sum(mean_returns * weights) * 252
        p_var = np.dot(weights.T, np.dot(cov_matrix, weights)) * 252
        p_std = np.sqrt(p_var)
        return -(p_ret - risk_free_rate) / p_std
    
    # helper for portfolio volatility
    def portfolio_volatility(weights, mean_returns, cov_matrix, risk_free_rate):
        return np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)

    # Max Sharpe
    max_sharpe = sco.minimize(neg_sharpe_ratio, num_assets*[1./num_assets,], args=args,
                        method='SLSQP', bounds=bounds, constraints=constraints)
    
    # Min Volatility
    min_vol = sco.minimize(portfolio_volatility, num_assets*[1./num_assets,], args=args,
                        method='SLSQP', bounds=bounds, constraints=constraints)
                        
    return {
        "max_sharpe": max_sharpe,
        "min_vol": min_vol
    }

def backtest_portfolio(log_returns, weights, benchmark_log_returns):
    """
    Calculates cumulative returns for a portfolio vs a benchmark.
    Returns timeseries data.
    """
    # 1. Align dates
    common_index = log_returns.index.intersection(benchmark_log_returns.index)
    portfolio_log_ret = log_returns.loc[common_index]
    benchmark_log_ret = benchmark_log_returns.loc[common_index]
    
    # 2. Calculate Portfolio Daily Returns (weighted sum of asset returns)
    # Convert log returns back to simple returns for portfolio aggregation approximation
    # or just use weighted average of log returns (simpler but slightly less accurate for large moves)
    # Let's use weighted log returns for consistency with the engine
    
    # Weights array aligned with columns
    weights_array = np.array([weights[ticker] for ticker in log_returns.columns])
    
    port_daily_log_ret = np.dot(portfolio_log_ret, weights_array)
    
    # 3. Cumulative Returns
    port_cum_ret = np.exp(np.cumsum(port_daily_log_ret)) - 1
    bench_cum_ret = np.exp(np.cumsum(benchmark_log_ret)) - 1
    
    return {
        "dates": common_index.strftime('%Y-%m-%d').tolist(),
        "portfolio": port_cum_ret.tolist(),
        "benchmark": bench_cum_ret.tolist()
    }

# Scenarios defined as percentage drops/gains for asset classes (simplified for now as flat drops)
# In a real app, we'd map tickers to sectors/asset classes and apply specific shocks.
# For MaaS v1, we'll apply a market beta approximation or just flat shocks if beta is 1.

# Better approach: market moves. If SPY moves -20%, how does this portfolio move?
# We can calculate the portfolio's Beta to SPY and apply the shock.

STRESS_SCENARIOS = {
    "2008 Financial Crisis (-55.0% Market Drop)": -0.55, 
    "2020 COVID Crash (-34.0% Market Drop)": -0.34,      
    "2022 Tech Bear Market (-20.0% Broad Market Drop)": -0.20, 
    "Standard Correction (-10.0% Market Drop)": -0.10,
    "Interest Rate Hike Shock (-15.0% Equity Reaction)": -0.15 
}

def stress_test_portfolio(log_returns, weights, benchmark_log_returns, force_beta=None):
    """
    Simulates portfolio performance under stress scenarios based on Beta to SPY.
    """
    # 1. Align dates
    common_index = log_returns.index.intersection(benchmark_log_returns.index)
    if len(common_index) < 30: # Need some history for Beta
        # Fallback: Just return scenarios assuming Beta=1
        return {
            "beta": 1.0, 
            "scenarios": {name: drop for name, drop in STRESS_SCENARIOS.items()}
        }

    port_log_ret = log_returns.loc[common_index]
    bench_log_ret = benchmark_log_returns.loc[common_index] # Series
    
    # 2. Calculate Portfolio Daily Returns
    weights_array = np.array([weights.get(t, 0) for t in log_returns.columns])
    port_daily_ret = np.dot(port_log_ret, weights_array) # (N,)
    
    # 3. Calculate Beta
    if force_beta is not None:
        beta = force_beta
    else:
        # Beta = Cov(Port, Bench) / Var(Bench)
        # Ensure 1D arrays for np.cov
        if isinstance(bench_log_ret, pd.DataFrame):
            bench_series = bench_log_ret.iloc[:, 0]
        else:
            bench_series = bench_log_ret
            
        covariance_matrix = np.cov(port_daily_ret, bench_series)
        # covariance_matrix is [[Var(Port), Cov(P,B)], [Cov(P,B), Var(Bench)]]
        cov_pb = covariance_matrix[0, 1]
        var_b = covariance_matrix[1, 1]
        
        beta = cov_pb / var_b if var_b != 0 else 1.0
    
    # 4. Apply Beta to Scenarios
    results = {}
    for scenario_name, market_drop in STRESS_SCENARIOS.items():
        # Expected Portfolio Drop = Beta * Market Drop
        # We cap the drop at -100% just in case
        projected_drop = beta * market_drop
        results[scenario_name] = max(projected_drop, -1.0)
        
    return {
        "beta": float(beta), # Return beta so frontend can show it
        "scenarios": results
    }

def calculate_correlation(log_returns):
    """
    Calculates the correlation matrix for the given log returns.
    """
    if log_returns.empty:
        return []
    
    # Calculate Correlation Matrix
    # Using Pearson correlation
    corr_matrix = log_returns.corr()
    
    # Convert properly to list of lists for JSON serialization
    # Replace NaN with 0 or 1? NaN usually happens if constant price.
    # Let's fill NaNs with 0 (uncorrelated)
    corr_matrix = corr_matrix.fillna(0)
    
    return corr_matrix.values.tolist()


def analyze_risk_factors(portfolio_returns: pd.Series, ff_factors: pd.DataFrame):
    """
    Regresses portfolio returns against Fama-French factors to find betas.
    """
    if portfolio_returns.empty or ff_factors.empty:
        return {}
        
    # Align data by Date index
    # Join inner to ensure dates match
    combined = pd.concat([portfolio_returns, ff_factors], axis=1, join="inner").dropna()
    
    if combined.empty:
        return {}
        
    # Y = Portfolio Excess Return (Port Ret - Risk Free)
    # But F-F Mkt-RF is already excess.
    # We should subtract RF from Portfolio Returns to get Excess Return, 
    # OR simpler: Regress Port Return against Mkt-RF. The intercept (alpha) handles the rest.
    # Strict F-F model: (Rp - Rf) = Alpha + b1*(Rm-Rf) + b2*(SMB) + b3*(HML)
    
    # Let's get Excess Portfolio Returns
    # FF factors usually include 'RF' column
    if 'RF' in combined.columns:
        Y = combined.iloc[:, 0] - combined['RF']
        X = combined[['Mkt-RF', 'SMB', 'HML']] # Independent variables
    else:
        # Fallback if RF missing
        Y = combined.iloc[:, 0]
        X = combined.iloc[:, 1:4] # Assume first 3 are factors
        
    # Add constant for Alpha
    X = sm.add_constant(X)
    
    # Run OLS Regression
    model = sm.OLS(Y, X).fit()
    
    # Extract results
    results = {
        "alpha": float(model.params.get('const', 0) * 252), # Annualized Alpha
        "market_beta": float(model.params.get('Mkt-RF', 0)),
        "size_beta": float(model.params.get('SMB', 0)),
        "value_beta": float(model.params.get('HML', 0)),
        "r_squared": float(model.rsquared)
    }
    
    return results

def black_litterman_optimization(mean_returns, cov_matrix, views_P, views_Q, market_weights, tau=0.05):
    """
    Performs Black-Litterman Optimization.
    Returns posterior expected returns.
    
    mean_returns: dict/series of historical returns (used as a fallback or base)
    cov_matrix: DataFrame of covariance
    views_P: Matrix mapping views to assets (K x N)
    views_Q: Vector of expected returns for the views (K x 1)
    market_weights: Series or dict of market cap weights for the implied return calculation
    tau: Weight on prior (scalar)
    """
    num_assets = len(mean_returns)
    tickers = list(mean_returns.index) if hasattr(mean_returns, 'index') else list(mean_returns.keys())
    
    # 1. Convert to numpy arrays aligned with tickers
    cov_arr = cov_matrix.values if hasattr(cov_matrix, 'values') else np.array(cov_matrix)
    mkt_w = np.array([market_weights.get(t, 1.0/num_assets) for t in tickers]) # Normalize to 1
    mkt_w = mkt_w / np.sum(mkt_w) 
    
    # 2. Implied Equilibrium Returns (Prior)
    # Pi = lambda * Sigma * w_mkt
    # We estimate risk aversion parameter lambda (delta) ~ 2.5 historically
    risk_aversion = 2.5 
    Pi = risk_aversion * np.dot(cov_arr, mkt_w)
    
    # Check if there are any views. If not, just return implied returns.
    if len(views_P) == 0:
         # Optimize using Implied Returns instead of Historical
         return _optimize_bl_weights(Pi, cov_arr, num_assets)
         
    # 3. View Matrices
    P = np.array(views_P)
    Q = np.array(views_Q).reshape(-1, 1)
    
    # 4. Uncertainty Matrix of Views (Omega)
    # Omega = diag(P * (tau * Sigma) * P^T) -> A common heuristic
    tau_cov = tau * cov_arr
    omega = np.dot(np.dot(P, tau_cov), P.T)
    # Extract diagonal to make it diagonal matrix as expected
    omega = np.diag(np.diag(omega))
    
    # 5. Calculate Posterior Expected Returns
    # E[R] = [(tau*Sigma)^-1 + P^T * Omega^-1 * P]^-1 * [(tau*Sigma)^-1 * Pi + P^T * Omega^-1 * Q]
    tau_cov_inv = np.linalg.inv(tau_cov)
    omega_inv = np.linalg.inv(omega)
    
    term1 = np.linalg.inv(tau_cov_inv + np.dot(np.dot(P.T, omega_inv), P))
    term2 = np.dot(tau_cov_inv, Pi.reshape(-1, 1)) + np.dot(np.dot(P.T, omega_inv), Q)
    
    posterior_expected_returns = np.dot(term1, term2).flatten()
    
    # 6. Optimize using Posterior Returns
    weights = _optimize_bl_weights(posterior_expected_returns, cov_arr, num_assets)
    
    # Format and return results
    return {
        "prior_returns": {t: float(Pi[i]) for i, t in enumerate(tickers)},
        "posterior_returns": {t: float(posterior_expected_returns[i]) for i, t in enumerate(tickers)},
        "weights": {t: float(weights[i]) for i, t in enumerate(tickers)}
    }

def _optimize_bl_weights(expected_returns, cov_matrix, num_assets):
    """Helper to run pure Mean-Variance on the new B-L expected returns"""
    # Maximize Return - lambda/2 * Variance (Quadratic Utility)
    # Using Scipy SLSQP similar to engine.py
    def neg_quadratic_utility(weights, exp_ret, cov, risk_aversion=2.5):
        port_return = np.sum(exp_ret * weights)
        port_var = np.dot(weights.T, np.dot(cov, weights))
        return -(port_return - (risk_aversion / 2) * port_var)

        
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0, 1) for _ in range(num_assets))
    
    result = sco.minimize(neg_quadratic_utility, num_assets*[1./num_assets,], 
                          args=(expected_returns, cov_matrix),
                          method='SLSQP', bounds=bounds, constraints=constraints)
                          
    return result.x



def calculate_attribution(asset_returns_df: pd.DataFrame, portfolio_weights: dict, benchmark_returns: pd.Series):
    """
    Calculates Contribution to Return (CTR) for each asset.
    CTR = Weight * Cumulative Return of Asset
    """
    if asset_returns_df.empty:
        return {}
        
    # 1. Calculate Cumulative Return for each asset
    # asset_returns_df is daily log returns
    # Cumulative return = exp(sum(log_ret)) - 1
    asset_cum_rets = np.exp(asset_returns_df.sum()) - 1
    
    # 2. Calculate Portfolio Total Return (approx)
    portfolio_ctr = {}
    total_ret = 0
    
    for ticker, weight in portfolio_weights.items():
        if ticker in asset_cum_rets:
            ret = asset_cum_rets[ticker]
            ctr = weight * ret
            portfolio_ctr[ticker] = float(ctr)
            total_ret += ctr
            
    # Convert absolute contribution to relative contribution (percentage of total return)
    if total_ret != 0:
        for ticker in portfolio_ctr:
            portfolio_ctr[ticker] = portfolio_ctr[ticker] / total_ret
            
    # 3. Sort by contribution
    sorted_ctr = dict(sorted(portfolio_ctr.items(), key=lambda item: item[1], reverse=True))
    
    return {
        "total_return": float(total_ret),
        "contributions": sorted_ctr
    }

def calculate_ytm(price, face_value, coupon_rate, years_to_maturity, payment_freq=2):
    """
    Calculate the Yield to Maturity (YTM) of a bond using the Newton-Raphson method.
    """
    coupon_payment = (coupon_rate * face_value) / payment_freq
    periods = years_to_maturity * payment_freq
    
    def ytm_func(y):
        # Present value of coupon payments
        pv_coupons = sum([coupon_payment / ((1 + y / payment_freq) ** t) for t in range(1, int(periods) + 1)])
        # Present value of face value
        pv_face = face_value / ((1 + y / payment_freq) ** periods)
        return pv_coupons + pv_face - price
        
    try:
        # Initial guess can be the coupon rate
        ytm = sco.newton(ytm_func, coupon_rate)
        return float(ytm)
    except RuntimeError:
        return float(coupon_rate) # Fallback

def calculate_duration_convexity(ytm, coupon_rate, years_to_maturity, payment_freq=2, face_value=100):
    """
    Calculates Macaulay Duration, Modified Duration, and Convexity for a bond.
    Returns Annualized Macaulay Duration, Annualized Modified Duration, and Convexity.
    """
    # Handle zero-coupon short term cases
    if years_to_maturity <= 0:
        return {"macaulay_duration": 0.0, "modified_duration": 0.0, "convexity": 0.0, "price": face_value}

    coupon_payment = (coupon_rate * face_value) / payment_freq
    periods = int(years_to_maturity * payment_freq)
    
    # If maturity is less than 1 payment period
    if periods == 0:
        periods = 1
        payment_freq = 1 / years_to_maturity
    
    mac_dur_numerator = 0
    pv_total = 0
    convexity_numerator = 0
    
    for t in range(1, periods + 1):
        cf = coupon_payment
        if t == periods:
            cf += face_value
            
        discount_factor = (1 + ytm / payment_freq) ** t
        pv_cf = cf / discount_factor
        
        pv_total += pv_cf
        mac_dur_numerator += t * pv_cf
        convexity_numerator += cf * (t * (t + 1)) / (discount_factor * (1 + ytm / payment_freq)**2)
        
    macaulay_duration_periods = mac_dur_numerator / pv_total if pv_total > 0 else 0
    macaulay_duration_years = macaulay_duration_periods / payment_freq
    
    modified_duration_years = macaulay_duration_years / (1 + ytm / payment_freq)
    
    convexity = (convexity_numerator / pv_total) / (payment_freq ** 2) if pv_total > 0 else 0
    
    return {
        "macaulay_duration": float(macaulay_duration_years),
        "modified_duration": float(modified_duration_years),
        "convexity": float(convexity),
        "price": float(pv_total)
    }

def calculate_historical_var_cvar(log_returns: pd.DataFrame, portfolio_weights: dict, conf_level: float = 0.95):
    """
    Calculates 1-Day Historical Value at Risk (VaR) and Expected Shortfall (CVaR).
    """
    if log_returns.empty:
         return {"var_1d": 0.0, "cvar_1d": 0.0}
         
    # 1. Calculate daily portfolio log returns
    weights_array = np.array([portfolio_weights.get(t, 0) for t in log_returns.columns])
    if np.sum(weights_array) == 0:
         return {"var_1d": 0.0, "cvar_1d": 0.0}
         
    port_daily_rets = np.dot(log_returns, weights_array)
    
    # 2. Sort returns from worst to best
    sorted_rets = np.sort(port_daily_rets)
    
    # 3. Find the VaR index
    # e.g. for 5% of 1000 days = 50th worst day
    index = int((1 - conf_level) * len(sorted_rets))
    
    if index < 0 or index >= len(sorted_rets):
         return {"var_1d": 0.0, "cvar_1d": 0.0}
         
    # VaR is the return at the index (usually expressed as a positive number or negative, we keep it as a metric)
    var_1d = sorted_rets[index]
    
    # 4. CVaR (Expected Shortfall) is the average of all returns worse than VaR
    if index > 0:
        cvar_1d = sorted_rets[:index].mean()
    else:
        cvar_1d = var_1d
        
    return {
        "var_1d": float(var_1d),
        "cvar_1d": float(cvar_1d)
    }

def calculate_mctr(log_returns: pd.DataFrame, portfolio_weights: dict):
    """
    Calculates Percentage Marginal Contribution to Total Risk (%CTR) for each asset.
    Uses Matrix Calculus: (Weight_i * Marginal_Risk_i) / Total_Portfolio_Volatility.
    """
    if log_returns.empty:
        return {}
        
    tickers = log_returns.columns
    weights_array = np.array([portfolio_weights.get(t, 0) for t in tickers])
    
    if np.sum(weights_array) == 0:
         return {t: 0.0 for t in tickers}
         
    # We use annualized covariance for standard reporting
    cov_matrix = log_returns.cov().values * 252 
    
    # 1. Portfolio Variance & Volatility
    port_var = np.dot(weights_array.T, np.dot(cov_matrix, weights_array))
    if port_var <= 0:
         return {t: 0.0 for t in tickers}
         
    port_vol = np.sqrt(port_var)
    
    # 2. Marginal Risk (Derivative of portfolio vol with respect to asset weight)
    # MR_vector = (Cov_Matrix * Weights) / Port_Vol
    marginal_risk = np.dot(cov_matrix, weights_array) / port_vol
    
    # 3. Component Contribution to Total Risk (CTR)
    # CTR_i = w_i * MR_i
    ctr = weights_array * marginal_risk
    
    # 4. Percentage Contribution to Total Risk (%CTR)
    # They should sum to 1.0 (100% of the portfolio's risk)
    pct_ctr = ctr / port_vol
    
    return {ticker: float(pct) for ticker, pct in zip(tickers, pct_ctr)}

def project_wealth(log_returns: pd.DataFrame, portfolio_weights: dict, initial_investment: float = 100000.0, years: int = 30, num_paths: int = 5000):
    """
    Simulates future wealth paths using Geometric Brownian Motion (Monte Carlo).
    Returns 10th, 50th, and 90th percentiles over time (monthly steps).
    """
    if log_returns.empty:
         return []
         
    # 1. Calculate historical annualized portfolio return and volatility
    tickers = log_returns.columns
    weights_array = np.array([portfolio_weights.get(t, 0) for t in tickers])
    
    if np.sum(weights_array) == 0:
         return []
         
    port_daily_rets = np.dot(log_returns, weights_array)
    mu_daily = np.mean(port_daily_rets)
    sigma_daily = np.std(port_daily_rets)
    
    mu_ann = mu_daily * 252
    sigma_ann = sigma_daily * np.sqrt(252)
    
    # 2. Setup GBM Simulation
    dt = 1/12.0 # Monthly steps
    months = years * 12
    
    # 3. Generate random standard normal variables
    Z = np.random.normal(0, 1, size=(num_paths, months))
    
    # 4. Calculate monthly log returns for all paths
    drift = (mu_ann - 0.5 * sigma_ann**2) * dt
    volatility = sigma_ann * np.sqrt(dt)
    
    log_returns_sim = drift + volatility * Z
    
    # 5. Calculate cumulative sum to get cumulative log returns
    cumulative_log_returns = np.cumsum(log_returns_sim, axis=1)
    
    # 6. Convert to actual wealth paths
    # Add an initial column of zeros for Month 0 (initial investment)
    zero_col = np.zeros((num_paths, 1))
    cumulative_log_returns = np.hstack([zero_col, cumulative_log_returns])
    
    wealth_paths = initial_investment * np.exp(cumulative_log_returns)
    
    # 7. Extract percentiles across all paths for each month
    percentile_10 = np.percentile(wealth_paths, 10, axis=0) # Worst case
    percentile_50 = np.percentile(wealth_paths, 50, axis=0) # Base case
    percentile_90 = np.percentile(wealth_paths, 90, axis=0) # Best case
    
    # 8. Format for frontend Recharts
    formatted_data = []
    for m in range(months + 1):
         formatted_data.append({
              "month": m,
              "year": float(m / 12),
              "worst": float(percentile_10[m]),
              "base": float(percentile_50[m]),
              "best": float(percentile_90[m])
         })
         
    return formatted_data

