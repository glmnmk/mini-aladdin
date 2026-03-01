import { useState, useEffect } from 'react'
import axios from 'axios'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { Plus, Trash2, Play, Activity, TrendingUp, AlertTriangle, BarChart3, Bot, LogOut } from 'lucide-react'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import ManualAllocation from './components/ManualAllocation'
import PortfolioManager from './components/PortfolioManager'
import StressTest from './components/StressTest'
import CorrelationHeatmap from './components/CorrelationHeatmap'
import BlackLitterman from './components/BlackLitterman'
import ExportButton from './components/ExportButton'
import AssumptionsModal from './components/AssumptionsModal'
import FactorAnalysis from './components/FactorAnalysis'
import PerformanceAttribution from './components/PerformanceAttribution'
import ChatInterface from './components/ChatInterface'
import AdvancedRiskMetrics from './components/AdvancedRiskMetrics'
import WealthProjection from './components/WealthProjection'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'

function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth()

  const [tickers, setTickers] = useState(["AAPL", "GOOG", "MSFT", "AMZN"])
  const [tickerNames, setTickerNames] = useState({
    "AAPL": "Apple Inc.", "GOOG": "Alphabet Inc.", "MSFT": "Microsoft Corporation", "AMZN": "Amazon.com, Inc."
  })
  const [newTicker, setNewTicker] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  // Manual Mode State
  const [manualWeights, setManualWeights] = useState({})
  const [showAI, setShowAI] = useState(false)
  const [manualMetrics, setManualMetrics] = useState(null)
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Initialize weights equally when tickers change
  useEffect(() => {
    const weight = 1.0 / tickers.length
    const initialWeights = {}
    tickers.forEach(t => initialWeights[t] = weight)
    setManualWeights(initialWeights)

    // Trigger metrics update for initial weights
    if (tickers.length > 0) {
      updateManualMetrics(initialWeights)
    }
  }, [tickers])

  const updateManualMetrics = async (weights) => {
    try {
      const response = await axios.post(`${API_URL}/metrics`, {
        tickers: tickers,
        weights: weights,
        period: "5y"
      })
      setManualMetrics(response.data)
    } catch (err) {
      console.error("Failed to fetch manual metrics", err)
    }
  }

  const handleManualWeightChange = (newWeights) => {
    setManualWeights(newWeights)
    // simple debounce could be added here
    updateManualMetrics(newWeights)
  }

  const handleLoadPortfolio = (loadedTickers, loadedWeights) => {
    setTickers(loadedTickers)
    // Small delay to allow tickers to update before setting weights
    // This prevents the useEffect from overwriting with equal weights
    setTimeout(() => {
      setManualWeights(loadedWeights)
      updateManualMetrics(loadedWeights)
    }, 100)
  }

  const addTicker = (symbolObj = null) => {
    let t = "";
    let name = "";
    if (symbolObj && symbolObj.symbol) {
      t = symbolObj.symbol.toUpperCase();
      name = symbolObj.name;
    } else {
      t = newTicker.toUpperCase();
    }

    if (t && !tickers.includes(t)) {
      setTickers([...tickers, t])
      if (name) {
        setTickerNames(prev => ({ ...prev, [t]: name }))
      }
      setNewTicker("")
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleTickerChange = async (e) => {
    const val = e.target.value.toUpperCase();
    setNewTicker(val);

    if (val.length > 0) {
      try {
        const res = await axios.get(`${API_URL}/search?q=${val}`);
        setSuggestions(res.data.results || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Search error", err);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  const removeTicker = (t) => {
    setTickers(tickers.filter(ticker => ticker !== t))
  }

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.post(`${API_URL}/analyze`, {
        tickers: tickers,
        period: "5y",
        num_simulations: 2000
      })
      setData(response.data)

      // Initialize manual metrics with current equal weights
      updateManualMetrics(manualWeights)

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch analysis")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white"><div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div></div>
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500 selection:text-white font-sans p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-white mb-2">MaaS <span className="text-blue-500 font-bold">Terminal</span></h1>
            <p className="text-gray-400">Institutional Quantitative Risk Analytics</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500 border border-gray-800 bg-gray-900 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              {user.email}
            </span>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="w-px h-8 bg-gray-800 mx-2"></div>
            <button
              onClick={() => setShowAI(!showAI)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${showAI ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
            >
              <Bot className="w-5 h-5" />
              <span className="text-sm font-medium">AI Analyst</span>
            </button>
            <div className={cn("w-3 h-3 rounded-full animate-pulse", loading ? "bg-yellow-500" : "bg-green-500")}></div>
            <span className="text-sm text-gray-400 mr-4">{loading ? "Simulating..." : "System Ready"}</span>
            <ExportButton
              disabled={loading}
              portfolioData={{
                tickers,
                weights: manualWeights,
                metrics: manualMetrics,
                optimizationData: data
              }}
            />
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-6 relative">
          {/* Main Content */}
          <div className={`flex-1 space-y-8 transition-all duration-300 ${showAI ? 'w-2/3' : 'w-full'}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar Controls */}
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                  <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Assets
                  </h2>

                  <div className="flex gap-2 mb-4 relative">
                    <input
                      value={newTicker}
                      onChange={handleTickerChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (suggestions.length > 0) {
                            addTicker(suggestions[0]);
                          } else {
                            addTicker();
                          }
                        }
                      }}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder="Ticker (e.g. SPY)"
                      className="bg-gray-800 border-none rounded-lg px-3 py-2 text-sm w-full focus:ring-1 focus:ring-blue-500 outline-none uppercase"
                    />
                    <button onClick={() => addTicker()} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors shrink-0">
                      <Plus className="w-5 h-5" />
                    </button>

                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-14 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                        {suggestions.map((sug, idx) => (
                          <div
                            key={idx}
                            onClick={() => addTicker(sug)}
                            className="px-3 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center border-b border-gray-700/50 last:border-0"
                          >
                            <span className="font-bold text-blue-400">{sug.symbol}</span>
                            <span className="text-xs text-gray-400 truncate ml-2 max-w-[150px]">{sug.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {tickers.map(t => (
                      <div
                        key={t}
                        className="flex items-center justify-between bg-gray-800/50 px-3 py-2 rounded-lg group"
                        title={tickerNames[t] || t}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono font-medium">{t}</span>
                          {tickerNames[t] && <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{tickerNames[t]}</span>}
                        </div>
                        <button onClick={() => removeTicker(t)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <PortfolioManager
                  currentTickers={tickers}
                  currentWeights={manualWeights}
                  onLoad={handleLoadPortfolio}
                />

                <ManualAllocation
                  tickers={tickers}
                  weights={manualWeights}
                  setWeights={setManualWeights}
                  onUpdate={handleManualWeightChange}
                />

                <div className="space-y-2">
                  <button
                    onClick={runAnalysis}
                    disabled={loading || tickers.length < 2}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>Analyzing Market Data...</>
                    ) : (
                      <><Play className="w-5 h-5 fill-current" /> Run Simulation</>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="bg-red-900/20 border border-red-800 text-red-200 p-4 rounded-lg text-sm flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              {/* Main Content */}
              <div className="lg:col-span-9 space-y-6">
                {/* Tab Navigation */}
                {manualWeights && Object.keys(manualWeights).length > 0 && (
                  <div className="flex space-x-2 border-b border-gray-800 pb-4 overflow-x-auto custom-scrollbar">
                    {[
                      { id: 'overview', label: 'Overview' },
                      { id: 'wealth', label: 'Wealth Projection' },
                      { id: 'risk', label: 'Risk & Stress Tests' },
                      { id: 'factors', label: 'Factor Analysis & Attribution' },
                      { id: 'correlation', label: 'Correlation' },
                      { id: 'black-litterman', label: 'Black-Litterman' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual Analysis Area - Always Visible if Weights Set */}
                {manualWeights && (
                  <div className="space-y-6">
                    {activeTab === 'overview' && manualMetrics && manualMetrics.metrics && (
                      <div id="portfolio-summary" className="animate-in fade-in duration-500 mt-6">
                        <PortfolioCard
                          title="Your Manual Portfolio"
                          description="Custom Allocation"
                          portfolio={{
                            metrics: manualMetrics.metrics,
                            weights: manualWeights
                          }}
                          color="text-white"
                        />
                      </div>
                    )}

                    {activeTab === 'black-litterman' && (
                      <div id="black-litterman" className="animate-in fade-in duration-500 mt-6">
                        <BlackLitterman
                          tickers={tickers}
                          currentWeights={manualWeights}
                          onApplyWeights={handleManualWeightChange}
                        />
                      </div>
                    )}

                    {activeTab === 'risk' && (
                      <div className="space-y-6 animate-in fade-in duration-500 mt-6">
                        <div id="advanced-risk">
                          <AdvancedRiskMetrics
                            varMetrics={manualMetrics?.var_metrics}
                            mctrMetrics={manualMetrics?.mctr_metrics}
                          />
                        </div>

                        <div id="stress-test">
                          <StressTest
                            tickers={tickers}
                            weights={manualWeights}
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'correlation' && (
                      <div id="correlation-matrix" className="animate-in fade-in duration-500 mt-6">
                        <CorrelationHeatmap
                          tickers={tickers}
                        />
                      </div>
                    )}

                    {activeTab === 'factors' && (
                      <div className="space-y-6 animate-in fade-in duration-500 mt-6">
                        <div id="factor-analysis">
                          <FactorAnalysis
                            tickers={tickers}
                            weights={manualWeights}
                          />
                        </div>

                        <div id="performance-attribution">
                          <PerformanceAttribution
                            tickers={tickers}
                            weights={manualWeights}
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'wealth' && (
                      <div id="wealth-projection" className="animate-in fade-in duration-500 mt-6">
                        <WealthProjection
                          tickers={tickers}
                          weights={manualWeights}
                        />
                      </div>
                    )}
                  </div>
                )}

                {!data && !loading && (
                  <div className="h-[300px] flex flex-col items-center justify-center bg-gray-900/30 rounded-xl border border-gray-800 border-dashed text-gray-500">
                    <Activity className="w-16 h-16 mb-4 opacity-20" />
                    <p>Run full simulation to see Efficient Frontier & Optimal Portfolios</p>
                  </div>
                )}

                {data && activeTab === 'overview' && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Key Metrics Cards */}
                    <div className="flex justify-between items-center mb-4 pt-6 border-t border-gray-800">
                      <h3 className="text-xl font-light">Efficient Frontier <span className="text-blue-500 font-bold">Analysis</span></h3>
                      <button
                        onClick={() => setShowAssumptions(true)}
                        className="text-xs text-blue-400 hover:text-blue-300 underline"
                      >
                        View Asset Statistics
                      </button>
                    </div>

                    <AssumptionsModal
                      isOpen={showAssumptions}
                      onClose={() => setShowAssumptions(false)}
                      data={data.individual_assets}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PortfolioCard
                        title="Max Sharpe Ratio"
                        description="Best risk-adjusted"
                        portfolio={data.max_sharpe_portfolio}
                        color="text-green-400"
                      />
                      <PortfolioCard
                        title="Min Volatility"
                        description="Lowest risk"
                        portfolio={data.min_vol_portfolio}
                        color="text-yellow-400"
                      />
                    </div>

                    {/* Charts Area */}
                    <div className="grid grid-cols-1 gap-6">
                      {/* Efficient Frontier */}
                      <div id="efficient-frontier" className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm">
                        <h3 className="text-lg font-medium mb-6">Efficient Frontier</h3>
                        <div className="h-[400px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                              <XAxis
                                type="number"
                                dataKey="volatility"
                                name="Volatility"
                                unit=""
                                stroke="#666"
                                tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                                label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -10, fill: '#666' }}
                              />
                              <YAxis
                                type="number"
                                dataKey="return"
                                name="Return"
                                unit=""
                                stroke="#666"
                                tickFormatter={(val) => (val * 100).toFixed(0) + '%'}
                                label={{ value: 'Expected Return', angle: -90, position: 'insideLeft', fill: '#666' }}
                              />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />

                              {/* Monte Carlo Cloud */}
                              <Scatter name="Portfolios" data={data.results} fill="#3b82f6" fillOpacity={0.4}>
                                {data.results.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.sharpe > 1.5 ? '#60a5fa' : '#1e3a8a'} />
                                ))}
                              </Scatter>

                              {/* Optimal Portfolios */}
                              <Scatter name="Max Sharpe" data={[data.max_sharpe_portfolio.metrics]} fill="#10b981" shape="star" s={200} />
                              <Scatter name="Min Vol" data={[data.min_vol_portfolio.metrics]} fill="#facc15" shape="circle" s={150} />

                              {/* Individual Assets */}
                              <Scatter name="Assets" data={data.individual_assets} fill="#ffffff" shape="square" s={100}>
                                <LabelList dataKey="ticker" position="top" style={{ fill: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                              </Scatter>

                              {/* Manual Portfolio Point */}
                              {manualMetrics && (
                                <Scatter name="Manual" data={[manualMetrics]} fill="#a855f7" shape="diamond" s={250} />
                              )}
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Sidebar */}
          <div className={`fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-800 transform transition-transform duration-300 ease-in-out z-50 ${showAI ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col pt-20 pb-4 px-4">
              <ChatInterface
                tickers={tickers}
                weights={manualWeights}
                metrics={manualMetrics?.metrics}
                factorAnalysis={manualMetrics?.factor_analysis}
                attribution={manualMetrics?.attribution}
              />
            </div>
          </div>

          {/* Overlay for mobile/closing */}
          {showAI && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowAI(false)}
            />
          )}
        </main>
      </div>
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500 uppercase">{label}</span>
      <span className="font-mono font-bold">
        {label === "Sharpe" ? value.toFixed(2) : (value * 100).toFixed(1) + "%"}
      </span>
    </div>
  )
}

function PortfolioCard({ title, description, portfolio, color }) {
  return (
    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-800 backdrop-blur-sm hover:border-gray-700 transition-colors">
      <h3 className={cn("text-lg font-bold mb-1", color)}>{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800/50 p-2 rounded-lg text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Return</div>
          <div className="text-lg font-mono font-bold">{(portfolio.metrics.return * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded-lg text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Risk</div>
          <div className="text-lg font-mono font-bold">{(portfolio.metrics.volatility * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded-lg text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Sharpe</div>
          <div className="text-lg font-mono font-bold text-blue-400">{portfolio.metrics.sharpe.toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Allocation</div>
        {Object.entries(portfolio.weights).sort(([, a], [, b]) => b - a).map(([ticker, weight]) => (
          weight > 0.01 && (
            <div key={ticker} className="flex justify-between items-center text-sm">
              <span className="font-mono text-gray-300">{ticker}</span>
              <div className="flex items-center gap-2 flex-1 mx-4">
                <div className="h-1.5 bg-gray-800 rounded-full flex-1 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${weight * 100}%` }}></div>
                </div>
              </div>
              <span className="font-mono font-bold">{(weight * 100).toFixed(1)}%</span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs font-mono">
        <p className="text-blue-400">Return: {(data.return * 100).toFixed(2)}%</p>
        <p className="text-gray-300">Risk: {(data.volatility * 100).toFixed(2)}%</p>
        <p className="text-green-400">Sharpe: {data.sharpe.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};
