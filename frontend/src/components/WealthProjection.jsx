import { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Target, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function WealthProjection({ tickers, weights }) {
    const [projectionData, setProjectionData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [initialAmount, setInitialAmount] = useState(100000);
    const [years, setYears] = useState(30);

    const fetchProjection = async () => {
        if (!tickers || tickers.length === 0 || !weights || Object.keys(weights).length === 0) return;

        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_URL}/projection`, {
                tickers: tickers,
                weights: weights,
                initial_investment: initialAmount,
                years: years,
                num_paths: 3000,
                period: "5y"
            });
            setProjectionData(response.data.projection);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to run wealth projection");
        } finally {
            setLoading(false);
        }
    };

    // Auto-run when the tab is opened and dependencies change
    useEffect(() => {
        fetchProjection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickers, weights]);

    // Formatter for currency
    const formatCurrency = (value) => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}k`;
        }
        return `$${value.toFixed(0)}`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            // Recharts stacks payload differently, so we parse by dataKey
            const best = payload.find(p => p.dataKey === 'best')?.value;
            const base = payload.find(p => p.dataKey === 'base')?.value;
            const worst = payload.find(p => p.dataKey === 'worst')?.value;

            return (
                <div className="bg-gray-900 border border-gray-700 p-4 rounded-lg shadow-xl">
                    <p className="text-gray-400 mb-2 font-medium">Year {payload[0].payload.year.toFixed(1)}</p>
                    <div className="space-y-1">
                        <p className="text-green-400 font-mono flex justify-between gap-4">
                            <span>Top 10% (Best Case):</span>
                            <span>{best ? `$${best.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}</span>
                        </p>
                        <p className="text-blue-400 font-mono font-bold flex justify-between gap-4">
                            <span>50th Pctl (Base Case):</span>
                            <span>{base ? `$${base.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}</span>
                        </p>
                        <p className="text-red-400 font-mono flex justify-between gap-4">
                            <span>Bottom 10% (Worst Case):</span>
                            <span>{worst ? `$${worst.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-light">Wealth <span className="text-blue-500 font-bold">Projection</span> (Cone of Uncertainty)</h2>
                    <p className="text-gray-400 text-sm">Monte Carlo stochastic simulations of long-term wealth using Geometric Brownian Motion.</p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4 bg-gray-900/50 p-2 rounded-lg border border-gray-800">
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <input
                            type="number"
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-24 text-sm text-right focus:outline-none focus:border-blue-500"
                            value={initialAmount}
                            onChange={(e) => setInitialAmount(Number(e.target.value))}
                            min={1000}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">Years:</span>
                        <input
                            type="number"
                            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 w-16 text-sm text-right focus:outline-none focus:border-blue-500"
                            value={years}
                            onChange={(e) => setYears(Number(e.target.value))}
                            min={1}
                            max={50}
                        />
                    </div>
                    <button
                        onClick={fetchProjection}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                    >
                        {loading ? "Simulating..." : "Update"}
                    </button>
                </div>
            </div>

            {error ? (
                <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-lg text-sm">
                    {error}
                </div>
            ) : (
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                    <div className="h-[450px] w-full">
                        {loading && projectionData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-500 flex-col gap-4">
                                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                <p>Running 3,000 Monte Carlo Paths...</p>
                            </div>
                        ) : projectionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={projectionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorBest" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorWorst" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis
                                        dataKey="year"
                                        stroke="#9CA3AF"
                                        tickFormatter={(val) => `Yr ${val.toFixed(0)}`}
                                        type="number"
                                        domain={['dataMin', 'dataMax']}
                                        allowDecimals={false}
                                    />
                                    <YAxis
                                        stroke="#9CA3AF"
                                        tickFormatter={formatCurrency}
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36} wrapperStyle={{ top: 0, right: 0 }} />

                                    {/* Areas are rendered bottom to top to overlay properly */}
                                    <Area
                                        type="monotone"
                                        dataKey="best"
                                        name="Top 10% (Best Case)"
                                        stroke="#4ade80"
                                        fillOpacity={1}
                                        fill="url(#colorBest)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="base"
                                        name="50th Pctl (Base Case)"
                                        stroke="#3b82f6"
                                        fillOpacity={1}
                                        fill="url(#colorBase)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="worst"
                                        name="Bottom 10% (Worst Case)"
                                        stroke="#f87171"
                                        fillOpacity={1}
                                        fill="url(#colorWorst)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
