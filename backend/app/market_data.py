import yfinance as yf
import pandas as pd
import numpy as np
import datetime
import urllib.request
import zipfile
import io
import ssl
import os
import sqlalchemy as sa
import urllib.parse
from dotenv import load_dotenv

load_dotenv()

class NativeWRDSConnection:
    def __init__(self, username, password):
        encoded_password = urllib.parse.quote(password)
        pguri = f"postgresql://{username}:{encoded_password}@wrds-pgdata.wharton.upenn.edu:9737/wrds"
        self.engine = sa.create_engine(pguri, isolation_level="AUTOCOMMIT", connect_args={"sslmode": "require"})
        
    def raw_sql(self, sql):
        return pd.read_sql_query(sql, self.engine)

WRDS_DB = None
def get_wrds_connection():
    global WRDS_DB
    if WRDS_DB is None:
        try:
            uname = os.environ.get("WRDS_USERNAME")
            pwd = os.environ.get("WRDS_PASSWORD")
            if uname and pwd:
                WRDS_DB = NativeWRDSConnection(uname, pwd)
        except Exception as e:
            print(f"WRDS Connection error: {e}")
            WRDS_DB = None
    return WRDS_DB
def fetch_historical_data(tickers: list[str], period: str = "5y") -> pd.DataFrame:
    """
    Fetches historical adjusted close prices for the given tickers using WRDS (LSEG/Compustat).
    Falls back to yfinance if WRDS fails.
    Returns a DataFrame of daily log returns.
    """
    if not tickers:
        return pd.DataFrame()
        
    db = get_wrds_connection()
    if db is not None:
        try:
            days_map = {"1y": 365, "2y": 730, "5y": 1825, "10y": 3650}
            days = days_map.get(period, 1825)
            start_date = (datetime.datetime.now() - datetime.timedelta(days=days)).strftime('%Y-%m-%d')
            
            # Alias map for Wharton SQL specifically
            price_aliases = {"GOOG": "GOOGL", "BRK-B": "BRK.B"}
            reverse_aliases = {"GOOGL": "GOOG", "BRK.B": "BRK-B"}
            
            mapped_tickers = []
            for t in tickers:
                mapped_tickers.append(price_aliases.get(t, t))

            if len(mapped_tickers) == 1:
                tickers_sql = f"('{mapped_tickers[0]}')"
            else:
                tickers_sql = tuple(mapped_tickers)
                
            sql = f"""
            SELECT datadate as date, tic, prccd / ajexdi as adj_close
            FROM comp_na_daily_all.secd
            WHERE tic IN {tickers_sql}
            AND datadate >= '{start_date}'
            """
            df = db.raw_sql(sql)
            if df is not None and not df.empty:
                df['date'] = pd.to_datetime(df['date'])
                prices = df.pivot(index='date', columns='tic', values='adj_close')
                
                # Remap the columns back to the user's requested tickers
                prices = prices.rename(columns=reverse_aliases)
                
                # Use forward-fill to handle missing trading days so we don't
                # expel tickers that have different exchange calendars
                prices = prices.ffill().dropna(how='all')
                log_returns = np.log(prices / prices.shift(1)).dropna(how='all')
                
                # Check for completely missing tickers (returned 0 rows)
                wrds_tickers = [t for t in tickers if t in log_returns.columns]
                missing = [t for t in tickers if t not in log_returns.columns]
                
                if not missing:
                    # All tickers found - common dropna to keep only full rows
                    log_returns = log_returns.dropna()
                    log_returns = log_returns.reindex(columns=tickers)
                    return log_returns
                elif wrds_tickers:
                    # Some tickers found - fetch missing ones from yfinance separately
                    print(f"WRDS missing tickers: {missing}, supplementing from yfinance")
                    log_returns_wrds = log_returns[wrds_tickers].dropna()
                    yf_data = yf.download(missing, period=period, auto_adjust=True, progress=False)
                    if "Close" in yf_data.columns:
                        yf_prices = yf_data["Close"]
                    else:
                        yf_prices = yf_data
                    yf_prices = yf_prices.dropna()
                    yf_log_returns = np.log(yf_prices / yf_prices.shift(1)).dropna()
                    if isinstance(yf_log_returns, pd.Series):
                        yf_log_returns = yf_log_returns.to_frame(missing[0])
                    
                    # If supplementary fetch failed, return what we have from WRDS
                    if yf_log_returns.empty:
                        print(f"YFinance returned no data for missing tickers: {missing}. Returning partial data.")
                        return log_returns_wrds

                    # Align the two dataframes on common dates
                    common = log_returns_wrds.index.intersection(yf_log_returns.index)
                    
                    if common.empty:
                        print("No overlapping data between WRDS and YFinance. Returning WRDS data only.")
                        return log_returns_wrds
                        
                    combined = pd.concat([log_returns_wrds.loc[common], yf_log_returns.loc[common]], axis=1)
                    # combined = combined.reindex(columns=tickers) # Don't force reindex to avoid NaNs
                    return combined
                else:
                    print(f"WRDS returned no tickers, falling back to yfinance")
        except Exception as e:
            print(f"WRDS fetch_historical_data error: {e}")

    # Fallback: Download data via yfinance
    data = yf.download(tickers, period=period, auto_adjust=True, progress=False)
    
    # Handle case where only one ticker is returned (Series vs DataFrame)
    if "Close" in data.columns:
        prices = data["Close"]
    else:
        prices = data
        
    prices = prices.dropna()
    
    # Calculate daily log returns
    log_returns = np.log(prices / prices.shift(1)).dropna()
    
    # Do NOT reindex to match 'tickers' exactly if it introduces NaN columns.
    # We want to keep only valid data for analysis.
    # if isinstance(log_returns, pd.DataFrame):
    #    log_returns = log_returns.reindex(columns=tickers)
        
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
    
    # WRDS comp.company table tracks GOOG mostly under GOOGL (Class A)
    # Ticker aliases used strictly for metadata lookup:
    lookup_ticker = ticker
    meta_aliases = {
        "GOOG": "GOOGL",
        "BRK-B": "BRK.B",
    }
    if ticker in meta_aliases:
        lookup_ticker = meta_aliases[ticker]
        
    if ticker in ASSET_METADATA_CACHE:
        return ASSET_METADATA_CACHE[ticker]
    
    metadata = {"country": "Unknown", "sector": "Unknown"}
    
    db = get_wrds_connection()
    if db is not None:
        try:
            meta_sql = f"""
            SELECT DISTINCT b.loc as country, b.gsector as sector
            FROM comp_na_daily_all.names a
            JOIN comp.company b ON a.gvkey = b.gvkey
            WHERE a.tic = '{lookup_ticker}'
            """
            df = db.raw_sql(meta_sql)
            if df is not None and not df.empty:
                raw_country = df['country'].iloc[0]
                raw_sector = str(df['sector'].iloc[0])
                
                # Full ISO-3166-1 alpha-3 to TopoJSON country name map
                ISO3_MAP = {
                    'USA': 'United States of America', 'GBR': 'United Kingdom',
                    'JPN': 'Japan', 'CHN': 'China', 'DEU': 'Germany',
                    'FRA': 'France', 'CAN': 'Canada', 'AUS': 'Australia',
                    'CHE': 'Switzerland', 'NLD': 'Netherlands', 'SWE': 'Sweden',
                    'KOR': 'South Korea', 'IND': 'India', 'HKG': 'Hong Kong',
                    'DNK': 'Denmark', 'NOR': 'Norway', 'FIN': 'Finland',
                    'SGP': 'Singapore', 'IRL': 'Ireland', 'ISR': 'Israel',
                    'BRA': 'Brazil', 'ITA': 'Italy', 'ESP': 'Spain',
                    'BEL': 'Belgium', 'AUT': 'Austria', 'NZL': 'New Zealand',
                    'ZAF': 'South Africa', 'MEX': 'Mexico', 'TWN': 'Taiwan',
                    'RUS': 'Russia', 'SAU': 'Saudi Arabia', 'ARE': 'United Arab Emirates',
                    'PRT': 'Portugal', 'GRC': 'Greece', 'POL': 'Poland',
                    'TUR': 'Turkey', 'ARG': 'Argentina', 'CHL': 'Chile',
                    'COL': 'Colombia', 'PHL': 'Philippines', 'IDN': 'Indonesia',
                    'MYS': 'Malaysia', 'THA': 'Thailand', 'VNM': 'Vietnam',
                    'PAK': 'Pakistan', 'EGY': 'Egypt', 'NGA': 'Nigeria',
                    # Also handle text that WRDS sometimes returns
                    'United States': 'United States of America',
                    'Japan': 'Japan', 'United Kingdom': 'United Kingdom',
                }
                if pd.notna(raw_country):
                    rc = str(raw_country).strip()
                    metadata["country"] = ISO3_MAP.get(rc, rc)
                
                # Map GICS Sector Codes to Strings
                # 10: Energy, 15: Materials, 20: Industrials, 25: Consumer Discretionary, 
                # 30: Consumer Staples, 35: Health Care, 40: Financials, 45: Information Technology, 
                # 50: Communication Services, 55: Utilities, 60: Real Estate
                gics_map = {
                    '10': 'Energy', '15': 'Materials', '20': 'Industrials', 
                    '25': 'Consumer Discretionary', '30': 'Consumer Staples', 
                    '35': 'Health Care', '40': 'Financials', '45': 'Technology', 
                    '50': 'Communication Services', '55': 'Utilities', '60': 'Real Estate',
                    '10.0': 'Energy', '15.0': 'Materials', '20.0': 'Industrials', 
                    '25.0': 'Consumer Discretionary', '30.0': 'Consumer Staples', 
                    '35.0': 'Health Care', '40.0': 'Financials', '45.0': 'Technology', 
                    '50.0': 'Communication Services', '55.0': 'Utilities', '60.0': 'Real Estate'
                }
                
                if pd.notna(raw_sector) and raw_sector in gics_map:
                    metadata["sector"] = gics_map[raw_sector]
                elif pd.notna(raw_sector):
                    # Fallback to sector code if not found
                    metadata["sector"] = f"Sector {raw_sector}"
                
                if metadata["country"] != "Unknown" or metadata["sector"] != "Unknown":
                    ASSET_METADATA_CACHE[ticker] = metadata
                    return metadata
        except Exception as e:
            print(f"WRDS get_asset_metadata error: {e}")

    # Fallback to yfinance
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
