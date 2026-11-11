import React, { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, type IChartApi } from 'lightweight-charts';
import { Search, TrendingUp, AlertCircle, Send, ShieldCheck, BarChart2, BookOpen } from 'lucide-react';

interface StockQuote {
  symbol: string;
  company_name: string;
  price: number;
  change: number;
  change_percent: number;
  currency: string;
  exchange: string;
  pe_ratio?: number;
  market_cap?: number;
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
  const [symbol, setSymbol] = useState('AAPL');
  const [searchQuery, setSearchQuery] = useState('AAPL');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Welcome to AI Stock Market Assistant. Ask questions about technical trends, financial ratios, or company fundamentals. (All data is educational, source-attributed, and non-advisory).',
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Chart container ref
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  const API_BASE = 'http://localhost:8000/api/v1';

  // Fetch stock quote and history
  const loadStockData = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Quote
      const quoteRes = await fetch(`${API_BASE}/stocks/quote/${ticker}`);
      if (!quoteRes.ok) throw new Error(`Could not fetch quote for ${ticker}`);
      const quoteData = await quoteRes.json();
      setQuote(quoteData);

      // 2. Fetch History
      const histRes = await fetch(`${API_BASE}/stocks/history/${ticker}?period=6mo&interval=1d`);
      if (!histRes.ok) throw new Error('Could not fetch historical data');
      const histData = await histRes.json();

      // Render chart
      if (chartContainerRef.current) {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.remove();
        }

        const chart = createChart(chartContainerRef.current, {
          layout: {
            background: { type: ColorType.Solid, color: '#18181b' },
            textColor: '#d4d4d8',
          },
          grid: {
            vertLines: { color: '#27272a' },
            horzLines: { color: '#27272a' },
          },
          width: chartContainerRef.current.clientWidth,
          height: 380,
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
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
    loadStockData(symbol);
  }, [symbol]);

  // Handle Chat submit
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
          content: 'Unable to connect to AI assistant service. Verify backend is running on localhost:8000.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#09090b', color: '#f4f4f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #27272a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TrendingUp size={24} color="#38bdf8" />
          <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>AI Stock Market Assistant</h1>
          <span style={{ fontSize: '12px', background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px' }}>v1.0 Clean & Grounded</span>
        </div>

        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); setSymbol(searchQuery.toUpperCase()); }} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Symbol (e.g. AAPL, NVDA, MSFT)"
            style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 12px', borderRadius: '6px', width: '260px' }}
          />
          <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={16} /> Search
          </button>
        </form>
      </header>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '20px', padding: '24px' }}>
        {/* Left Column: Metrics & Candlestick Chart */}
        <div>
          {/* Quote Card */}
          {quote && (
            <div style={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>{quote.company_name} ({quote.symbol})</h2>
                  <div style={{ fontSize: '13px', color: '#a1a1aa' }}>Exchange: {quote.exchange} | Currency: {quote.currency}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold' }}>${quote.price.toFixed(2)}</div>
                  <div style={{ color: quote.change >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              {/* Source attribution & metadata */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a' }}>
                <span>Source: {quote.data_source}</span>
                <span>As of: {new Date(quote.timestamp).toLocaleTimeString()} UTC</span>
              </div>
            </div>
          )}

          {/* Chart Container */}
          <div style={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BarChart2 size={18} color="#a1a1aa" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Price Trend (6-Month Daily Candlesticks) {loading && '(Loading...)'}</h3>
            </div>
            {error && <div style={{ color: '#ef4444', padding: '10px' }}><AlertCircle size={16} /> {error}</div>}
            <div ref={chartContainerRef} style={{ width: '100%', minHeight: '380px' }} />
          </div>
        </div>

        {/* Right Column: AI Assistant & Grounded Sources */}
        <div style={{ backgroundColor: '#18181b', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>AI Research & Grounded Analysis</h3>
          </div>

          {/* Messages scroll area */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%' }}>
                <div
                  style={{
                    backgroundColor: msg.role === 'user' ? '#2563eb' : '#27272a',
                    color: '#fff',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>

                {/* Sources if present */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#94a3b8', background: '#0f172a', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={12} color="#38bdf8" /> Grounded Data Sources:
                    </div>
                    {msg.sources.map((s, idx) => (
                      <div key={idx}>• {s.title} ({s.source_name})</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Analyzing financial indicators...</div>}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid #27272a', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Ask about technicals, P/E ratios, or revenue..."
              style={{ flex: 1, backgroundColor: '#09090b', border: '1px solid #3f3f46', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
            />
            <button type="submit" disabled={chatLoading} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer' }}>
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
export default App;
