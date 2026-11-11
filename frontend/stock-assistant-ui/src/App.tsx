import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import {
  TrendingUp,
  Search,
  BarChart2,
  PieChart,
  GitCompare,
  Calculator,
  ShieldCheck,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';

interface StockQuote {
  symbol: string;
  company_name: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
  exchange: string;
  volume?: number;
  market_cap?: number;
  pe_ratio?: number;
  fifty_two_week_high?: number;
  fifty_two_week_low?: number;
  timestamp: string;
  data_source: string;
}

interface HistoricalBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface FundamentalMetrics {
  symbol: string;
  company_name: string;
  sector?: string;
  industry?: string;
  currency: string;
  market_cap?: number;
  pe_ratio?: number;
  forward_pe?: number;
  peg_ratio?: number;
  price_to_book?: number;
  dividend_yield?: number;
  profit_margin?: number;
  operating_margin?: number;
  return_on_equity?: number;
  debt_to_equity?: number;
  revenue?: number;
  free_cash_flow?: number;
  retrieval_timestamp: string;
  data_source: string;
}

interface PerformanceSummary {
  symbol: string;
  starting_price: number;
  ending_price: number;
  total_return_percent: number;
  annualized_volatility_percent: number;
  max_drawdown_percent: number;
  sharpe_ratio?: number;
}

interface YearProjection {
  year: number;
  contributed_capital: number;
  projected_balance: number;
  estimated_gains: number;
}

interface WhatIfScenarioResponse {
  symbol: string;
  timeline: YearProjection[];
  final_contributed_capital: number;
  final_projected_balance: number;
  total_estimated_gains: number;
  disclaimer: string;
}

interface SourceAttribution {
  title: string;
  source_name: string;
  retrieval_timestamp: string;
  data_points: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttribution[];
}

export function App() {
  const [activeView, setActiveView] = useState<'overview' | 'technicals' | 'fundamentals' | 'compare' | 'scenario'>('overview');
  const [symbol, setSymbol] = useState('AAPL');
  const [searchQuery, setSearchQuery] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<'1mo' | '3mo' | '6mo' | '1y'>('6mo');

  // Market & Technical State
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalMetrics | null>(null);
  const [technicalSummary, setTechnicalSummary] = useState<string>('Analyzing momentum...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison State
  const [compareSymbols, setCompareSymbols] = useState('AAPL, MSFT, NVDA, GOOGL');
  const [comparisons, setComparisons] = useState<PerformanceSummary[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  // Scenario State
  const [scenarioInitial, setScenarioInitial] = useState(10000);
  const [scenarioMonthly, setScenarioMonthly] = useState(300);
  const [scenarioRate, setScenarioRate] = useState(9.5);
  const [scenarioYears, setScenarioYears] = useState(5);
  const [scenarioResult, setScenarioResult] = useState<WhatIfScenarioResponse | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Chat State
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Stock Market Research Assistant. Ask any question about technical charts, moving averages, valuation ratios, or risk metrics. All analysis is educational, source-attributed, and non-advisory.',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Chart References
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  const API_BASE = 'http://localhost:8000/api/v1';

  // Watchlist quick tickers
  const watchlist = [
    { ticker: 'AAPL', name: 'Apple Inc.' },
    { ticker: 'MSFT', name: 'Microsoft' },
    { ticker: 'NVDA', name: 'NVIDIA' },
    { ticker: 'GOOGL', name: 'Alphabet' },
    { ticker: 'TSLA', name: 'Tesla' },
  ];

  // Fetch Stock Data
  const loadStockData = async (ticker: string, tf: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Quote
      const quoteRes = await fetch(`${API_BASE}/stocks/quote/${ticker}`);
      if (!quoteRes.ok) throw new Error(`Could not fetch quote for ${ticker}`);
      const quoteData: StockQuote = await quoteRes.json();
      setQuote(quoteData);

      // 2. Fetch Fundamentals
      const fundRes = await fetch(`${API_BASE}/fundamentals/${ticker}`);
      if (fundRes.ok) {
        const fundData = await fundRes.json();
        setFundamentals(fundData);
      }

      // 3. Fetch Technicals Summary
      const techRes = await fetch(`${API_BASE}/technicals/${ticker}?period=${tf}`);
      if (techRes.ok) {
        const techData = await techRes.json();
        setTechnicalSummary(techData.summary_trend || 'Neutral moving average posture');
      }

      // 4. Fetch History and Render Candlestick Chart
      const histRes = await fetch(`${API_BASE}/stocks/history/${ticker}?period=${tf}&interval=1d`);
      if (!histRes.ok) throw new Error('Could not fetch historical bars');
      const histData = await histRes.json();

      if (chartContainerRef.current) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#111827' },
            textColor: '#9ca3af',
          },
          grid: {
            vertLines: { color: '#1f2937' },
            horzLines: { color: '#1f2937' },
          },
          width: chartContainerRef.current.clientWidth,
          height: 380,
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#10b981',
          wickDownColor: '#ef4444',
        });

        const formattedBars = histData.bars.map((b: HistoricalBar) => ({
          time: b.timestamp.split('T')[0],
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }));

        candlestickSeries.setData(formattedBars);
        chart.timeScale().fitContent();
        chartInstanceRef.current = chart;
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error loading stock data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData(symbol, timeframe);
  }, [symbol, timeframe]);

  // Handle Multi-Stock Comparison
  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompareLoading(true);
    try {
      const symbolsList = compareSymbols
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const res = await fetch(`${API_BASE}/analysis/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: symbolsList, period: '1y' }),
      });
      if (!res.ok) throw new Error('Failed to run multi-stock comparison');
      const data = await res.json();
      setComparisons(data.comparisons);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setCompareLoading(false);
    }
  };

  // Handle What-If Scenario Calculation
  const handleRunScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setScenarioLoading(true);
    try {
      const res = await fetch(`${API_BASE}/analysis/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbol,
          initial_investment: Number(scenarioInitial),
          monthly_contribution: Number(scenarioMonthly),
          annual_growth_estimate_percent: Number(scenarioRate),
          time_horizon_years: Number(scenarioYears),
        }),
      });
      if (!res.ok) throw new Error('Failed to calculate scenario');
      const data = await res.json();
      setScenarioResult(data);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setScenarioLoading(false);
    }
  };

  // Handle AI Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          symbol: symbol,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          sources: data.sources,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the assistant service. Please check that the FastAPI backend is running.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#030712', color: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Header */}
      <header style={{ borderBottom: '1px solid #1f2937', backgroundColor: '#111827', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <TrendingUp size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em' }}>AI Stock Market Assistant</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Constitution v1.0 • Research, Technicals & Python Engine</div>
          </div>
        </div>

        {/* Global Search */}
        <form onSubmit={(e) => { e.preventDefault(); setSymbol(searchQuery.toUpperCase()); }} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', color: '#6b7280' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker (e.g. AAPL, NVDA, TSLA)..."
              style={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#fff',
                padding: '8px 12px 8px 34px',
                borderRadius: '6px',
                fontSize: '13px',
                width: '280px',
                outline: 'none',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Load
          </button>
        </form>

        <button
          onClick={() => setChatOpen(!chatOpen)}
          style={{
            backgroundColor: chatOpen ? '#1e293b' : '#2563eb',
            color: '#fff',
            border: '1px solid #3b82f6',
            padding: '7px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={14} color="#60a5fa" />
          {chatOpen ? 'Hide AI Assistant' : 'Open AI Assistant'}
        </button>
      </header>

      {/* Quick Watchlist Banner */}
      <div style={{ backgroundColor: '#0b0f19', borderBottom: '1px solid #1f2937', padding: '8px 24px', display: 'flex', gap: '16px', alignItems: 'center', overflowX: 'auto' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Watchlist:</span>
        {watchlist.map((item) => (
          <button
            key={item.ticker}
            onClick={() => { setSymbol(item.ticker); setSearchQuery(item.ticker); }}
            style={{
              background: symbol === item.ticker ? '#1f2937' : 'transparent',
              border: symbol === item.ticker ? '1px solid #3b82f6' : '1px solid transparent',
              color: symbol === item.ticker ? '#60a5fa' : '#d1d5db',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {item.ticker} <span style={{ color: '#6b7280', fontSize: '11px' }}>({item.name})</span>
          </button>
        ))}
      </div>

      {/* Main Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Navigation Sidebar */}
        <aside style={{ width: '220px', backgroundColor: '#0f172a', borderRight: '1px solid #1f2937', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '6px 8px', letterSpacing: '0.05em' }}>Modules</div>
          
          <button
            onClick={() => setActiveView('overview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'overview' ? '#1e293b' : 'transparent',
              color: activeView === 'overview' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeView === 'overview' ? 600 : 500,
              textAlign: 'left',
            }}
          >
            <BarChart2 size={16} /> Dashboard & Chart
          </button>

          <button
            onClick={() => setActiveView('fundamentals')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'fundamentals' ? '#1e293b' : 'transparent',
              color: activeView === 'fundamentals' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeView === 'fundamentals' ? 600 : 500,
              textAlign: 'left',
            }}
          >
            <PieChart size={16} /> Fundamental Analysis
          </button>

          <button
            onClick={() => setActiveView('technicals')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'technicals' ? '#1e293b' : 'transparent',
              color: activeView === 'technicals' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeView === 'technicals' ? 600 : 500,
              textAlign: 'left',
            }}
          >
            <Activity size={16} /> Technical Indicators
          </button>

          <button
            onClick={() => setActiveView('compare')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'compare' ? '#1e293b' : 'transparent',
              color: activeView === 'compare' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeView === 'compare' ? 600 : 500,
              textAlign: 'left',
            }}
          >
            <GitCompare size={16} /> Stock Comparison
          </button>

          <button
            onClick={() => setActiveView('scenario')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeView === 'scenario' ? '#1e293b' : 'transparent',
              color: activeView === 'scenario' ? '#38bdf8' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeView === 'scenario' ? 600 : 500,
              textAlign: 'left',
            }}
          >
            <Calculator size={16} /> What-If Simulator
          </button>

          <div style={{ marginTop: 'auto', padding: '12px', backgroundColor: '#020617', borderRadius: '6px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
              <ShieldCheck size={14} /> Backend Connected
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>FastAPI on localhost:8000</div>
          </div>
        </aside>

        {/* Central Display Area */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Header Quote Card */}
          {quote && (
            <div style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>{quote.company_name}</h2>
                    {loading && <span style={{ fontSize: '11px', color: '#60a5fa' }}>(Refreshing...)</span>}
                    <span style={{ backgroundColor: '#1f2937', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {quote.symbol}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>{quote.exchange}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#9ca3af' }}>
                    <span>Currency: <strong style={{ color: '#f3f4f6' }}>{quote.currency}</strong></span>
                    <span>52W High: <strong style={{ color: '#f3f4f6' }}>${quote.fifty_two_week_high?.toFixed(2) || 'N/A'}</strong></span>
                    <span>52W Low: <strong style={{ color: '#f3f4f6' }}>${quote.fifty_two_week_low?.toFixed(2) || 'N/A'}</strong></span>
                    <span>Volume: <strong style={{ color: '#f3f4f6' }}>{quote.volume?.toLocaleString() || 'N/A'}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>${quote.price.toFixed(2)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: quote.change >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '14px' }}>
                    {quote.change >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              {/* Data Freshness & Attribution Banner */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Info size={12} /> Source: {quote.data_source}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Retrieved: {new Date(quote.timestamp).toLocaleTimeString()} UTC
                </span>
              </div>
            </div>
          )}

          {/* VIEW: OVERVIEW / CANDLESTICK CHART */}
          {activeView === 'overview' && (
            <div style={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #1f2937', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={18} color="#60a5fa" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Candlestick Trend & Price History</h3>
                  <span style={{ fontSize: '12px', color: '#10b981', background: '#064e3b', padding: '2px 8px', borderRadius: '4px' }}>
                    {technicalSummary}
                  </span>
                </div>

                {/* Timeframe Controls */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['1mo', '3mo', '6mo', '1y'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      style={{
                        backgroundColor: timeframe === tf ? '#2563eb' : '#1f2937',
                        color: timeframe === tf ? '#fff' : '#9ca3af',
                        border: 'none',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ color: '#ef4444', padding: '10px' }}>{error}</div>}
              <div ref={chartContainerRef} style={{ width: '100%', minHeight: '380px' }} />
            </div>
          )}

          {/* VIEW: FUNDAMENTAL ANALYSIS */}
          {activeView === 'fundamentals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Trailing P/E Ratio</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>{fundamentals?.pe_ratio || 'N/A'}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Forward P/E: {fundamentals?.forward_pe || 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Profit Margin</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                    {fundamentals?.profit_margin ? `${(fundamentals.profit_margin * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Operating: {fundamentals?.operating_margin ? `${(fundamentals.operating_margin * 100).toFixed(1)}%` : 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Return on Equity (ROE)</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>
                    {fundamentals?.return_on_equity ? `${(fundamentals.return_on_equity * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Debt-to-Equity: {fundamentals?.debt_to_equity || 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Market Capitalization</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>
                    {fundamentals?.market_cap ? `$${(fundamentals.market_cap / 1e12).toFixed(2)}T` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>Sector: {fundamentals?.sector || 'Tech'}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '20px', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0' }}>Financial Health & Cash Flow Overview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Total Revenue (TTM)</span>
                    <strong>{fundamentals?.revenue ? `$${(fundamentals.revenue / 1e9).toFixed(2)}B` : 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Free Cash Flow</span>
                    <strong>{fundamentals?.free_cash_flow ? `$${(fundamentals.free_cash_flow / 1e9).toFixed(2)}B` : 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>PEG Ratio</span>
                    <strong>{fundamentals?.peg_ratio || 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #1f2937', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#9ca3af' }}>Price-to-Book</span>
                    <strong>{fundamentals?.price_to_book || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: TECHNICAL INDICATORS */}
          {activeView === 'technicals' && (
            <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0' }}>Approved Technical Indicators</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>SMA (20 & 50)</div>
                  <div style={{ fontSize: '13px', marginTop: '6px', color: '#d1d5db' }}>20-day arithmetic moving average for short-term trend identification.</div>
                </div>
                <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>RSI (14 Period)</div>
                  <div style={{ fontSize: '13px', marginTop: '6px', color: '#d1d5db' }}>Measures momentum speed and oscillation. Values above 70 indicate overbought; below 30 indicate oversold.</div>
                </div>
                <div style={{ backgroundColor: '#1f2937', padding: '14px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: 600 }}>MACD (12, 26, 9)</div>
                  <div style={{ fontSize: '13px', marginTop: '6px', color: '#d1d5db' }}>Exponential convergence/divergence with signal line and histogram tracking.</div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: MULTI-STOCK COMPARISON */}
          {activeView === 'compare' && (
            <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '20px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Multi-Stock Risk & Return Comparison Matrix</h3>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Calculated via Python Pandas and NumPy</div>
                </div>
              </div>

              <form onSubmit={handleCompare} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={compareSymbols}
                  onChange={(e) => setCompareSymbols(e.target.value)}
                  placeholder="Enter 2 to 5 tickers (e.g. AAPL, MSFT, NVDA, TSLA)"
                  style={{ flex: 1, backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}
                />
                <button type="submit" disabled={compareLoading} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                  {compareLoading ? 'Calculating...' : 'Compare Tickers'}
                </button>
              </form>

              {comparisons.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px' }}>Ticker</th>
                        <th style={{ padding: '10px' }}>Starting Price</th>
                        <th style={{ padding: '10px' }}>Current Price</th>
                        <th style={{ padding: '10px' }}>1-Yr Return %</th>
                        <th style={{ padding: '10px' }}>Ann. Volatility</th>
                        <th style={{ padding: '10px' }}>Max Drawdown</th>
                        <th style={{ padding: '10px' }}>Sharpe Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((c) => (
                        <tr key={c.symbol} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: '#60a5fa' }}>{c.symbol}</td>
                          <td style={{ padding: '12px 10px' }}>${c.starting_price.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px' }}>${c.ending_price.toFixed(2)}</td>
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: c.total_return_percent >= 0 ? '#10b981' : '#ef4444' }}>
                            {c.total_return_percent >= 0 ? '+' : ''}{c.total_return_percent.toFixed(2)}%
                          </td>
                          <td style={{ padding: '12px 10px' }}>{c.annualized_volatility_percent.toFixed(2)}%</td>
                          <td style={{ padding: '12px 10px', color: '#ef4444' }}>-{c.max_drawdown_percent.toFixed(2)}%</td>
                          <td style={{ padding: '12px 10px', fontWeight: 600 }}>{c.sharpe_ratio ?? 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW: WHAT-IF SCENARIOS */}
          {activeView === 'scenario' && (
            <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', padding: '20px', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0' }}>Hypothetical What-If Scenario Studio</h3>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px' }}>
                Simulate compound returns and regular monthly additions over custom time horizons.
              </div>

              <form onSubmit={handleRunScenario} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Initial Capital ($)</label>
                  <input
                    type="number"
                    value={scenarioInitial}
                    onChange={(e) => setScenarioInitial(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '6px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Monthly Addition ($)</label>
                  <input
                    type="number"
                    value={scenarioMonthly}
                    onChange={(e) => setScenarioMonthly(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '6px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Annual Growth Estimate (%)</label>
                  <input
                    type="number"
                    value={scenarioRate}
                    onChange={(e) => setScenarioRate(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '6px', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Duration (Years)</label>
                  <input
                    type="number"
                    value={scenarioYears}
                    onChange={(e) => setScenarioYears(Number(e.target.value))}
                    style={{ width: '100%', backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', padding: '8px', borderRadius: '6px', marginTop: '4px' }}
                  />
                </div>
                <div style={{ gridColumn: 'span 4' }}>
                  <button type="submit" disabled={scenarioLoading} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                    {scenarioLoading ? 'Simulating...' : 'Run Simulation'}
                  </button>
                </div>
              </form>

              {scenarioResult && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Principal Contributed</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>${scenarioResult.final_contributed_capital.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Projected Balance</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>${scenarioResult.final_projected_balance.toLocaleString()}</div>
                    </div>
                    <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>Estimated Investment Gains</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa', marginTop: '4px' }}>+${scenarioResult.total_estimated_gains.toLocaleString()}</div>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                        <th style={{ padding: '8px' }}>Year</th>
                        <th style={{ padding: '8px' }}>Contributed Capital</th>
                        <th style={{ padding: '8px' }}>Balance</th>
                        <th style={{ padding: '8px' }}>Accrued Gains</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioResult.timeline.map((row) => (
                        <tr key={row.year} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '8px' }}>Year {row.year}</td>
                          <td style={{ padding: '8px' }}>${row.contributed_capital.toLocaleString()}</td>
                          <td style={{ padding: '8px', color: '#10b981', fontWeight: 600 }}>${row.projected_balance.toLocaleString()}</td>
                          <td style={{ padding: '8px', color: '#60a5fa' }}>${row.estimated_gains.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: '16px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic' }}>
                    {scenarioResult.disclaimer}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Collapsible AI Assistant Pane */}
        {chatOpen && (
          <aside style={{ width: '400px', backgroundColor: '#111827', borderLeft: '1px solid #1f2937', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} color="#60a5fa" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>AI Research Assistant</h3>
              </div>
              <span style={{ fontSize: '10px', background: '#064e3b', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                Grounded Mode
              </span>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                  <div
                    style={{
                      backgroundColor: msg.role === 'user' ? '#2563eb' : '#1f2937',
                      color: '#f9fafb',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  >
                    {msg.content}
                  </div>

                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', background: '#0b0f19', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8' }}>
                        <ShieldCheck size={12} /> Grounded Data Sources:
                      </div>
                      {msg.sources.map((s, i) => (
                        <div key={i}>• {s.title} ({s.source_name})</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && <div style={{ fontSize: '12px', color: '#60a5fa', fontStyle: 'italic' }}>Analyzing financial context...</div>}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid #1f2937', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder="Ask about valuation, technicals..."
                style={{
                  flex: 1,
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: '#fff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Send size={15} />
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
export default App;
