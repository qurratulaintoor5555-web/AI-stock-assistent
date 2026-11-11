# AI Stock Market Assistant

An executive, AI-powered stock market research assistant combining real-time/historical market data, company intelligence, technical indicators, fundamental analysis, Python-powered financial calculations, what-if compound scenarios, background Celery task processing, and source-grounded conversational explanations.

> **Legal & Regulatory Disclaimer:** This application is strictly an informational research and educational tool. It is **not** a broker, exchange, portfolio custodian, or autonomous trading system. It does not place trades or present hypothetical projections as guaranteed investment outcomes.

---

## 1. Project Overview & Core Capabilities

The application implements all 5 core requirements specified in the project brief and ratified constitution:

| Capability | Implementation Details |
| :--- | :--- |
| **1. Technical Analysis Studio** | Interactive TradingView candlestick charts, volume histograms, timeframe selectors (`1mo`, `3mo`, `6mo`, `1y`), Simple Moving Averages (SMA 20 & 50), Exponential Moving Averages (EMA 12 & 26), 14-day Wilder RSI, and MACD (12, 26, 9) with trend summaries. |
| **2. Fundamental Analysis** | Valuation and financial health cards including Trailing P/E, Forward P/E, PEG, Price-to-Book, Net Profit Margins, Operating Margins, Return on Equity (ROE), Debt-to-Equity, Total Revenue, and Free Cash Flow. |
| **3. Python Calculations & Scenarios** | Multi-stock risk/return matrix (Total Returns %, Annualized Volatility $\sigma \times \sqrt{252}$, Maximum Drawdown %, Sharpe Ratio) plus an interactive **What-If Scenario Simulator** calculating compound growth with periodic monthly contributions. |
| **4. AI Harness & MCP Tool Calling** | Context-aware AI research drawer that performs entity/ticker extraction and visibly renders **MCP Tool-Calling Traces** (`tool_name`, parameters, latency in ms, status) and traceable data sources with retrieval timestamps. |
| **5. Celery Background Queue** | Asynchronous job management (`/api/v1/jobs`) showing Task IDs, execution status (`QUEUED`, `RUNNING`, `SUCCESS`), progress bars, worker nodes, and an interactive **"Enqueue New Simulation"** control. |

---

## 2. Technical Architecture

```text
[ React + TypeScript Frontend (Port 5173) ]
  ├── TradingView Lightweight Charts (Candlesticks & Volume)
  ├── 4 Executive Tabs: Technicals, Fundamentals, Scenarios, Celery Queue
  └── AI Assistant Drawer with Live MCP Tool-Calling Provenance
                           │
                           │ REST / JSON (CORS Enabled)
                           ▼
[ FastAPI Backend API (Port 8000) ]
  ├── /api/v1/stocks        -> Quotes, OHLCV history, and symbol search
  ├── /api/v1/technicals    -> SMA, EMA, RSI, MACD, Bollinger Bands
  ├── /api/v1/fundamentals  -> Income statement, balance sheet, cash flows
  ├── /api/v1/analysis      -> Multi-stock comparisons & compound scenarios
  ├── /api/v1/jobs          -> Asynchronous background jobs & Celery task status
  └── /api/v1/chat          -> AI harness, MCP tool execution & grounded citations
                           │
                           ├──► Python Calculation Engine (NumPy, Pandas, SciPy)
                           ├──► In-Memory TTL Cache & Resilient Offline Fallback
                           └──► Isolated Execution Sandbox Boundary
```

---

## 3. Repository Structure

```text
AI Stock Market Assistant/
├── backend/
│   ├── app/
│   │   ├── ai/
│   │   │   └── harness.py            # AI context management & MCP tool calling traces
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── analysis.py    # Multi-stock comparisons & what-if scenarios
│   │   │       │   ├── chat.py        # Conversational research assistant
│   │   │       │   ├── fundamentals.py# Company metrics & financial statements
│   │   │       │   ├── jobs.py        # Celery background job queue endpoints
│   │   │       │   ├── stocks.py      # Real-time quotes and historical OHLCV data
│   │   │       │   └── technicals.py  # SMA, RSI, MACD, and Bollinger Bands
│   │   │       └── router.py          # Central v1 API router
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic Settings & environment variables
│   │   │   └── database.py            # Async SQLAlchemy engine & session factory
│   │   ├── schemas/
│   │   │   ├── analysis.py            # Comparison & scenario Pydantic models
│   │   │   └── stock.py               # Quote, bar, and technical indicator schemas
│   │   ├── services/
│   │   │   ├── calculator.py          # Financial formulas, Sharpe ratio, and drawdowns
│   │   │   ├── fundamentals.py        # Fundamental metrics retrieval & normalization
│   │   │   ├── market_data.py         # Market data provider adapter with caching
│   │   │   └── technicals.py          # Pandas/NumPy technical indicators engine
│   │   └── main.py                    # FastAPI application entrypoint & middleware
│   ├── tests/
│   │   ├── test_calculator.py         # Unit tests for financial scenarios & Sharpe ratio
│   │   └── test_technicals.py         # Unit tests for SMA, RSI, and Bollinger Bands
│   └── conftest.py                    # Pytest environment & PYTHONPATH setup
├── frontend/
│   └── stock-assistant-ui/
│       ├── src/
│       │   ├── App.tsx                # Complete executive dashboard & tabs
│       │   ├── main.tsx               # React entrypoint
│       │   └── index.css              # Global styles
│       ├── package.json               # Vite, React, lightweight-charts, Lucide icons
│       └── tsconfig.json              # Strict TypeScript configuration
├── docs/                              # Architecture and design documentation
├── docker-compose.yml                 # Local SQL Server and Redis container configuration
├── requirements.txt                   # Backend Python dependencies
├── .env.example                       # Environment configuration template
├── start-dev.ps1                      # One-click launcher for backend + frontend
└── README.md                          # Comprehensive project documentation
```

---

## 4. Quick Start Guide

### Prerequisites
- **Python 3.11+** (accessible via `python` or `py`)
- **Node.js 18+** & `npm`
- **Git**

### One-Click Development Launch (Windows)

From the project root directory, run:
```powershell
.\start-dev.ps1
```
*This starts the FastAPI backend on `http://localhost:8000`, launches the React Vite frontend on `http://localhost:5173`, and automatically opens your web browser.*

---

### Manual Launch Instructions

#### 1. Backend (FastAPI)
```powershell
cd "AI Stock Market Assistant"
$env:PYTHONPATH="backend"
py -m uvicorn app.main:app --app-dir backend --port 8000 --reload
```
- **Live API Endpoint:** `http://localhost:8000`
- **Interactive Swagger Documentation:** `http://localhost:8000/api/v1/docs`
- **Health Check:** `http://localhost:8000/health`

#### 2. Frontend (React + TypeScript)
```powershell
cd "AI Stock Market Assistant\frontend\stock-assistant-ui"
npm install
npm run dev
```
- **Dashboard URL:** `http://localhost:5173`

---

## 5. API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and version |
| `GET` | `/api/v1/stocks/quote/{symbol}` | Current price, volume, changes, currency, and source |
| `GET` | `/api/v1/stocks/history/{symbol}` | Historical OHLCV candlestick bars |
| `GET` | `/api/v1/stocks/search?q={query}` | Search supported tickers |
| `GET` | `/api/v1/technicals/{symbol}` | Python-computed SMA 20/50, RSI 14, MACD, Bollinger Bands |
| `GET` | `/api/v1/fundamentals/{symbol}` | Financial ratios, margins, debt, revenue, and cash flow |
| `POST` | `/api/v1/analysis/compare` | Multi-stock return %, annualized volatility, and Sharpe ratio |
| `POST` | `/api/v1/analysis/scenario` | What-if compound growth simulation with monthly contributions |
| `GET` | `/api/v1/jobs/` | List background worker jobs and status |
| `POST` | `/api/v1/jobs/` | Enqueue a new background calculation job |
| `GET` | `/api/v1/jobs/{job_id}` | Poll background job progress and results |
| `POST` | `/api/v1/chat/` | Conversational research with MCP tool call traces & citations |

---

## 6. Testing & Quality Gates

The test suite validates financial calculations and technical formulas with deterministic inputs:

```powershell
$env:PYTHONPATH="backend"
py -m pytest backend/tests
```

**Test Coverage:**
- `test_calculator.py`: Verifies compound interest calculations with known numerical benchmarks.
- `test_technicals.py`: Verifies SMA, RSI, and Bollinger Band calculations on synthetic price data.
- **Frontend Type Check:** `npm run build` passes with zero errors and zero warnings.

---

## 7. Version History & Governance

- **v1.0.0 (2026-11-11):** Initial complete vertical slice including React dashboard, FastAPI backend, technical indicators, fundamental statements, what-if scenarios, Celery job queue monitor, and MCP tool-calling conversational assistant.
