import { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, TrendingDown, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function StressTest({ tickers, weights }) {
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const runStressTest = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/stress_test`, {
                tickers: tickers,
                weights: weights,
                period: "5y" // Need history for Beta
            });
            setResults(res.data);
        } catch (err) {
            console.error("Stress test failed", err);
            setError(err.response?.data?.detail || "Failed to run stress test. Ensure sufficient data history.");
        } finally {
            setLoading(false);
        }
    };

    if (!tickers || tickers.length === 0) return null;

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Stress Testing
                    </h3>
                    <p className="text-gray-400 text-sm">Simulate historical market crashes</p>
                </div>
                <button
                    onClick={runStressTest}
                    disabled={loading}
                    className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-500 border border-orange-600/50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                    {loading ? "Simulating..." : "Run Scenarios"}
                </button>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-900 text-red-400 p-3 rounded-lg text-sm mb-4">
                    {error}
                </div>
            )}

            {results && results.scenarios && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <span>Portfolio Beta vs SPY:</span>
                        <span className={`font-mono font-bold ${results.beta > 1.2 ? 'text-red-400' : results.beta < 0.8 ? 'text-blue-400' : 'text-gray-200'}`}>
                            {typeof results.beta === 'number' ? results.beta.toFixed(2) : 'N/A'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(results.scenarios).map(([scenario, drop]) => (
                            <div key={scenario} className="bg-gray-800/50 p-3 rounded-lg flex items-center justify-between border border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-900/20 p-2 rounded-md">
                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-300">{scenario}</span>
                                </div>
                                <div className="font-mono font-bold text-red-400">
                                    {(drop * 100).toFixed(1)}%
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-xs text-gray-500 mt-2 italic">
                        * Projections based on 5-year historical beta relative to S&P 500.
                    </div>
                </div>
            )}
        </div>
    );
}
