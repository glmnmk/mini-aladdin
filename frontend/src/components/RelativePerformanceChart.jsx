import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const RelativePerformanceChart = ({ tickers, weights }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBacktestData = async () => {
            if (!tickers || tickers.length === 0 || !weights || Object.keys(weights).length === 0) return;

            setLoading(true);
            setError(null);

            try {
                const response = await axios.post(`${API_URL}/backtest`, {
                    tickers: tickers,
                    weights: weights,
                    period: "5y"
                });

                const resData = response.data;
                if (resData.dates && resData.dates.length > 0) {
                    // Format into Recharts array
                    const formattedData = resData.dates.map((date, index) => ({
                        date: date.split("T")[0], // Keep it clean
                        Portfolio: resData.portfolio_cumulative_return[index] * 100, // Convert to percentage
                        Benchmark: resData.benchmark_cumulative_return[index] * 100
                    }));
                    setData(formattedData);
                }
            } catch (err) {
                console.error("Backtest fetch error", err);
                setError("Failed to fetch historical benchmark data.");
            } finally {
                setLoading(false);
            }
        };

        fetchBacktestData();
    }, [tickers, weights]);

    if (loading) {
        return (
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm h-[400px] flex items-center justify-center text-red-400 gap-2">
                <AlertTriangle className="w-5 h-5" />
                {error}
            </div>
        );
    }

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <div>
                    <h3 className="text-lg font-medium text-white">Cumulative Performance vs Benchmark</h3>
                    <p className="text-sm text-gray-400">Historical tracing against S&P 500 (SPY)</p>
                </div>
            </div>

            {data.length > 0 ? (
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="#9ca3af"
                                fontSize={12}
                                tickMargin={10}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                fontSize={12}
                                tickFormatter={(val) => `${val.toFixed(0)}%`}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                itemStyle={{ color: '#f3f4f6' }}
                                formatter={(value) => [`${value.toFixed(2)}%`]}
                                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <ReferenceLine y={0} stroke="#4b5563" />
                            <Line
                                type="monotone"
                                dataKey="Portfolio"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1e3a8a' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="Benchmark"
                                stroke="#f59e0b" // Orange/amber for SPY
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#78350f' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[350px] flex items-center justify-center text-gray-500">
                    No historical data available.
                </div>
            )}
        </div>
    );
};

export default RelativePerformanceChart;
