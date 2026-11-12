import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import {
  TrendingUp,
  Search,
  BarChart2,
  PieChart,
  Calculator,
  ShieldCheck,
  Send,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Clock,
  Sparkles,
  Cpu,
  Terminal,
  Play,
  RotateCw,
  Mic,
  MicOff,
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

interface MCPToolCall {
  tool_name: string;
  parameters: Record<string, any>;
  execution_time_ms: number;
  status: string;
  sandbox_isolated: boolean;
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
  tool_calls?: MCPToolCall[];
  sources?: SourceAttribution[];
}

interface JobStatus {
  job_id: string;
  task_name: string;
  symbol: string;
  status: string;
  progress_percent: number;
  created_at: string;
  retry_count: number;
  worker_node: string;
  result?: any;
}

export function App() {
  const [activeTab, setActiveTab] = useState<'technicals' | 'fundamentals' | 'scenarios' | 'jobs'>('technicals');
  const [symbol, setSymbol] = useState('TSLA');
  const [searchQuery, setSearchQuery] = useState('TSLA');
  const [timeframe, setTimeframe] = useState<'1mo' | '3mo' | '6mo' | '1y'>('6mo');

  // State
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalMetrics | null>(null);
  const [technicalSummary, setTechnicalSummary] = useState<string>('Computing moving averages...');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Comparison State
  const [compareSymbols, setCompareSymbols] = useState('AAPL, MSFT, NVDA, TSLA');
  const [comparisons, setComparisons] = useState<PerformanceSummary[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);

  // Scenario State
  const [scenarioInitial, setScenarioInitial] = useState(10000);
  const [scenarioMonthly, setScenarioMonthly] = useState(350);
  const [scenarioRate, setScenarioRate] = useState(10.0);
  const [scenarioYears, setScenarioYears] = useState(5);
  const [scenarioResult, setScenarioResult] = useState<WhatIfScenarioResponse | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // Background Jobs State
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Chat State
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '👋 Welcome! I am your AI Stock Market Research Assistant.\n\nYou can ask me ANY question:\n• "Give me a summary of Tesla"\n• "What is the P/E ratio and what does it mean?"\n• "Compare Apple and Nvidia"\n• "How does RSI work?"\n• Or any custom financial analysis inquiry!',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMsg(transcript);
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error('Recognition already started or error:', e);
      }
    }
  };

  // Chat scroll container
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Chart References
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

  const watchlist = [
    { ticker: 'AAPL', name: 'Apple' },
    { ticker: 'MSFT', name: 'Microsoft' },
    { ticker: 'NVDA', name: 'NVIDIA' },
    { ticker: 'GOOGL', name: 'Alphabet' },
    { ticker: 'TSLA', name: 'Tesla' },
  ];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Load Stock Quote, Fundamentals, History
  const loadStockData = async (ticker: string, tf: string) => {
    setLoading(true);
    setError(null);
    try {
      const quoteRes = await fetch(`${API_BASE}/stocks/quote/${ticker}`);
      if (!quoteRes.ok) throw new Error(`Could not fetch quote for ${ticker}`);
      const quoteData: StockQuote = await quoteRes.json();
      setQuote(quoteData);

      const fundRes = await fetch(`${API_BASE}/fundamentals/${ticker}`);
      if (fundRes.ok) {
        const fundData = await fundRes.json();
        setFundamentals(fundData);
      }

      const techRes = await fetch(`${API_BASE}/technicals/${ticker}?period=${tf}`);
      if (techRes.ok) {
        const techData = await techRes.json();
        setTechnicalSummary(techData.summary_trend || 'Descriptive trend neutral');
      }

      const histRes = await fetch(`${API_BASE}/stocks/history/${ticker}?period=${tf}&interval=1d`);
      if (!histRes.ok) throw new Error('Could not fetch historical data');
      const histData = await histRes.json();

      if (chartContainerRef.current) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#090d16' },
            textColor: '#94a3b8',
          },
          grid: {
            vertLines: { color: '#1e293b' },
            horzLines: { color: '#1e293b' },
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

  // Load Background Jobs
  const loadJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/jobs/`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {
      // Ignored
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'jobs') {
      loadJobs();
    }
  }, [activeTab]);

  const handleEnqueueJob = async () => {
    try {
      const res = await fetch(`${API_BASE}/jobs/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: 'Monte Carlo 10,000-Path Volatility Simulation',
          symbol: symbol,
          parameters: { iterations: 10000, confidence: 0.95 },
        }),
      });
      if (res.ok) {
        await loadJobs();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

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
      if (!res.ok) throw new Error('Failed to run comparison');
      const data = await res.json();
      setComparisons(data.comparisons);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setCompareLoading(false);
    }
  };

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
          tool_calls: data.tool_calls,
          sources: data.sources,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to connect to AI assistant service. Verify backend is running on localhost:8000.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#030712', color: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top Professional Navigation */}
      <header style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0a0f1d', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#2563eb', padding: '7px', borderRadius: '8px', display: 'flex', boxShadow: '0 0 12px rgba(37,99,235,0.4)' }}>
            <TrendingUp size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              AI Stock Market Assistant
              <span style={{ fontSize: '10px', background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '12px', border: '1px solid #334155' }}>
                PROD-READY v1.0
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Market Data • Python Sandbox • Celery Queue • MCP Tool Calling
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <form onSubmit={(e) => { e.preventDefault(); setSymbol(searchQuery.toUpperCase()); }} style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker (e.g. AAPL, NVDA, TSLA)..."
              style={{
                backgroundColor: '#111827',
                border: '1px solid #334155',
                color: '#fff',
                padding: '7px 14px 7px 36px',
                borderRadius: '8px',
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
              padding: '7px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Load
          </button>
        </form>

        {/* Status Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', backgroundColor: '#064e3b33', padding: '4px 10px', borderRadius: '20px', border: '1px solid #065f46' }}>
            <Cpu size={13} /> Python Sandbox: <strong style={{ color: '#fff' }}>Secure</strong>
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            style={{
              backgroundColor: chatOpen ? '#1e293b' : '#2563eb',
              color: '#fff',
              border: '1px solid #3b82f6',
              padding: '6px 14px',
              borderRadius: '8px',
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
        </div>
      </header>

      {/* Watchlist Quick Bar */}
      <div style={{ backgroundColor: '#070b14', borderBottom: '1px solid #1e293b', padding: '6px 20px', display: 'flex', gap: '14px', alignItems: 'center', overflowX: 'auto', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Watchlist:</span>
        {watchlist.map((item) => (
          <button
            key={item.ticker}
            onClick={() => { setSymbol(item.ticker); setSearchQuery(item.ticker); }}
            style={{
              background: symbol === item.ticker ? '#1e293b' : 'transparent',
              border: symbol === item.ticker ? '1px solid #3b82f6' : '1px solid transparent',
              color: symbol === item.ticker ? '#38bdf8' : '#94a3b8',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {item.ticker} <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 400 }}>({item.name})</span>
          </button>
        ))}
      </div>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Left Content Area */}
        <main style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Executive Stock Header Card */}
          {quote && (
            <div style={{ backgroundColor: '#0d1322', borderRadius: '12px', border: '1px solid #1e293b', padding: '18px 22px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{quote.company_name}</h2>
                    <span style={{ backgroundColor: '#1e293b', color: '#38bdf8', padding: '3px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>
                      {quote.symbol}
                    </span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{quote.exchange}</span>
                    {loading && <span style={{ fontSize: '12px', color: '#38bdf8', fontStyle: 'italic' }}>Refreshing data...</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '18px', marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                    <span>Currency: <strong style={{ color: '#f1f5f9' }}>{quote.currency}</strong></span>
                    <span>52W High: <strong style={{ color: '#f1f5f9' }}>${quote.fifty_two_week_high?.toFixed(2) || 'N/A'}</strong></span>
                    <span>52W Low: <strong style={{ color: '#f1f5f9' }}>${quote.fifty_two_week_low?.toFixed(2) || 'N/A'}</strong></span>
                    <span>Volume: <strong style={{ color: '#f1f5f9' }}>{quote.volume?.toLocaleString() || 'N/A'}</strong></span>
                    <span>P/E: <strong style={{ color: '#f1f5f9' }}>{quote.pe_ratio || 'N/A'}</strong></span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.03em' }}>${quote.price.toFixed(2)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', color: quote.change >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '14px' }}>
                    {quote.change >= 0 ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Info size={13} color="#38bdf8" /> Data Provider: {quote.data_source}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} /> Retrieval Timestamp: {new Date(quote.timestamp).toLocaleTimeString()} UTC
                </span>
              </div>
            </div>
          )}

          {/* Core Feature Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '10px', flexShrink: 0 }}>
            <button
              onClick={() => setActiveTab('technicals')}
              style={{
                backgroundColor: activeTab === 'technicals' ? '#2563eb' : '#0d1322',
                color: activeTab === 'technicals' ? '#fff' : '#94a3b8',
                border: '1px solid #1e293b',
                padding: '9px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <BarChart2 size={15} /> 1. Technical Analysis Studio
            </button>

            <button
              onClick={() => setActiveTab('fundamentals')}
              style={{
                backgroundColor: activeTab === 'fundamentals' ? '#2563eb' : '#0d1322',
                color: activeTab === 'fundamentals' ? '#fff' : '#94a3b8',
                border: '1px solid #1e293b',
                padding: '9px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <PieChart size={15} /> 2. Fundamental Analysis & Statements
            </button>

            <button
              onClick={() => setActiveTab('scenarios')}
              style={{
                backgroundColor: activeTab === 'scenarios' ? '#2563eb' : '#0d1322',
                color: activeTab === 'scenarios' ? '#fff' : '#94a3b8',
                border: '1px solid #1e293b',
                padding: '9px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Calculator size={15} /> 3. Python Calculations & Scenarios
            </button>

            <button
              onClick={() => setActiveTab('jobs')}
              style={{
                backgroundColor: activeTab === 'jobs' ? '#2563eb' : '#0d1322',
                color: activeTab === 'jobs' ? '#fff' : '#94a3b8',
                border: '1px solid #1e293b',
                padding: '9px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <Terminal size={15} /> 4. Celery Queue & Background Jobs
            </button>
          </div>

          {/* TAB 1: TECHNICAL ANALYSIS STUDIO */}
          {activeTab === 'technicals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#0d1322', borderRadius: '12px', border: '1px solid #1e293b', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart2 size={17} color="#38bdf8" />
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Interactive Candlestick Chart</h3>
                    <span style={{ fontSize: '11px', color: '#10b981', background: '#064e3b44', padding: '2px 8px', borderRadius: '6px', border: '1px solid #065f46' }}>
                      {technicalSummary}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['1mo', '3mo', '6mo', '1y'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        style={{
                          backgroundColor: timeframe === tf ? '#2563eb' : '#1e293b',
                          color: timeframe === tf ? '#fff' : '#94a3b8',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {tf.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <div style={{ color: '#ef4444', padding: '8px' }}>{error}</div>}
                <div ref={chartContainerRef} style={{ width: '100%', minHeight: '380px' }} />
              </div>
            </div>
          )}

          {/* TAB 2: FUNDAMENTALS */}
          {activeTab === 'fundamentals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Valuation (P/E)</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>{fundamentals?.pe_ratio || 'N/A'}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Forward P/E: {fundamentals?.forward_pe || 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Profit Margin</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px', color: '#10b981' }}>
                    {fundamentals?.profit_margin ? `${(fundamentals.profit_margin * 100).toFixed(2)}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Operating: {fundamentals?.operating_margin ? `${(fundamentals.operating_margin * 100).toFixed(1)}%` : 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Return on Equity</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                    {fundamentals?.return_on_equity ? `${(fundamentals.return_on_equity * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Debt/Equity: {fundamentals?.debt_to_equity || 'N/A'}</div>
                </div>

                <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '16px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Market Capitalization</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '4px' }}>
                    {fundamentals?.market_cap ? `$${(fundamentals.market_cap / 1e12).toFixed(2)}T` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Sector: {fundamentals?.sector || 'Auto / Tech'}</div>
                </div>
              </div>

              <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '18px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0' }}>Financial Statements & Performance Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Total Revenue (TTM)</span>
                    <strong style={{ color: '#f8fafc' }}>{fundamentals?.revenue ? `$${(fundamentals.revenue / 1e9).toFixed(2)}B` : 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Free Cash Flow</span>
                    <strong style={{ color: '#f8fafc' }}>{fundamentals?.free_cash_flow ? `$${(fundamentals.free_cash_flow / 1e9).toFixed(2)}B` : 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>PEG Ratio</span>
                    <strong style={{ color: '#f8fafc' }}>{fundamentals?.peg_ratio || 'N/A'}</strong>
                  </div>
                  <div style={{ borderBottom: '1px solid #1e293b', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Price-to-Book</span>
                    <strong style={{ color: '#f8fafc' }}>{fundamentals?.price_to_book || 'N/A'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SCENARIOS */}
          {activeTab === 'scenarios' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '18px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0' }}>Multi-Stock Comparison Matrix</h3>
                <form onSubmit={handleCompare} style={{ display: 'flex', gap: '8px', margin: '14px 0' }}>
                  <input
                    type="text"
                    value={compareSymbols}
                    onChange={(e) => setCompareSymbols(e.target.value)}
                    style={{ flex: 1, backgroundColor: '#111827', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}
                  />
                  <button type="submit" disabled={compareLoading} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                    {compareLoading ? 'Calculating...' : 'Compare'}
                  </button>
                </form>

                {comparisons.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                        <th style={{ padding: '8px' }}>Symbol</th>
                        <th style={{ padding: '8px' }}>1-Yr Return %</th>
                        <th style={{ padding: '8px' }}>Volatility</th>
                        <th style={{ padding: '8px' }}>Max Drawdown</th>
                        <th style={{ padding: '8px' }}>Sharpe Ratio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((c) => (
                        <tr key={c.symbol} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 800, color: '#38bdf8' }}>{c.symbol}</td>
                          <td style={{ padding: '10px 8px', fontWeight: 800, color: c.total_return_percent >= 0 ? '#10b981' : '#ef4444' }}>
                            {c.total_return_percent >= 0 ? '+' : ''}{c.total_return_percent.toFixed(2)}%
                          </td>
                          <td style={{ padding: '10px 8px' }}>{c.annualized_volatility_percent.toFixed(2)}%</td>
                          <td style={{ padding: '10px 8px', color: '#ef4444' }}>-{c.max_drawdown_percent.toFixed(2)}%</td>
                          <td style={{ padding: '10px 8px', fontWeight: 700 }}>{c.sharpe_ratio ?? 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* What-If Scenario Compound Growth Simulator */}
              <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '18px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0' }}>Hypothetical What-If Scenario Studio</h3>
                <form onSubmit={handleRunScenario} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', margin: '14px 0' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Initial Capital ($)</label>
                    <input
                      type="number"
                      value={scenarioInitial}
                      onChange={(e) => setScenarioInitial(Number(e.target.value))}
                      style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #334155', color: '#fff', padding: '7px 10px', borderRadius: '6px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Monthly Addition ($)</label>
                    <input
                      type="number"
                      value={scenarioMonthly}
                      onChange={(e) => setScenarioMonthly(Number(e.target.value))}
                      style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #334155', color: '#fff', padding: '7px 10px', borderRadius: '6px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Annual Growth (%)</label>
                    <input
                      type="number"
                      value={scenarioRate}
                      onChange={(e) => setScenarioRate(Number(e.target.value))}
                      style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #334155', color: '#fff', padding: '7px 10px', borderRadius: '6px', marginTop: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>Horizon (Years)</label>
                    <input
                      type="number"
                      value={scenarioYears}
                      onChange={(e) => setScenarioYears(Number(e.target.value))}
                      style={{ width: '100%', backgroundColor: '#111827', border: '1px solid #334155', color: '#fff', padding: '7px 10px', borderRadius: '6px', marginTop: '4px' }}
                    />
                  </div>
                  <div style={{ gridColumn: 'span 4' }}>
                    <button type="submit" disabled={scenarioLoading} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '9px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                      {scenarioLoading ? 'Simulating in Python...' : 'Run Simulation'}
                    </button>
                  </div>
                </form>

                {scenarioResult && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Contributed</div>
                        <div style={{ fontSize: '18px', fontWeight: 800 }}>${scenarioResult.final_contributed_capital.toLocaleString()}</div>
                      </div>
                      <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Projected Balance</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>${scenarioResult.final_projected_balance.toLocaleString()}</div>
                      </div>
                      <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Accrued Gains</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>+${scenarioResult.total_estimated_gains.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: CELERY JOBS */}
          {activeTab === 'jobs' && (
            <div style={{ backgroundColor: '#0d1322', border: '1px solid #1e293b', padding: '18px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Celery Background Task Queue</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={loadJobs} disabled={jobsLoading} style={{ backgroundColor: '#1e293b', color: '#fff', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <RotateCw size={12} /> Refresh
                  </button>
                  <button onClick={handleEnqueueJob} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Play size={12} /> Enqueue Job
                  </button>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px' }}>Job ID</th>
                    <th style={{ padding: '8px' }}>Task</th>
                    <th style={{ padding: '8px' }}>Status</th>
                    <th style={{ padding: '8px' }}>Progress</th>
                    <th style={{ padding: '8px' }}>Worker</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.job_id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#38bdf8' }}>{job.job_id}</td>
                      <td style={{ padding: '10px 8px', fontWeight: 600 }}>{job.task_name}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, backgroundColor: job.status === 'SUCCESS' ? '#064e3b' : '#1e3a8a', color: job.status === 'SUCCESS' ? '#10b981' : '#60a5fa' }}>
                          {job.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px' }}>{job.progress_percent}%</td>
                      <td style={{ padding: '10px 8px', color: '#64748b', fontSize: '11px' }}>{job.worker_node}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {/* AI Assistant Right Panel with Fixed, Always-Visible Input */}
        {chatOpen && (
          <aside style={{ width: '420px', backgroundColor: '#0a0f1d', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0d1322', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={17} color="#38bdf8" />
                <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0 }}>AI Research Assistant</h3>
              </div>
              <span style={{ fontSize: '10px', background: '#064e3b', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                MCP Connected
              </span>
            </div>

            {/* Scrollable Conversation Feed */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '95%' }}>
                  {/* MCP Tool Call Trace */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div style={{ marginBottom: '6px', padding: '6px 10px', backgroundColor: '#020617', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Terminal size={11} /> MCP Tool Invocations ({msg.tool_calls.length})
                      </div>
                      {msg.tool_calls.map((tc, t_i) => (
                        <div key={t_i} style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', fontFamily: 'monospace' }}>
                          ⚡ <span style={{ color: '#f1f5f9' }}>{tc.tool_name}</span> ({tc.execution_time_ms}ms)
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    style={{
                      backgroundColor: msg.role === 'user' ? '#2563eb' : '#111827',
                      color: '#f8fafc',
                      padding: '12px 15px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                      border: msg.role === 'assistant' ? '1px solid #1e293b' : 'none',
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Grounded Source Attributions */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', background: '#020617', padding: '8px 10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <div style={{ fontWeight: 700, marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '5px', color: '#38bdf8' }}>
                        <ShieldCheck size={12} /> Traceable Sources:
                      </div>
                      {msg.sources.map((s, i) => (
                        <div key={i}>• {s.title} ({s.source_name})</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#38bdf8', fontStyle: 'italic', padding: '6px 0' }}>
                  <Sparkles size={14} className="animate-spin" /> Synthesizing financial research & tool outputs...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Pinned Bottom Input Form with Voice Search */}
            <form onSubmit={handleSendMessage} style={{ padding: '12px 16px', borderTop: '1px solid #1e293b', backgroundColor: '#0d1322', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? 'Stop listening' : 'Start voice searching'}
                style={{
                  backgroundColor: isListening ? '#dc2626' : '#1e293b',
                  color: isListening ? '#ffffff' : '#94a3b8',
                  border: isListening ? '1px solid #ef4444' : '1px solid #334155',
                  padding: '9px 11px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none',
                }}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                placeholder={isListening ? '🎙️ Listening... speak now' : 'Ask about valuation, technicals, or concepts...'}
                style={{
                  flex: 1,
                  backgroundColor: isListening ? '#1a1016' : '#111827',
                  border: isListening ? '1px solid #ef4444' : '1px solid #334155',
                  color: '#fff',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              <button
                type="submit"
                disabled={chatLoading || !inputMsg.trim()}
                style={{
                  backgroundColor: inputMsg.trim() ? '#2563eb' : '#1e293b',
                  color: inputMsg.trim() ? '#fff' : '#64748b',
                  border: 'none',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  cursor: inputMsg.trim() ? 'pointer' : 'default',
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
