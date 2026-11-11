from fastapi import APIRouter, HTTPException
from app.services.fundamentals import FundamentalAnalysisService, FundamentalMetrics

router = APIRouter()


@router.get("/{symbol}", response_model=FundamentalMetrics)
async def get_fundamentals(symbol: str):
    """Retrieve financial statements, ratios, margins, and valuation measures."""
    try:
        return await FundamentalAnalysisService.get_fundamentals(symbol)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to retrieve fundamentals: {str(e)}"
        )
