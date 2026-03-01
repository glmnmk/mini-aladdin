import pandas as pd
import numpy as np

mean_returns = pd.Series({"AAPL": 0.0006, "MSFT": 0.00045})
x = np.array([0.1607, 0.8393])

ret1 = np.sum(mean_returns * x) * 252
print(f"numpy sum: {ret1}")

ret2 = 0
for i, ticker in enumerate(["AAPL", "MSFT"]): # assuming order
    ret2 += (mean_returns[ticker] * 252) * x[i]
print(f"loop sum: {ret2}")
