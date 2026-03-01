import { useState, useEffect } from 'react';
import { Sliders } from 'lucide-react';

export default function ManualAllocation({ tickers, weights, setWeights, onUpdate }) {

    const handleSliderChange = (ticker, value) => {
        const newWeights = { ...weights, [ticker]: parseFloat(value) };

        // Normalize other weights to maintain sum = 1 (optional, or just allow free form)
        // For simple UX, let's just update the value and let user manage 100% or normalize on submit
        // But better UX is auto-normalization or Visual feedback.
        // Let's just set the weight.
        setWeights(newWeights);
        onUpdate(newWeights);
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    return (
        <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-500" />
                Manual Allocation
            </h2>

            <div className="space-y-4">
                {tickers.map(ticker => (
                    <div key={ticker}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-mono text-gray-300">{ticker}</span>
                            <span className="font-mono text-gray-400">{(weights[ticker] * 100).toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={weights[ticker] || 0}
                            onChange={(e) => handleSliderChange(ticker, e.target.value)}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
                <span className="text-xs text-gray-500">TOTAL ALLOCATION</span>
                <span className={`font-mono font-bold ${Math.abs(totalWeight - 1) < 0.01 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {(totalWeight * 100).toFixed(0)}%
                </span>
            </div>
        </div>
    );
}
