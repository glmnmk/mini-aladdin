import { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Info } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

export default function FactorAnalysis({ tickers, weights }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!tickers || tickers.length === 0) return;

        const fetchFactors = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.post(`${API_URL}/factor_analysis`, {
                    tickers: tickers,
                    weights: weights,
                    period: "5y"
                });
                setData(res.data);
            } catch (err) {
                console.error("Factor analysis failed", err);
                // Don't show error immediately to avoid cluttering if data is just missing
                // setError("Failed to load factor analysis.");
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchFactors, 500);
        return () => clearTimeout(timeout);
    }, [tickers, weights]);

    // Helper to color bars
    const getBarColor = (val, type) => {
        if (type === 'market') return val > 1.2 ? 'bg-red-500' : val < 0.8 ? 'bg-blue-500' : 'bg-green-500';
        if (type === 'size') return val > 0.2 ? 'bg-indigo-500' : val < -0.2 ? 'bg-purple-500' : 'bg-gray-500';
        if (type === 'value') return val > 0.2 ? 'bg-amber-500' : val < -0.2 ? 'bg-cyan-500' : 'bg-gray-500';
        return 'bg-gray-500';
    };

    if (loading && !data) return null; // succinct loading

    if (!data) return null;

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-500" />
                Risk Factor Analysis (Aladdin-Lite)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Market Beta */}
                <div className="bg-gray-800/50 p-4 rounded-lg relative overflow-hidden">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Market Sensitivity (Beta)</div>
                    <div className="text-2xl font-mono font-bold text-white mb-2">{data.market_beta.toFixed(2)}x</div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full ${getBarColor(data.market_beta, 'market')}`}
                            style={{ width: `${Math.min(Math.abs(data.market_beta) * 50, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {data.market_beta > 1.1 ? "Aggressive Strategy" : data.market_beta < 0.9 ? "Defensive Strategy" : "Market Neutral"}
                    </p>
                </div>

                {/* Size Factor */}
                <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Size Factor (SMB)</div>
                    <div className="text-2xl font-mono font-bold text-white mb-2">{data.size_beta.toFixed(2)}</div>
                    <div className="flex gap-1 h-2">
                        {/* Bi-directional bar */}
                        <div className="flex-1 flex justify-end">
                            {data.size_beta > 0 && (
                                <div className="h-full bg-indigo-500 rounded-l-full" style={{ width: `${Math.min(data.size_beta * 100, 100)}%` }}></div>
                            )}
                        </div>
                        <div className="w-[2px] bg-gray-600"></div>
                        <div className="flex-1">
                            {data.size_beta < 0 && (
                                <div className="h-full bg-purple-500 rounded-r-full" style={{ width: `${Math.min(Math.abs(data.size_beta) * 100, 100)}%` }}></div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {data.size_beta > 0.1 ? "Small Cap Tilt" : data.size_beta < -0.1 ? "Large Cap Tilt" : "Neutral Size"}
                    </p>
                </div>

                {/* Value Factor */}
                <div className="bg-gray-800/50 p-4 rounded-lg">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Value Factor (HML)</div>
                    <div className="text-2xl font-mono font-bold text-white mb-2">{data.value_beta.toFixed(2)}</div>
                    <div className="flex gap-1 h-2">
                        <div className="flex-1 flex justify-end">
                            {data.value_beta > 0 && (
                                <div className="h-full bg-amber-500 rounded-l-full" style={{ width: `${Math.min(data.value_beta * 100, 100)}%` }}></div>
                            )}
                        </div>
                        <div className="w-[2px] bg-gray-600"></div>
                        <div className="flex-1">
                            {data.value_beta < 0 && (
                                <div className="h-full bg-cyan-500 rounded-r-full" style={{ width: `${Math.min(Math.abs(data.value_beta) * 100, 100)}%` }}></div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        {data.value_beta > 0.1 ? "Value Oriented" : data.value_beta < -0.1 ? "Growth Oriented" : "Neutral Style"}
                    </p>
                </div>
            </div>

            <div className="mt-4 text-xs text-gray-500 flex justify-between">
                <span>Model Accuracy (R²): {(data.r_squared * 100).toFixed(1)}%</span>
                <span>Alpha (Annualized): <span className={data.alpha > 0 ? "text-green-400" : "text-red-400"}>{(data.alpha * 100).toFixed(2)}%</span></span>
            </div>
        </div>
    );
}
