import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, TrendingUp } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

export default function PerformanceAttribution({ tickers, weights }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!tickers || tickers.length === 0) return;

        const fetchAttribution = async () => {
            setLoading(true);
            try {
                const res = await axios.post(`${API_URL}/attribution`, {
                    tickers: tickers,
                    weights: weights,
                    period: "5y"
                });
                setData(res.data);
            } catch (err) {
                console.error("Attribution failed", err);
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(fetchAttribution, 500);
        return () => clearTimeout(timeout);
    }, [tickers, weights]);

    if (loading && !data) return null;
    if (!data) return null;

    const maxContrib = Math.max(...Object.values(data.contributions).map(Math.abs));

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-emerald-500" />
                Performance Attribution (Where did returns come from?)
            </h3>

            <div className="mb-6">
                <div className="text-3xl font-bold text-white mb-1">
                    {(data.total_return * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Total Portfolio Cumulative Return (5Y)</div>
            </div>

            <div className="space-y-3">
                {Object.entries(data.contributions).map(([ticker, contribution]) => (
                    <div key={ticker} className="flex items-center gap-4">
                        <div className="w-16 font-mono text-sm text-gray-300">{ticker}</div>
                        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden flex">
                            {/* Positive Part center right */}
                            <div className="flex-1 flex justify-end">
                                {contribution > 0 && (
                                    <div
                                        className="h-full bg-emerald-500 rounded-l-md"
                                        style={{ width: `${(contribution / maxContrib) * 50}%` }}
                                    />
                                )}
                            </div>
                            {/* Divider */}
                            <div className="w-[2px] bg-gray-600"></div>
                            {/* Negative Part center left */}
                            <div className="flex-1">
                                {contribution < 0 && (
                                    <div
                                        className="h-full bg-rose-500 rounded-r-md"
                                        style={{ width: `${(Math.abs(contribution) / maxContrib) * 50}%` }}
                                    />
                                )}
                            </div>
                        </div>
                        <div className={`w-16 text-right font-mono text-sm ${contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {contribution > 0 ? '+' : ''}{(contribution * 100).toFixed(1)}%
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-center text-gray-500">
                Shows Contribution to Total Return (Weight × Asset Return). This explains your winners vs losers.
            </div>
        </div>
    );
}
