# AI Stock Market Assistant

An AI-powered stock market research assistant combining market data, company intelligence, technical analysis, fundamental analysis, Python-powered financial calculations, conversational explanations, interactive charts, and traceable reports.

> **Disclaimer:** This product is an informational research and educational tool. It is **not** a broker, exchange, portfolio custodian, or autonomous trading system. It does not place trades or present projections as guaranteed outcomes.

---

## 1. Architecture Overview

The system follows a modular, layered architecture adhering to the project constitution:

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, TradingView Lightweight Charts.
- **Main Backend:** ASP.NET Core Web API (C#) adhering to Clean Architecture principles (Domain, Application, Infrastructure, API).
- **Database:** Microsoft SQL Server with Entity Framework Core (Code First & Migrations).
- **Python Analysis Engine & Sandbox:** Python microservice (Pandas, NumPy, SciPy) for financial calculations, scenario modeling, and indicator processing.
- **Background Processing:** Celery workers with Redis for asynchronous calculation jobs, retries, and observable job state.
- **AI Harness & MCP:** Model abstraction layer coordinating context, tool permissions, and Model Context Protocol (MCP) tool adapters with full source attribution.

---

## 2. Repository Structure

```text
AI-Stock-Market-Assistant/
├── frontend/
│   └── stock-assistant-ui/         # React + TypeScript Vite frontend
├── backend/
│   └── StockAssistant.sln          # ASP.NET Core Clean Architecture Solution
│       ├── StockAssistant.API/            # Presentation & Controllers
│       ├── StockAssistant.Application/    # Use cases, interfaces, DTOs
│       ├── StockAssistant.Domain/         # Core entities, value objects
│       ├── StockAssistant.Infrastructure/ # EF Core, external adapters
│       └── StockAssistant.Tests/          # Unit & integration tests
├── python-services/
│   ├── analysis-engine/            # FastAPI calculation service
│   ├── mcp-server/                 # MCP tool implementations
│   ├── sandbox/                    # Restricted execution environment
│   └── workers/                    # Celery task definitions
├── docs/
│   ├── architecture/               # AWS-style architecture diagrams & specs
│   ├── database/                   # ERDs and migration notes
│   └── miro/                       # Miro board wireframes and flows
├── specs/                          # Specification files per feature
├── .env.example                    # Template environment variables
├── requirements.txt                # Python analysis & worker dependencies
├── docker-compose.yml              # Local database (SQL Server) & Redis orchestration
└── README.md                       # Main documentation
```

---

## 3. Prerequisites

Ensure you have the following installed on your machine:
- [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) or later
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/) & `npm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local SQL Server & Redis)
- [Git](https://git-scm.com/)

---

## 4. Getting Started

### Step 1: Clone and Configure Environment

```bash
git clone <repository-url>
cd "AI Stock Market Assistant"
cp .env.example .env
```
*Edit `.env` with your provider API keys and database credentials.*

### Step 2: Start Local Infrastructure (SQL Server & Redis)

```bash
docker compose up -d sqlserver redis
```

### Step 3: Setup and Run the Python Analysis Engine

```bash
cd python-services
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r ../requirements.txt

# Start the Analysis FastAPI service:
uvicorn analysis-engine.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4: Setup and Run Backend (ASP.NET Core)

```bash
cd ../backend
dotnet restore
dotnet ef database update --project StockAssistant.Infrastructure --startup-project StockAssistant.API
dotnet run --project StockAssistant.API
```
*Backend Swagger UI will be available at `https://localhost:7001/swagger`.*

### Step 5: Setup and Run Frontend (React)

```bash
cd ../frontend/stock-assistant-ui
npm install
npm run dev
```
*Frontend will be running at `http://localhost:5173`.*

---

## 5. Development Principles & Quality Gates

Per the project constitution:
1. **User-Controlled, Spec-Driven Development:** Every substantial feature follows `Clarify -> Spec -> Plan -> Task -> Implement -> Test -> Review`.
2. **Explainable and Source-Grounded:** All market answers identify the source, timestamps, currency, exchange, and data freshness.
3. **Financial Safety:** Purely informational; no trade execution, no fabricated financial facts, explicit uncertainty framing.
4. **Isolated Python Sandbox:** Code analysis is bounded by resource limits, timeouts, and no unrestricted host access.
5. **Testing:** All financial calculations require deterministic unit tests with known inputs and expected outputs.
