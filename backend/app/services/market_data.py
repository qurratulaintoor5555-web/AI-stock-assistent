from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta
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
    """Market data provider backed by yfinance with in-memory caching and offline fallback."""

    # Simple TTL in-memory cache to respect rate-limits
    _quote_cache: Dict[str, Any] = {}
    _history_cache: Dict[str, Any] = {}

    def _generate_fallback_quote(self, symbol: str) -> StockQuote:
        prices = {
            "AAPL": (224.50, 1.85, 0.83, 3400000000000, 34.2),
            "MSFT": (428.20, -2.10, -0.49, 3180000000000, 36.1),
            "NVDA": (142.10, 4.30, 3.12, 3500000000000, 52.4),
            "GOOGL": (178.60, 0.90, 0.51, 2200000000000, 24.8),
            "TSLA": (245.30, -5.20, -2.08, 780000000000, 68.5),
        }
        price, change, pct, mcap, pe = prices.get(symbol, (150.0, 1.0, 0.67, 100000000000, 20.0))
        return StockQuote(
            symbol=symbol,
            company_name=f"{symbol} Inc. (Simulated/Fallback)",
            price=price,
            change=change,
            change_percent=pct,
            currency="USD",
            exchange="NASDAQ",
            volume=45000000,
            market_cap=mcap,
            pe_ratio=pe,
            fifty_two_week_high=price * 1.15,
            fifty_two_week_low=price * 0.85,
            timestamp=datetime.now(timezone.utc),
            data_source="Fallback Market Data Engine (Offline/Rate-limit Resilience)",
            is_realtime=False,
        )

    def _generate_fallback_history(self, symbol: str, days: int = 120) -> List[HistoricalBar]:
        bars = []
        base_price = 150.0
        if symbol == "AAPL": base_price = 210.0
        elif symbol == "MSFT": base_price = 410.0
        elif symbol == "NVDA": base_price = 120.0
        
        now = datetime.now(timezone.utc)
        curr = base_price
        for i in range(days, 0, -1):
            date = now - timedelta(days=i)
            # pseudo-random deterministic walk
            drift = ((i % 5) - 2) * 0.8
            curr = max(10.0, curr + drift)
            bars.append(
                HistoricalBar(
                    timestamp=date,
                    open=round(curr - 0.4, 2),
                    high=round(curr + 1.2, 2),
                    low=round(curr - 0.9, 2),
                    close=round(curr, 2),
                    volume=30000000 + (i * 100000),
                )
            )
        return bars

    async def get_quote(self, symbol: str) -> StockQuote:
        symbol = symbol.upper().strip()
        now = datetime.now(timezone.utc)

        # Check cache (15 seconds TTL)
        if symbol in self._quote_cache:
            entry, cached_at = self._quote_cache[symbol]
            if (now - cached_at).total_seconds() < 15:
                return entry

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}

            price = (
                info.get("currentPrice")
                or info.get("regularMarketPrice")
                or info.get("previousClose")
            )
            if not price:
                raise ValueError(f"No price returned for ticker {symbol}")

            previous_close = info.get("previousClose") or price
            change = price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else 0.0

            quote = StockQuote(
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
                timestamp=now,
                data_source="yfinance / Yahoo Finance",
                is_realtime=False,
            )
            self._quote_cache[symbol] = (quote, now)
            return quote
        except Exception:
            # Resilient fallback if yfinance is rate-limited or offline
            fallback = self._generate_fallback_quote(symbol)
            return fallback

    async def get_history(
        self, symbol: str, period: str = "1y", interval: str = "1d"
    ) -> HistoricalDataResponse:
        symbol = symbol.upper().strip()
        cache_key = f"{symbol}_{period}_{interval}"
        now = datetime.now(timezone.utc)

        if cache_key in self._history_cache:
            entry, cached_at = self._history_cache[cache_key]
            if (now - cached_at).total_seconds() < 60:
                return entry

        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                raise ValueError("No historical rows returned")

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

            resp = HistoricalDataResponse(
                symbol=symbol,
                currency=currency,
                timeframe=f"{period}_{interval}",
                data_source="yfinance / Yahoo Finance",
                bars=bars,
            )
            self._history_cache[cache_key] = (resp, now)
            return resp
        except Exception:
            # Gracefully provide synthetic historical bars if offline or throttled
            fallback_bars = self._generate_fallback_history(symbol)
            return HistoricalDataResponse(
                symbol=symbol,
                currency="USD",
                timeframe=f"{period}_{interval}",
                data_source="Fallback Market Data Engine (Offline/Rate-limit Resilience)",
                bars=fallback_bars,
            )

    async def search_symbols(self, query: str) -> List[StockSearchItem]:
        query = query.upper().strip()
        popular = {
            "AAPL": "Apple Inc.",
            "MSFT": "Microsoft Corporation",
            "NVDA": "NVIDIA Corporation",
            "GOOGL": "Alphabet Inc.",
            "AMZN": "Amazon.com Inc.",
            "META": "Meta Platforms Inc.",
            "TSLA": "Tesla Inc.",
        }
        if query in popular:
            return [StockSearchItem(symbol=query, name=popular[query], exchange="NASDAQ", asset_type="Equity")]

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

        return [StockSearchItem(symbol=query, name=query, exchange="Unknown", asset_type="Equity")]


def get_market_data_provider() -> BaseMarketDataProvider:
    return YFinanceProvider()
