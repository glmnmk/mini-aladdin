import asyncio
from app.main import analyze_portfolio
from app.models import PortfolioRequest
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    req = PortfolioRequest(
        tickers=["AAPL", "MSFT"],
        period="1y",
        num_simulations=10
    )
    res = await analyze_portfolio(req)
    for asset in res.individual_assets:
        print(f"{asset['ticker']}: {asset.get('country')}, {asset.get('sector')}")

if __name__ == "__main__":
    asyncio.run(test())
