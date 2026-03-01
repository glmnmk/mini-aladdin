import { X, Table } from 'lucide-react';

export default function AssumptionsModal({ isOpen, onClose, data }) {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Table className="w-5 h-5 text-blue-500" />
                            Market Assumptions
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Annualized metrics based on 5-year historical data.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 uppercase font-mono text-xs bg-gray-800/50">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Asset</th>
                                <th className="px-4 py-3 text-right">Ann. Return</th>
                                <th className="px-4 py-3 text-right">Ann. Volatility</th>
                                <th className="px-4 py-3 text-right rounded-r-lg">Sharpe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {data.map((asset) => (
                                <tr key={asset.ticker} className="hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 font-medium font-mono text-blue-400">
                                        {asset.ticker}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {(asset.return * 100).toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        {(asset.volatility * 100).toFixed(2)}%
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        <span className={asset.sharpe > 1 ? "text-green-400" : asset.sharpe < 0 ? "text-red-400" : "text-gray-400"}>
                                            {asset.sharpe.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-6 text-xs text-gray-500 bg-blue-900/10 border border-blue-900/30 p-4 rounded-lg">
                        <strong className="text-blue-400 block mb-1">Methodology Note:</strong>
                        Standard Mean-Variance Optimization assumes historical returns and volatility will persist.
                        Metrics are annualized assuming 252 trading days. Risk-Free Rate = 4.0%.
                    </div>
                </div>
            </div>
        </div>
    );
}
