import google.generativeai as genai
import os
from pydantic import BaseModel

# Initialize Gemini
# In production, use os.environ.get("GEMINI_API_KEY")
# For now, we'll accept it from the frontend or an env variable.

class AIAnalysisRequest(BaseModel):
    tickers: list[str]
    weights: dict[str, float]
    metrics: dict # Sharpe, Vol, Return
    factor_analysis: dict # Beta, Size, Value
    attribution: dict # Contributors
    user_query: str = None # Optional specific question
    api_key: str # User provided API key

def get_ai_analysis(request: AIAnalysisRequest):
    """
    Generates an investment analysis using Gemini.
    """
    try:
        genai.configure(api_key=request.api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Construct Prompt
        prompt = f"""
        You are an expert financial risk manager working at a top hedge fund (like BlackRock using Aladdin).
        Analyze the following portfolio data and provide a professional, concise executive summary.
        
        **Portfolio Composition:**
        {request.weights}
        
        **Risk Metrics:**
        - Annual Return: {request.metrics.get('return', 0):.2%}
        - Volatility: {request.metrics.get('volatility', 0):.2%}
        - Sharpe Ratio: {request.metrics.get('sharpe', 0):.2f}
        
        **Factor Analysis (Risk Drivers):**
        - Market Beta: {request.factor_analysis.get('market_beta', 0):.2f} (Sensitivity to S&P 500)
        - Size Beta: {request.factor_analysis.get('size_beta', 0):.2f} (Positive = Small Cap, Negative = Large Cap)
        - Value Beta: {request.factor_analysis.get('value_beta', 0):.2f} (Positive = Value, Negative = Growth)
        
        **Performance Attribution (Top Contributors):**
        {request.attribution.get('contributions', {})}
        
        **User Question:**
        {request.user_query if request.user_query else "What are the biggest risks in this portfolio and how would you optimize it?"}
        
        **Response Guidelines:**
        1. Be direct and professional. No fluff.
        2. Focus on *Risk* and *Diversification*.
        3. Explain *why* the metrics are what they are (e.g. "High volatility is driven by your 40% allocation to NVDA").
        4. Use bullet points for readability.
        """
        
        response = model.generate_content(prompt)
        return {"analysis": response.text}
        
    except Exception as e:
        return {"error": str(e)}

def get_mock_analysis(request: AIAnalysisRequest):
    """
    Returns a simulated AI response for demo purposes.
    """
    tickers = ", ".join(request.tickers)
    top_holding = max(request.weights, key=request.weights.get)
    sharpe = request.metrics.get('sharpe', 0)
    
    risk_profile = "High" if request.metrics.get('volatility', 0) > 0.20 else "Moderate"
    
    analysis = f"""# 🤖 AI Investment Analysis (DEMO MODE)

**Executive Summary**
Your portfolio, currently allocated across **{tickers}**, exhibits a **{risk_profile} Risk Profile**. With a Sharpe Ratio of **{sharpe:.2f}**, you are generating { "strong" if sharpe > 1 else "adequate" } returns for every unit of risk taken.

**Key Observations:**
*   **Concentration Risk**: Your largest holding is **{top_holding}** ({request.weights.get(top_holding, 0):.1%} allocation). This single asset significantly drives your daily variance.
*   **Factor Exposure**: The portfolio shows sensitivity to the **Market Factor (Beta)**, meaning it will likely move in sync with the S&P 500.
*   **Diversification**: { "You have reasonable diversification." if len(request.tickers) > 3 else "Consider adding more uncorrelated assets to smooth out volatility." }

**Strategic Recommendations:**
1.  **Rebalance**: Consider trimming {top_holding} if it exceeds 30% of your portfolio to lock in gains.
2.  **Hedge**: Look into defensive sectors (Utilities, Healthcare) if you are concerned about a market downturn.
3.  **Monitor**: Keep an eye on the **Volatility** metric; if it spikes above 25%, review your risk tolerance.

*Disclaimer: This is a generated simulation for demonstration purposes.*"""


    return {"analysis": analysis}

def generate_bl_views(request):
    """
    Asks Gemini to act as a Macro Strategist and output structural Black-Litterman views in JSON.
    """
    import json
    tickers_str = ", ".join(request.tickers)
    
    # DEMO MODE
    if request.api_key.lower().strip() == "demo":
        # Generate some mock deterministic views based on simple logic
        views = []
        for i, ticker in enumerate(request.tickers):
            # Arbitrary demo logic: tech gets bullish, others get moderate
            if ticker in ["AAPL", "MSFT", "GOOG", "NVDA", "TSLA"]:
                views.append({"asset": ticker, "view": 0.08 + (i*0.01), "confidence": 0.8})
            elif ticker == "SPY":
                views.append({"asset": ticker, "view": 0.06, "confidence": 0.9})
            else:
                views.append({"asset": ticker, "view": 0.04 - (i*0.005), "confidence": 0.5})
        return views

    try:
        genai.configure(api_key=request.api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Act as a quantitative Macro Strategist. I am building a Black-Litterman model.
        Analyze the current macroeconomic environment and market sentiment for the following assets:
        {tickers_str}
        
        Provide exactly one absolute expected annualized return 'view' for EACH asset.
        Return ONLY a raw JSON array of objects. No markdown, no explanation, no backticks.
        Format MUST be exactly:
        [
          {{"asset": "TICKER", "view": 0.05, "confidence": 0.75}}
        ]
        
        Rules:
        - "view" is a float representing the expected annualized return (e.g., 0.05 for 5%, -0.02 for -2%). Keep it realistic (-0.5 to 0.5).
        - "confidence" is a float between 0.01 and 1.0 representing your conviction.
        - You MUST include an entry for every single ticker provided.
        """
        
        response = model.generate_content(prompt)
        text = response.text.replace('```json', '').replace('```', '').strip()
        views = json.loads(text)
        
        # Validation
        validated_views = []
        for v in views:
            if v.get("asset") in request.tickers:
               validated_views.append(v)
               
        return validated_views
        
    except Exception as e:
        print(f"Error generating views: {e}")
        return {"error": str(e)}
