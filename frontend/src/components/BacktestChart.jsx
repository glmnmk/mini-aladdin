import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BacktestChart({ data }) {
    if (!data || !data.dates) return null;

    // Transform data for Recharts
    const chartData = data.dates.map((date, index) => ({
        date,
        Portfolio: (data.portfolio_cumulative_return[index] * 100).toFixed(2),
        Benchmark: (data.benchmark_cumulative_return[index] * 100).toFixed(2)
    }));

    return (
        <div className="h-[300px] w-full bg-gray-900/50 p-4 rounded-xl border border-gray-800">
            <h3 className="text-sm font-medium text-gray-400 mb-4">Historical Performance (Growth of $1)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                        dataKey="date"
                        stroke="#666"
                        tickFormatter={(str) => str.substring(0, 4)}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#666"
                        unit="%"
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Portfolio" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Benchmark" stroke="#fbbf24" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
