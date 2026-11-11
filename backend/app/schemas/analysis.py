from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class StockComparisonRequest(BaseModel):
    symbols: List[str] = Field(..., min_length=2, max_length=5, description="2 to 5 stock symbols to compare")
    period: str = Field("1y", description="Time period: 3mo, 6mo, 1y, 2y, 5y")


class PerformanceSummary(BaseModel):
    symbol: str
    starting_price: float
    ending_price: float
    total_return_percent: float
    annualized_volatility_percent: float
    max_drawdown_percent: float
    sharpe_ratio: Optional[float] = None


class StockComparisonResponse(BaseModel):
    period: str
    data_source: str
    retrieval_timestamp: datetime
    comparisons: List[PerformanceSummary]
    normalized_series: Dict[str, List[float]]  # Percentage growth from day 0 (100-indexed)
    dates: List[str]
    disclaimer: str = (
        "Historical comparisons are retrospective and do not guarantee future performance. "
        "Calculations assume past dividend/split-adjusted close prices."
    )


class WhatIfScenarioRequest(BaseModel):
    symbol: str
    initial_investment: float = Field(..., gt=0, description="Initial monetary investment amount")
    monthly_contribution: float = Field(default=0.0, ge=0, description="Optional monthly addition")
    annual_growth_estimate_percent: float = Field(..., description="Estimated annual growth rate percentage")
    time_horizon_years: int = Field(..., ge=1, le=30, description="Simulation duration in years")
    reinvest_dividends: bool = Field(default=True, description="Whether to simulate dividend reinvestment")


class YearProjection(BaseModel):
    year: int
    contributed_capital: float
    projected_balance: float
    estimated_gains: float


class WhatIfScenarioResponse(BaseModel):
    symbol: str
    assumptions: Dict[str, Any]
    timeline: List[YearProjection]
    final_contributed_capital: float
    final_projected_balance: float
    total_estimated_gains: float
    disclaimer: str = (
        "HYPOTHETICAL SCENARIO PROJECTION ONLY. This is a mathematical simulation based on "
        "constant user-supplied growth rates. It does not reflect market volatility, inflation, "
        "taxes, or actual future performance."
    )
