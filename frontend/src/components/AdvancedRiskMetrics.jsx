import React from 'react';
import { ShieldAlert, AlertOctagon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function AdvancedRiskMetrics({ varMetrics, mctrMetrics }) {
    if (!varMetrics || !mctrMetrics) return null;

    // Prepare MCTR Data for Recharts
    const mctrData = Object.entries(mctrMetrics)
        .map(([ticker, pct]) => ({
            ticker,
            contribution: pct * 100 // Convert to percentage
        }))
        .sort((a, b) => b.contribution - a.contribution); // Sort highest risk first

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-red-900/30 rounded-lg flex items-center justify-center border border-red-500/30">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Advanced Risk Analytics</h2>
                    <p className="text-sm text-gray-400">Institutional downside protection and marginal risk contribution (MCTR).</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* VaR Card */}
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertOctagon className="w-4 h-4 text-orange-400" />
                        <h3 className="text-sm font-semibold text-gray-300">Historical Value at Risk (1-Day, 95%)</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-light text-white">
                            {(varMetrics.var_1d * 100).toFixed(2)}%
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        With 95% confidence, the portfolio historically did not lose more than this amount in a single trading day.
                    </p>
                </div>

                {/* CVaR Card */}
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertOctagon className="w-4 h-4 text-red-400" />
                        <h3 className="text-sm font-semibold text-gray-300">Expected Shortfall / CVaR (1-Day, 95%)</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-light text-white">
                            {(varMetrics.cvar_1d * 100).toFixed(2)}%
                        </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        If the worst 5% of trading days occur, this is the average expected daily loss.
                    </p>
                </div>
            </div>

            {/* MCTR Chart */}
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 mt-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-6">Marginal Contribution to Total Risk (MCTR)</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mctrData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                            <XAxis
                                type="number"
                                stroke="#9CA3AF"
                                tickFormatter={(val) => `${val.toFixed(0)}%`}
                            />
                            <YAxis
                                dataKey="ticker"
                                type="category"
                                stroke="#9CA3AF"
                                width={80}
                            />
                            <Tooltip
                                cursor={{ fill: '#374151', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                formatter={(value) => [`${value.toFixed(2)}%`, 'Risk Contribution']}
                            />
                            <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                                {mctrData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.contribution > 25 ? '#ef4444' : entry.contribution > 15 ? '#f97316' : '#3b82f6'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">
                    Highlights the proportional impact of each asset on overall portfolio volatility, accounting for correlations.
                </p>
            </div>
        </div>
    );
}
