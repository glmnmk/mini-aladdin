import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Globe, PieChart as PieChartIcon, Target, TrendingUp, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

const ExposureAnalytics = ({ tickers, weights, metrics, assetsData }) => {
    // Compute Geographic and Sector Exposure based on weights
    const { geoData, sectorData } = useMemo(() => {
        if (!weights || !assetsData) return { geoData: [], sectorData: [] };

        const geoMap = {};
        const sectorMap = {};

        assetsData.forEach(asset => {
            const weight = weights[asset.ticker] || 0;
            if (weight > 0) {
                const country = asset.country || 'Unknown';
                const sector = asset.sector || 'Other';

                geoMap[country] = (geoMap[country] || 0) + weight;
                sectorMap[sector] = (sectorMap[sector] || 0) + weight;
            }
        });

        const formatData = (map) => Object.entries(map)
            .map(([name, value]) => ({ name, value: value * 100 }))
            .sort((a, b) => b.value - a.value);

        return {
            geoData: formatData(geoMap),
            sectorData: formatData(sectorMap)
        };
    }, [weights, assetsData]);

    // Fallbacks if data empty
    const hasData = geoData.length > 0;

    // Setup Color Scale for Map
    const maxValue = hasData ? Math.max(...geoData.map(d => d.value)) : 100;
    const colorScale = scaleLinear()
        .domain([0.1, maxValue])
        .range(["#1e3a8a", "#3b82f6"]); // Dark blue to bright blue

    const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

    const MetricCard = ({ title, value, subtitle, icon: Icon, colorClass }) => (
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-gray-400 text-sm font-medium">{title}</h4>
                <Icon className={`w-4 h-4 ${colorClass}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Target className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-medium text-white">Relative Performance (vs SPY)</h3>
                        <p className="text-sm text-gray-400">Institutional benchmarking and active risk metrics</p>
                    </div>
                </div>

                {metrics ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard
                            title="Active Return"
                            value={`${(metrics.active_return * 100).toFixed(2)}%`}
                            subtitle="Portfolio return minus SPY return"
                            icon={TrendingUp}
                            colorClass={metrics.active_return >= 0 ? "text-green-400" : "text-red-400"}
                        />
                        <MetricCard
                            title="Tracking Error"
                            value={`${(metrics.tracking_error * 100).toFixed(2)}%`}
                            subtitle="Volatility of active returns"
                            icon={Activity}
                            colorClass="text-blue-400"
                        />
                        <MetricCard
                            title="Information Ratio"
                            value={metrics.information_ratio.toFixed(2)}
                            subtitle="Active Return / Tracking Error"
                            icon={Target}
                            colorClass={metrics.information_ratio >= 0 ? "text-green-400" : "text-red-400"}
                        />
                        <MetricCard
                            title="Jensen's Alpha"
                            value={`${(metrics.alpha * 100).toFixed(2)}%`}
                            subtitle="Risk-adjusted excess return"
                            icon={TrendingUp}
                            colorClass={metrics.alpha >= 0 ? "text-green-400" : "text-red-400"}
                        />
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        Fetching benchmark data from historical API...
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <Globe className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-medium text-white">Geographic Exposure</h3>
                    </div>
                    {hasData ? (
                        <div className="h-[300px] w-full mt-4 flex items-center justify-center">
                            <ComposableMap
                                projectionConfig={{ scale: 140 }}
                                width={800}
                                height={400}
                                style={{ width: "100%", height: "100%" }}
                            >
                                <Geographies geography={geoUrl}>
                                    {({ geographies }) =>
                                        geographies.map((geo) => {
                                            // Find if this country is in our portfolio geoData
                                            const d = geoData.find((s) => s.name === geo.properties.name);
                                            return (
                                                <Geography
                                                    key={geo.rsmKey}
                                                    geography={geo}
                                                    fill={d ? colorScale(d.value) : "#1f2937"}
                                                    stroke="#374151"
                                                    strokeWidth={0.5}
                                                    style={{
                                                        default: { outline: "none" },
                                                        hover: { fill: d ? "#60a5fa" : "#374151", outline: "none", cursor: d ? "pointer" : "default" },
                                                        pressed: { outline: "none" },
                                                    }}
                                                />
                                            );
                                        })
                                    }
                                </Geographies>
                            </ComposableMap>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
                    )}
                </div>

                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <PieChartIcon className="w-5 h-5 text-pink-400" />
                        <h3 className="text-lg font-medium text-white">Sector Allocation</h3>
                    </div>
                    {hasData ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={sectorData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {sectorData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value) => `${value.toFixed(1)}%`}
                                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                                        itemStyle={{ color: '#f3f4f6' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-gray-500">No data available</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExposureAnalytics;
