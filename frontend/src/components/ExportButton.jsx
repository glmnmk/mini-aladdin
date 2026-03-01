import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { generateClientReport } from '../utils/ReportGenerator';

export default function ExportButton({ portfolioName = "My Portfolio", disabled = false, portfolioData = null }) {
    const [generating, setGenerating] = useState(false);

    const handleExport = () => {
        setGenerating(true);
        try {
            generateClientReport(portfolioName, portfolioData);
        } catch (err) {
            console.error("Export failed", err);
            alert("Failed to generate report. See console for details.");
        } finally {
            setGenerating(false);
        }
    };

    return (
        <button
            onClick={handleExport}
            disabled={disabled || generating}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {generating ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                </>
            ) : (
                <>
                    <FileDown className="w-4 h-4" />
                    <span>Export PDF</span>
                </>
            )}
        </button>
    );
}
