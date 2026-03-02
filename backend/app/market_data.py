import yfinance as yf
import pandas as pd
import numpy as np
import datetime
import urllib.request
import zipfile
import io
import ssl


def fetch_historical_data(tickers: list[str], period: str = "5y") -> pd.DataFrame:
    """
    Fetches historical adjusted close prices for the given tickers.
    Returns a DataFrame of daily log returns.
    """
    if not tickers:
        return pd.DataFrame()
    
    # Download data
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    
    # Handle case where only one ticker is returned (Series vs DataFrame)
    if "Close" in data.columns:
        prices = data["Close"]
    else:
        prices = data
        
    prices = prices.dropna()
    
    # Calculate daily log returns
    log_returns = np.log(prices / prices.shift(1)).dropna()
    
    # CRITICAL FIX: yfinance alphabetizes columns. We must force the DataFrame
    # columns to exactly match the order of the requested `tickers` list.
    if isinstance(log_returns, pd.DataFrame):
        log_returns = log_returns.reindex(columns=tickers)
        
    return log_returns


def fetch_fama_french_data(period: str = "5y") -> pd.DataFrame:
    """
    Fetches Fama-French 3 factors (Mkt-RF, SMB, HML) + RF directly from Kenneth French's website.
    Aligns the date range with the requested period.
    """
    try:
        url = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_Factors_daily_CSV.zip"
        
        # Bypass SSL verification which commonly fails on macOS Python installations
        context = ssl._create_unverified_context()
        
        # Download and extract the ZIP file in memory
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=context) as response:
            with zipfile.ZipFile(io.BytesIO(response.read())) as z:
                # The CSV name inside the zip usually matches the zip name without _CSV.zip
                csv_filename = z.namelist()[0]
                with z.open(csv_filename) as f:
                    # The Fama-French CSVs have a header block, so we skip it.
                    # We read the file, skipping the first 3 rows
                    factors = pd.read_csv(f, skiprows=3)
                    
        # Clean up the dataframe
        factors = factors.rename(columns={factors.columns[0]: 'Date'})
        factors = factors.dropna()
        
        # Ensure 'Date' is fully numeric before converting
        factors = factors[factors['Date'].astype(str).str.isnumeric()]
        factors['Date'] = pd.to_datetime(factors['Date'].astype(str), format='%Y%m%d')
        factors.set_index('Date', inplace=True)
        
        # Convert columns to float, handling any string formatting issues
        for col in factors.columns:
            if factors[col].dtype == object:
                 factors[col] = factors[col].astype(str).str.strip().astype(float)
            else:
                 factors[col] = factors[col].astype(float)
        
        # Convert from percent to decimal
        factors = factors / 100.0
        
        # Filter strictly for the last N years based on 'period'
        # Simple mapping for now
        days_map = {"1y": 252, "2y": 504, "5y": 1260, "10y": 2520}
        days = days_map.get(period, 1260)
        
        # Return only the last N rows
        return factors.iloc[-days:]
        
    except Exception as e:
        print(f"Error fetching F-F data directly: {e}")
        return pd.DataFrame()

# Hardcoded metadata for popular Bond ETFs to demonstrate fixed income math natively
BOND_ETFS = {
    "TLT": {"coupon": 0.025, "maturity": 20.0, "face_value": 100}, # 20+ Year Treasury
    "IEF": {"coupon": 0.020, "maturity": 7.5, "face_value": 100},  # 7-10 Year Treasury
    "SHY": {"coupon": 0.015, "maturity": 1.5, "face_value": 100},  # 1-3 Year Treasury
    "AGG": {"coupon": 0.025, "maturity": 6.0, "face_value": 100},  # US Aggregate
    "BND": {"coupon": 0.025, "maturity": 6.5, "face_value": 100},  # Total Bond Market
    "LQD": {"coupon": 0.040, "maturity": 12.0, "face_value": 100}, # Investment Grade Corporate
    "HYG": {"coupon": 0.060, "maturity": 5.0, "face_value": 100}   # High Yield
}

ASSET_CLASSES = {
    # Commodities
    "GLD": "Commodity",
    "SLV": "Commodity",
    "USO": "Commodity",
    "PDBC": "Commodity",
    "GSG": "Commodity",
    
    # Real Estate
    "VNQ": "Real Estate",
    "SCHH": "Real Estate",
    "XLRE": "Real Estate",
    
    # Currency
    "UUP": "Currency",
    "FXE": "Currency",
}

ASSET_CLASS_CACHE = {}

def is_bond_etf(ticker: str) -> bool:
    return ticker.upper() in BOND_ETFS

def get_asset_class(ticker: str) -> str:
    ticker = ticker.upper()
    
    # 1. Hardcoded / predefined checks
    if is_bond_etf(ticker):
        return "Fixed Income"
    if ticker in ASSET_CLASSES:
        return ASSET_CLASSES[ticker]
        
    # 2. Check memory cache to avoid slow repeated API calls
    if ticker in ASSET_CLASS_CACHE:
        return ASSET_CLASS_CACHE[ticker]
        
    # 3. Dynamically query Yahoo Finance
    try:
        info = yf.Ticker(ticker).info
        quote_type = info.get("quoteType", "")
        asset_class = "Equity" # Fallback
        
        if quote_type in ["ETF", "MUTUALFUND"]:
            # Check the Morningstar category provided by yfinance
            category = info.get("category", "")
            if category:
                cat_lower = category.lower()
                if "bond" in cat_lower or "fixed income" in cat_lower:
                    asset_class = "Fixed Income"
                elif "commodity" in cat_lower or "precious metals" in cat_lower:
                    asset_class = "Commodity"
                elif "real estate" in cat_lower:
                    asset_class = "Real Estate"
                elif "currency" in cat_lower:
                    asset_class = "Currency"
                    
        elif quote_type == "CRYPTOCURRENCY":
            asset_class = "Cryptocurrency"
            
        elif quote_type == "CURRENCY":
            asset_class = "Currency"
            
        ASSET_CLASS_CACHE[ticker] = asset_class
        return asset_class
        
    except Exception as e:
        print(f"Error fetching asset class for {ticker}: {e}")
        ASSET_CLASS_CACHE[ticker] = "Equity" # Cache fallback to avoid hammering failing API
        return "Equity"

ASSET_METADATA_CACHE = {}

def get_asset_metadata(ticker: str) -> dict:
    ticker = ticker.upper()
    if ticker in ASSET_METADATA_CACHE:
        return ASSET_METADATA_CACHE[ticker]
    
    metadata = {"country": "Unknown", "sector": "Unknown"}
    
    try:
        info = yf.Ticker(ticker).info
        
        # Determine Country/Region
        country = info.get("country", "")
        if not country:
            category = info.get("category", "")
            if "Europe" in category: country = "Europe"
            elif "Asia" in category or "Emerging" in category or "China" in category: country = "Asia/EM"
            elif "Global" in category or "World" in category: country = "Global"
            elif "US" in category or "U.S." in category: country = "United States"
            else: country = "United States" # Default assumption for US-listed tickers
            
        # Determine Sector/Industry
        sector = info.get("sector", "")
        if not sector:
            category = info.get("category", "")
            if category:
                sector = category
            else:
                # Fallback to asset class
                asset_class = get_asset_class(ticker)
                if asset_class == "Fixed Income": sector = "Bonds"
                elif asset_class == "Commodity": sector = "Commodities"
                elif asset_class == "Real Estate": sector = "Real Estate"
                else: sector = "Other Equity"
                
        metadata["country"] = country
        metadata["sector"] = sector
        # Only cache if we actually got real data
        if country != "Unknown" or sector != "Unknown":
            ASSET_METADATA_CACHE[ticker] = metadata
        return metadata
    except Exception as e:
        print(f"Error fetching metadata for {ticker}: {e}")
        # Do not cache "Unknown" on failure so it can retry on the next analysis
        return metadata
def get_bond_metadata(ticker: str) -> dict:
    return BOND_ETFS.get(ticker.upper(), {})

def fetch_current_prices(tickers: list[str]) -> dict:
    """Fetches the latest closing price for a list of tickers immediately."""
    if not tickers:
         return {}
    try:
         data = yf.Ticker(" ".join(tickers)).history(period="5d")
         if data.empty:
              return {}
         # Handle multi-ticker vs single-ticker from yfinance API
         prices = {}
         if isinstance(data.columns, pd.MultiIndex):
             # Multiple tickers: Columns are (PriceType, Ticker)
             for t in tickers:
                  if ('Close', t) in data.columns:
                       prices[t] = float(data['Close', t].iloc[-1])
         else:
             # Single ticker
             prices[tickers[0]] = float(data['Close'].iloc[-1])
         return prices
    except Exception as e:
         print(f"Error fetching latest prices: {e}")
         return {}

def fetch_risk_free_rate() -> float:
    """
    Fetches the 10-Year Treasury Yield (^TNX) proxy for risk-free rate.
    """
    try:
        data = yf.download("^TNX", period="5d", progress=False)
        if not data.empty:
            if "Close" in data:
                last_yield = float(data["Close"].iloc[-1])
            else:
                last_yield = float(data.iloc[-1])
            # The ^TNX is given in percentage points (e.g., 4.25 for 4.25%)
            return last_yield / 100.0
    except Exception as e:
        print(f"Error fetching ^TNX: {e}")
    # Fallback default risk free rate to 4.0%
    return 0.04
