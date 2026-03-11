import asyncio
from app.market_data import get_asset_metadata, fetch_historical_data
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    tickers = ["AAPL", "GOOG", "MSFT", "AMZN"]
    for t in tickers:
        print(f"--- Testing {t} ---")
        meta = get_asset_metadata(t)
        print("Metadata:", meta)
        df = fetch_historical_data([t], period="1y")
        print("Historical rows:", len(df))

if __name__ == "__main__":
    asyncio.run(test())
