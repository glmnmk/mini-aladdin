import asyncio
from app.market_data import get_asset_metadata, fetch_historical_data
from app.engine import backtest_portfolio
import pandas as pd

async def test_tm():
    print("Testing TM metadata:")
    meta = get_asset_metadata("TM")
    print(meta)
    
async def test_large_portfolio():
    tickers = ["AAPL", "MSFT", "AMZN", "GOOG", "TSLA", "META"] # 6 stocks
    print(f"\nTesting {len(tickers)} stocks benchmark:")
    try:
        log_returns = fetch_historical_data(tickers, period="5y")
        spy = fetch_historical_data(["SPY"], period="5y")
        
        weights = {t: 1/len(tickers) for t in tickers}
        print("Running backtest...")
        results = backtest_portfolio(log_returns, weights, spy)
        print("Backtest successful. Portfolio points:", len(results.get("portfolio", [])))
    except Exception as e:
        print(f"CRASH: {e}")

if __name__ == "__main__":
    asyncio.run(test_tm())
    asyncio.run(test_large_portfolio())
