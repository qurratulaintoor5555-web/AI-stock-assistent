from datetime import datetime, timezone
from typing import Dict, Any, Optional
import yfinance as yf
from pydantic import BaseModel


class FundamentalMetrics(BaseModel):
    symbol: str
    company_name: str
    sector: Optional[str] = "N/A"
    industry: Optional[str] = "N/A"
    currency: str = "USD"
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    peg_ratio: Optional[float] = None
    price_to_book: Optional[float] = None
    dividend_yield: Optional[float] = None
    profit_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    return_on_equity: Optional[float] = None
    debt_to_equity: Optional[float] = None
    revenue: Optional[float] = None
    free_cash_flow: Optional[float] = None
    shares_outstanding: Optional[float] = None
    retrieval_timestamp: datetime
    data_source: str
    fiscal_year_end: Optional[str] = None


class FundamentalAnalysisService:
    @staticmethod
    async def get_fundamentals(symbol: str) -> FundamentalMetrics:
        symbol = symbol.upper().strip()
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}

        return FundamentalMetrics(
            symbol=symbol,
            company_name=info.get("shortName") or info.get("longName") or symbol,
            sector=info.get("sector"),
            industry=info.get("industry"),
            currency=info.get("currency", "USD"),
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            forward_pe=info.get("forwardPE"),
            peg_ratio=info.get("pegRatio"),
            price_to_book=info.get("priceToBook"),
            dividend_yield=info.get("dividendYield"),
            profit_margin=info.get("profitMargins"),
            operating_margin=info.get("operatingMargins"),
            return_on_equity=info.get("returnOnEquity"),
            debt_to_equity=info.get("debtToEquity"),
            revenue=info.get("totalRevenue"),
            free_cash_flow=info.get("freeCashflow"),
            shares_outstanding=info.get("sharesOutstanding"),
            retrieval_timestamp=datetime.now(timezone.utc),
            data_source="yfinance / SEC Filings normalized by Yahoo Finance",
            fiscal_year_end=str(info.get("lastFiscalYearEnd", "N/A")),
        )
