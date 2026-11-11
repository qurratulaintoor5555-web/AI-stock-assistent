from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import yfinance as yf
from app.schemas.stock import (
    StockQuote,
    HistoricalBar,
    HistoricalDataResponse,
    StockSearchItem,
)


class BaseMarketDataProvider(ABC):
    @abstractmethod
    async def get_quote(self, symbol: str) -> StockQuote:
        pass

    @abstractmethod
    async def get_history(
        self, symbol: str, period: str = "1y", interval: str = "1d"
    ) -> HistoricalDataResponse:
        pass

    @abstractmethod
    async def search_symbols(self, query: str) -> List[StockSearchItem]:
        pass


class YFinanceProvider(BaseMarketDataProvider):
    """Market data provider backed by yfinance with complete source & timestamp attribution."""

    async def get_quote(self, symbol: str) -> StockQuote:
        symbol = symbol.upper().strip()
        ticker = yf.Ticker(symbol)
        info = ticker.info or {}

        price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
            or 0.0
        )
        previous_close = info.get("previousClose") or price
        change = price - previous_close
        change_percent = (change / previous_close * 100) if previous_close else 0.0

        return StockQuote(
            symbol=symbol,
            company_name=info.get("shortName") or info.get("longName") or symbol,
            price=round(float(price), 4),
            change=round(float(change), 4),
            change_percent=round(float(change_percent), 2),
            currency=info.get("currency", "USD"),
            exchange=info.get("exchange", "N/A"),
            volume=info.get("regularMarketVolume") or info.get("volume"),
            market_cap=info.get("marketCap"),
            pe_ratio=info.get("trailingPE"),
            fifty_two_week_high=info.get("fiftyTwoWeekHigh"),
            fifty_two_week_low=info.get("fiftyTwoWeekLow"),
            timestamp=datetime.now(timezone.utc),
            data_source="yfinance / Yahoo Finance",
            is_realtime=False,
        )

    async def get_history(
        self, symbol: str, period: str = "1y", interval: str = "1d"
    ) -> HistoricalDataResponse:
        symbol = symbol.upper().strip()
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period, interval=interval)

        bars: List[HistoricalBar] = []
        for index, row in df.iterrows():
            ts = index.to_pydatetime()
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            bars.append(
                HistoricalBar(
                    timestamp=ts,
                    open=round(float(row["Open"]), 4),
                    high=round(float(row["High"]), 4),
                    low=round(float(row["Low"]), 4),
                    close=round(float(row["Close"]), 4),
                    volume=int(row["Volume"]),
                )
            )

        currency = "USD"
        try:
            currency = ticker.info.get("currency", "USD")
        except Exception:
            pass

        return HistoricalDataResponse(
            symbol=symbol,
            currency=currency,
            timeframe=f"{period}_{interval}",
            data_source="yfinance / Yahoo Finance",
            bars=bars,
        )

    async def search_symbols(self, query: str) -> List[StockSearchItem]:
        # Simple symbol resolution
        query = query.upper().strip()
        try:
            ticker = yf.Ticker(query)
            info = ticker.info
            if info and "shortName" in info:
                return [
                    StockSearchItem(
                        symbol=query,
                        name=info.get("shortName", query),
                        exchange=info.get("exchange", "Unknown"),
                        asset_type="Equity",
                    )
                ]
        except Exception:
            pass

        return [
            StockSearchItem(symbol=query, name=query, exchange="Unknown", asset_type="Equity")
        ]


def get_market_data_provider() -> BaseMarketDataProvider:
    """Factory for selecting market data provider."""
    return YFinanceProvider()
