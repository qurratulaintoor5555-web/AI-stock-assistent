from typing import List
from fastapi import APIRouter, Query, HTTPException
from app.schemas.stock import StockQuote, HistoricalDataResponse, StockSearchItem
from app.services.market_data import get_market_data_provider

router = APIRouter()


@router.get("/quote/{symbol}", response_model=StockQuote)
async def get_stock_quote(symbol: str):
    """Retrieve real-time/delayed quote for a specific ticker with full source metadata."""
    try:
        provider = get_market_data_provider()
        return await provider.get_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to retrieve quote: {str(e)}")


@router.get("/history/{symbol}", response_model=HistoricalDataResponse)
async def get_stock_history(
    symbol: str,
    period: str = Query("1y", description="Data range: 1mo, 3mo, 6mo, 1y, 2y, 5y"),
    interval: str = Query("1d", description="Bar interval: 1d, 1wk, 1mo"),
):
    """Retrieve historical OHLCV candlestick data."""
    try:
        provider = get_market_data_provider()
        return await provider.get_history(symbol, period=period, interval=interval)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to retrieve history: {str(e)}"
        )


@router.get("/search", response_model=List[StockSearchItem])
async def search_stocks(q: str = Query(..., min_length=1)):
    """Search for supported tickers and companies."""
    provider = get_market_data_provider()
    return await provider.search_symbols(q)
