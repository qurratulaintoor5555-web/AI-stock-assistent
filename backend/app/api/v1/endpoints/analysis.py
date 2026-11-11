from fastapi import APIRouter, HTTPException
from app.schemas.analysis import (
    StockComparisonRequest,
    StockComparisonResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
)
from app.services.calculator import FinancialCalculatorService

router = APIRouter()


@router.post("/compare", response_model=StockComparisonResponse)
async def compare_stocks(request: StockComparisonRequest):
    """Compare multiple stocks by returns, annualized volatility, and maximum drawdown."""
    try:
        return await FinancialCalculatorService.compare_stocks(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scenario", response_model=WhatIfScenarioResponse)
async def run_scenario_projection(request: WhatIfScenarioRequest):
    """Run hypothetical what-if investment scenarios with compound returns."""
    try:
        return FinancialCalculatorService.calculate_scenario(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
