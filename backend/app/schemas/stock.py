from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class StockSearchItem(BaseModel):
    symbol: str
    name: str
    exchange: Optional[str] = None
    asset_type: Optional[str] = "Equity"


class StockQuote(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    price: float
    change: float
    change_percent: float
    currency: str = "USD"
    exchange: Optional[str] = None
    volume: Optional[int] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    timestamp: datetime
    data_source: str
    is_realtime: bool = False


class HistoricalBar(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoricalDataResponse(BaseModel):
    symbol: str
    currency: str = "USD"
    timeframe: str
    data_source: str
    bars: List[HistoricalBar]


class TechnicalIndicatorRequest(BaseModel):
    symbol: str
    period: str = "1y"  # 1mo, 3mo, 6mo, 1y, 5y
    indicators: List[str] = Field(
        default=["SMA", "EMA", "RSI", "MACD", "BBANDS"],
        description="List of requested indicators"
    )


class IndicatorSeries(BaseModel):
    indicator: str
    parameters: Dict[str, Any]
    timestamps: List[datetime]
    values: Dict[str, List[Optional[float]]]


class TechnicalAnalysisResponse(BaseModel):
    symbol: str
    source: str
    retrieval_timestamp: datetime
    indicators: List[IndicatorSeries]
    summary_trend: Optional[str] = None
    disclaimer: str = (
        "Technical analysis is purely mathematical and descriptive. "
        "It does not constitute buy/sell advice or guarantees of future price movement."
    )
