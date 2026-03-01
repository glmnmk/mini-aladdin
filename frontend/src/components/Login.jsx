import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Activity, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function Login() {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const endpoint = isLogin ? '/login' : '/register';
            const res = await axios.post(`${API_URL}${endpoint}`, { email, password });

            login(
                { id: res.data.user_id, email: res.data.email },
                res.data.access_token
            );
        } catch (err) {
            setError(err.response?.data?.detail || "Authentication failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">

            {/* Branding Header */}
            <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                </div>
                <h1 className="text-4xl font-light tracking-tight text-white mb-2">MaaS <span className="text-blue-500 font-bold">Terminal</span></h1>
                <p className="text-gray-400">Institutional Quantitative Risk Analytics</p>
            </div>

            {/* Login Box */}
            <div className="w-full max-w-md bg-gray-900/50 p-8 rounded-2xl border border-gray-800 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-700 delay-150 fill-mode-both">

                <div className="flex gap-4 mb-8 border-b border-gray-800 pb-px">
                    <button
                        onClick={() => { setIsLogin(true); setError(null); }}
                        className={`pb-3 text-sm font-medium transition-colors relative ${isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Sign In
                        {isLogin && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>}
                    </button>
                    <button
                        onClick={() => { setIsLogin(false); setError(null); }}
                        className={`pb-3 text-sm font-medium transition-colors relative ${!isLogin ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Create Account
                        {!isLogin && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>}
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                placeholder="advisor@firm.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Password</label>
                            {isLogin && <a href="#" className="text-xs text-blue-500 hover:text-blue-400">Forgot?</a>}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-10 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-700"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2 group"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {isLogin ? 'Authenticate Session' : 'Provision Instance'}
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-800 text-center">
                    <p className="text-xs text-gray-600">
                        Secure connection established. All data is encrypted in transit and at rest.
                    </p>
                </div>
            </div>
        </div>
    );
}
