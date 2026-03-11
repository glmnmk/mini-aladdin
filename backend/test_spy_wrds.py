from app.market_data import fetch_historical_data
from app.engine import backtest_portfolio

print("Fetching portfolio...")
port_df = fetch_historical_data(["AAPL", "MSFT"], period="5y")
print("Portfolio shape:", port_df.shape)

print("Fetching SPY...")
bench_df = fetch_historical_data(["SPY"], period="5y")
print("SPY shape:", bench_df.shape)

print("Intersection length:", len(port_df.index.intersection(bench_df.index)))

try:
    res = backtest_portfolio(port_df, {"AAPL": 0.5, "MSFT": 0.5}, bench_df)
    print("Backtest dates:", len(res["dates"]))
    print("Backtest port final:", res["portfolio"][-1] if res["portfolio"] else "None")
except Exception as e:
    print("Error:", e)
    
