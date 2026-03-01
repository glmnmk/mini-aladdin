import { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, X, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = "http://127.0.0.1:8000";

export default function PortfolioManager({ currentTickers, currentWeights, onLoad }) {
    const [portfolios, setPortfolios] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [showLoadMenu, setShowLoadMenu] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (showLoadMenu) {
            fetchPortfolios();
        }
    }, [showLoadMenu]);

    const fetchPortfolios = async () => {
        try {
            const res = await axios.get(`${API_URL}/portfolios`);
            setPortfolios(res.data);
        } catch (err) {
            console.error("Failed to fetch portfolios", err);
        }
    };

    const handleSave = async () => {
        if (!saveName.trim()) return;
        try {
            await axios.post(`${API_URL}/portfolios`, {
                name: saveName,
                tickers: currentTickers,
                weights: currentWeights
            });
            setMessage({ type: 'success', text: 'Portfolio saved!' });
            setSaveName("");
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save.' });
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API_URL}/portfolios/${id}`);
            fetchPortfolios(); // refresh list
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    return (
        <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setIsSaving(!isSaving)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors border border-gray-700"
                >
                    <Save className="w-4 h-4" /> Save
                </button>
                <button
                    onClick={() => setShowLoadMenu(!showLoadMenu)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors border border-gray-700"
                >
                    <FolderOpen className="w-4 h-4" /> Load
                </button>
            </div>

            {/* Save Form */}
            {isSaving && (
                <div className="bg-gray-900/80 p-3 rounded-lg border border-gray-700 animate-in slide-in-from-top-2">
                    <input
                        type="text"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        placeholder="Portfolio Name..."
                        className="w-full bg-gray-800 border-none rounded px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 mb-2"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsSaving(false)} className="p-1 hover:bg-gray-700 rounded"><X className="w-4 h-4 text-gray-400" /></button>
                        <button onClick={handleSave} className="p-1 hover:bg-green-900/30 rounded"><Check className="w-4 h-4 text-green-500" /></button>
                    </div>
                </div>
            )}

            {/* Load Menu */}
            {showLoadMenu && (
                <div className="bg-gray-900/90 border border-gray-700 rounded-lg max-h-[200px] overflow-y-auto custom-scrollbar p-1 z-10">
                    {portfolios.length === 0 ? (
                        <div className="text-gray-500 text-xs text-center py-2">No saved portfolios</div>
                    ) : (
                        portfolios.map(p => (
                            <div
                                key={p.id}
                                onClick={() => {
                                    onLoad(p.tickers, p.weights);
                                    setShowLoadMenu(false);
                                    setMessage({ type: 'success', text: `Loaded "${p.name}"` });
                                    setTimeout(() => setMessage(null), 3000);
                                }}
                                className="group flex items-center justify-between p-2 hover:bg-gray-800 rounded cursor-pointer"
                            >
                                <div>
                                    <div className="text-sm font-medium text-gray-200">{p.name}</div>
                                    <div className="text-xs text-gray-500">{p.tickers.length} assets • {new Date(p.created_at).toLocaleDateString()}</div>
                                </div>
                                <button
                                    onClick={(e) => handleDelete(e, p.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-gray-600 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Notification Toast */}
            {message && (
                <div className={`text-xs text-center py-1 rounded ${message.type === 'success' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
