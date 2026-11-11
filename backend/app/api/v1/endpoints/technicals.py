from fastapi import APIRouter, HTTPException, Query
from app.schemas.stock import TechnicalAnalysisResponse
from app.services.market_data import get_market_data_provider
from app.services.technicals import TechnicalAnalysisEngine

router = APIRouter()


@router.get("/{symbol}", response_model=TechnicalAnalysisResponse)
async def get_technical_analysis(
    symbol: str,
    period: str = Query("1y", description="History period to compute indicators from: 3mo, 6mo, 1y"),
):
    """Calculate moving averages, RSI, MACD, and Bollinger Bands using Python."""
    try:
        provider = get_market_data_provider()
        history = await provider.get_history(symbol, period=period, interval="1d")
        return TechnicalAnalysisEngine.calculate_indicators(history)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to calculate technicals: {str(e)}"
        )
