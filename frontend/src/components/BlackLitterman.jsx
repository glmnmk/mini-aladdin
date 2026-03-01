import React, { useState } from 'react';
import axios from 'axios';
import { BrainCircuit, TrendingUp, AlertCircle, Play } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function BlackLitterman({ tickers, currentWeights, onApplyWeights }) {
    const [loadingViews, setLoadingViews] = useState(false);
    const [loadingOptimization, setLoadingOptimization] = useState(false);
    const [error, setError] = useState(null);
    const [aiViews, setAiViews] = useState(null);
    const [optimizationResult, setOptimizationResult] = useState(null);

    const generateAIViews = async () => {
        setLoadingViews(true);
        setError(null);
        setOptimizationResult(null); // Reset previous runs
        try {
            const response = await axios.post(`${API_URL}/ask/views`, {
                tickers: tickers,
                api_key: "demo" // Defaulting to demo mode for showcase
            });
            setAiViews(response.data);
        } catch (err) {
            setError("Failed to generate AI views");
        } finally {
            setLoadingViews(false);
        }
    };

    const runBlackLitterman = async () => {
        if (!aiViews) return;
        setLoadingOptimization(true);
        setError(null);
        try {
            const response = await axios.post(`${API_URL}/optimize/black_litterman`, {
                tickers: tickers,
                views: aiViews,
                market_weights: currentWeights, // Using current weights as proxy for Implied Market Eq
                period: "5y"
            });
            setOptimizationResult(response.data);
        } catch (err) {
            setError("Failed to run Black-Litterman optimization");
        } finally {
            setLoadingOptimization(false);
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-blue-900/50 backdrop-blur-sm mt-6">
            <div className="flex items-center gap-2 mb-4">
                <BrainCircuit className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-medium">Institutional Optimization <span className="text-xs ml-2 bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-800">Black-Litterman Model</span></h3>
            </div>

            <p className="text-sm text-gray-400 mb-6">
                Enhance your portfolio using the industry-standard Black-Litterman model. Generate macroeconomic views using our AI Analyst and mathematically blend them with market equilibrium.
            </p>

            {error && (
                <div className="bg-red-900/20 border border-red-800 text-red-200 p-3 rounded-lg text-sm flex items-start gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                </div>
            )}

            {/* Step 1: Generate Views */}
            {!aiViews ? (
                <button
                    onClick={generateAIViews}
                    disabled={loadingViews || tickers.length < 2}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-purple-400 border border-purple-900/50 font-medium py-3 rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                    {loadingViews ? "Analyzing Macro Sentiment..." : <><BrainCircuit className="w-5 h-5" /> Generate AI Macro Views</>}
                </button>
            ) : (
                <div className="space-y-6">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center justify-between">
                            <span>AI Generated Views</span>
                            <button
                                onClick={generateAIViews}
                                disabled={loadingViews}
                                className="text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                                Regenerate
                            </button>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {aiViews.map((v, i) => (
                                <div key={i} className="bg-gray-900 p-3 rounded border border-gray-800 flex flex-col items-center">
                                    <span className="font-mono text-white font-bold">{v.asset}</span>
                                    <span className={`text-lg font-mono ${(v.view * 100) > 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {v.view > 0 ? '+' : ''}{(v.view * 100).toFixed(1)}%
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">Expected Return</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 2: Run Optimization */}
                    {!optimizationResult ? (
                        <button
                            onClick={runBlackLitterman}
                            disabled={loadingOptimization}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium py-3 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
                        >
                            {loadingOptimization ? "Calculating Posteriors..." : <><TrendingUp className="w-5 h-5" /> Run Black-Litterman Math</>}
                        </button>
                    ) : (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-green-900/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-medium text-green-400">Optimized Posteriors</h4>
                                <button
                                    onClick={() => onApplyWeights(optimizationResult.weights)}
                                    className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                                >
                                    <Play className="w-3 h-3" /> Apply to Portfolio
                                </button>
                            </div>

                            <div className="space-y-3">
                                {Object.entries(optimizationResult.weights).sort(([, a], [, b]) => b - a).map(([ticker, weight]) => {
                                    const priorRet = optimizationResult.prior_returns[ticker];
                                    const postRet = optimizationResult.posterior_returns[ticker];
                                    const viewVal = aiViews.find(v => v.asset === ticker)?.view || 0;

                                    return (
                                        <div key={ticker} className="flex items-center text-sm">
                                            <span className="w-16 font-mono text-gray-300">{ticker}</span>

                                            {/* Visual bar for weight */}
                                            <div className="flex-1 mx-4 h-2 bg-gray-900 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${weight * 100}%` }}></div>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs font-mono">
                                                <span className="w-12 text-right">{(weight * 100).toFixed(1)}%</span>
                                                {/* Show how views altered the expected return */}
                                                <div className="w-24 flex items-center text-gray-500">
                                                    <span>{(priorRet * 100).toFixed(1)}%</span>
                                                    <span className="mx-1">→</span>
                                                    <span className={postRet > priorRet ? "text-green-400" : "text-yellow-400"}>
                                                        {(postRet * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
