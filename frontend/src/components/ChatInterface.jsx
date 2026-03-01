import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, Send, Key, User, Loader2 } from 'lucide-react';

const API_URL = "http://127.0.0.1:8000";

export default function ChatInterface({ tickers, weights, metrics, factorAnalysis, attribution }) {
    const [apiKey, setApiKey] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your AI Risk Analyst. I can analyze your portfolio's risk factors, attribution, and stress tests. What would you like to know?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !apiKey) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Construct the payload with all context
            const payload = {
                tickers,
                weights,
                metrics: metrics || {},
                factor_analysis: factorAnalysis || {},
                attribution: attribution || {},
                user_query: input,
                api_key: apiKey
            };

            const res = await axios.post(`${API_URL}/ask`, payload);

            if (res.data.analysis) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.data.analysis }]);
            } else if (res.data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${res.data.error}` }]);
            }

        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to the AI." }]);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 backdrop-blur-sm flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-purple-400" />
                    <h3 className="font-medium text-white">AI Investment Analyst</h3>
                </div>

                {/* API Key Input */}
                <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <input
                        type="password"
                        placeholder="Enter Gemini API Key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="bg-gray-800 border-none text-xs text-white rounded px-2 py-1 focus:ring-1 focus:ring-purple-500 w-40"
                    />
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-200'
                            }`}>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-800 rounded-lg p-3">
                            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-gray-800 flex gap-2">
                <input
                    type="text"
                    placeholder={apiKey ? "Ask about your portfolio..." : "Please enter API Key first"}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={!apiKey || loading}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={!apiKey || loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
