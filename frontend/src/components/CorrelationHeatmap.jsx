import { useState, useEffect } from 'react';
import axios from 'axios';
import { Grid, Info } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function CorrelationHeatmap({ tickers }) {
    const [data, setData] = useState(null); // { tickers: [], matrix: [] }
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!tickers || tickers.length < 2) return;

        const fetchCorrelation = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.post(`${API_URL}/correlation`, {
                    tickers: tickers,
                    weights: {}, // Weights not needed for correlation alone
                    period: "5y"
                });
                setData(res.data);
            } catch (err) {
                console.error("Correlation fetch failed", err);
                setError("Failed to load correlation data.");
            } finally {
                setLoading(false);
            }
        };

        // Debounce slightly to avoid rapid updates if user types fast
        const timeout = setTimeout(fetchCorrelation, 500);
        return () => clearTimeout(timeout);
    }, [tickers]);

    if (!tickers || tickers.length < 2) {
        return (
            <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
                <Grid className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Add at least 2 assets to view correlation.</p>
            </div>
        );
    }

    // Helper for color scale
    // -1 (blue) -> 0 (gray/white) -> 1 (red)
    const getColor = (val) => {
        if (val === 1) return 'bg-red-500'; // Exact 1 (diagonal)
        if (val > 0.8) return 'bg-red-500/90';
        if (val > 0.6) return 'bg-red-500/70';
        if (val > 0.4) return 'bg-red-500/50';
        if (val > 0.2) return 'bg-red-500/30';
        if (val > 0) return 'bg-red-500/10';
        if (val === 0) return 'bg-gray-800';
        if (val < -0.8) return 'bg-blue-500/90';
        if (val < -0.6) return 'bg-blue-500/70';
        if (val < -0.4) return 'bg-blue-500/50';
        if (val < -0.2) return 'bg-blue-500/30';
        return 'bg-blue-500/10';
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium flex items-center gap-2">
                    <Grid className="w-5 h-5 text-indigo-400" />
                    Correlation Matrix
                </h3>
            </div>

            {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading && !data && (
                <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
            )}

            {data && (
                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                        <div
                            className="grid gap-1"
                            style={{
                                gridTemplateColumns: `auto repeat(${data.tickers.length}, minmax(40px, 1fr))`
                            }}
                        >
                            {/* Header Row */}
                            <div className="h-10"></div> {/* Empty corner */}
                            {data.tickers.map(t => (
                                <div key={t} className="h-10 flex items-center justify-center font-mono text-xs font-bold text-gray-400">
                                    {t}
                                </div>
                            ))}

                            {/* Data Rows */}
                            {data.matrix.map((row, i) => (
                                <>
                                    {/* Row Label */}
                                    <div key={`label-${i}`} className="h-10 flex items-center justify-end pr-3 font-mono text-xs font-bold text-gray-400">
                                        {data.tickers[i]}
                                    </div>

                                    {/* Cells */}
                                    {row.map((val, j) => (
                                        <div
                                            key={`${i}-${j}`}
                                            className={`h-10 rounded flex items-center justify-center text-xs font-medium cursor-help transition-colors hover:ring-2 hover:ring-white/20 ${getColor(val)}`}
                                            title={`${data.tickers[i]} vs ${data.tickers[j]}: ${val.toFixed(2)}`}
                                        >
                                            <span className={Math.abs(val) > 0.5 ? 'text-white' : 'text-gray-400'}>
                                                {val.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
