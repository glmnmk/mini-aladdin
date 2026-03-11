from app.market_data import get_asset_metadata
import os
from dotenv import load_dotenv

load_dotenv()

print("Testing AAPL metadata:")
meta = get_asset_metadata("AAPL")
print(meta)

print("\nTesting MSFT metadata:")
meta = get_asset_metadata("MSFT")
print(meta)
