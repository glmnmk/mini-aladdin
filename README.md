# MaaS: Monte Carlo as a Service (Mini-Aladdin)

MaaS is an institutional-grade quantitative portfolio analytics and risk management platform. Built as a lightweight alternative to enterprise systems like BlackRock's Aladdin, MaaS combines modern portfolio theory, strictly rigorous risk engines, and AI-driven structural views into a single, high-performance web terminal.

## Core Capabilities

### 1. Advanced Risk Analytics
- **Historical Value at Risk (VaR) & Expected Shortfall (CVaR)**: Calculates empirical tail risk using historical simulation, providing dynamic 1-day 95% confidence intervals.
- **Marginal Contribution to Total Risk (MCTR)**: Decomposes portfolio volatility using matrix calculus to show exactly how much risk each individual asset contributes to the total portfolio variance.
- **Fama-French 3-Factor Decomposition**: Automates OLS regression against Kenneth French's daily asset pricing factors (Mkt-RF, SMB, HML) to isolate Alpha, Market Beta, Size Beta, and Value Beta.

### 2. Institutional Portfolio Optimization
- **Mean-Variance Optimization (MVO)**: Generates the Efficient Frontier dynamically, identifying the Maximum Sharpe Ratio (Tangency) and Minimum Volatility portfolios.
- **Black-Litterman Model**: Merges market equilibrium implied returns with explicit, quantitative active views. Re-weights vectors to produce posterior expected returns, preventing the corner solutions typical of naive MVO.

### 3. AI-Driven Analyst & Attribution
- **LLM Structural Views**: Integrates with local AI models to dynamically parse macro environments and generate quantitative tactical views (e.g., +5% absolute return expected for Tech) that feed directly into the Black-Litterman engine.
- **Brinson Performance Attribution**: Decomposes historical returns into asset allocation, security selection, and interaction effects to explain exactly *why* a portfolio outperformed or underperformed its benchmark.

### 4. Stochastic Forecasting & Stress Testing
- **Geometric Brownian Motion (GBM)**: Projects forward simulated wealth paths ("Cone of Uncertainty") based on annualized portfolio drift ($\mu$) and volatility ($\sigma$), visualizing 10th, 50th, and 90th percentiles over 10-30 years.
- **Regressive Scenario Analysis**: Models portfolio impacts against historical drawdowns (e.g., 2008 Financial Crisis, 2020 COVID Crash) using computed portfolio Beta against broad market indices.

### 5. Automated Client Reporting
- Generates polished, institutional-grade PDF reports utilizing `jsPDF`. Compiles asset allocation tables, correlation matrices, Fama-French metrics, MCTR values, and risk profiles into a comprehensive tear sheet.
- Features dynamic asset class categorization (Fixed Income, Equities, Commodities, Real Estate, Currencies, Cryptocurrency) using live `yfinance` Morningstar descriptors.

---

## Tech Stack
- **Backend Environment:** Python 3.9+, FastAPI, Pandas, NumPy, Statsmodels, SciPy, YFinance.
- **Frontend Environment:** Node.js 16+, React, Recharts, TailwindCSS, Vite.

---

## 🚀 Quickstart: Running via Docker (Recommended)

The easiest way to run MaaS locally is by using Docker Compose. This will automatically build and link the isolated Python backend and React frontend containers.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Execution
1. Open a terminal and navigate to the project directory:
```bash
cd mini-aladdin
```
2. Build and start the containers:
```bash
docker-compose up --build
```
3. Open your browser and navigate to the Terminal:
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API Docs:** `http://localhost:8000/docs`

---

## 🛠 Manual Installation

If you prefer to run the applications natively on your machine without Docker:

### 1. Backend (FastAPI)
```bash
cd mini-aladdin/backend
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload
```
The API will be available at `http://127.0.0.1:8000`.

### 2. Frontend (React)
Open a completely new terminal window:
```bash
cd mini-aladdin/frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## Architecture Note
This platform is currently configured to use `yfinance` for broad, dynamic equity and ETF coverage. It is built to be easily modularized. Future expansions include swapping the data extraction layer to proprietary institutional feeds (e.g., WRDS CRSP/Compustat, Bloomberg B-PIPE) for true Option-Adjusted Spread (OAS) fixed-income math and private market alternative modeling.
