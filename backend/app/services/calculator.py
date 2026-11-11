from datetime import datetime, timezone
from typing import List, Dict
import pandas as pd
import numpy as np
from app.schemas.analysis import (
    StockComparisonRequest,
    StockComparisonResponse,
    PerformanceSummary,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
    YearProjection,
)
from app.services.market_data import get_market_data_provider


class FinancialCalculatorService:
    @classmethod
    async def compare_stocks(cls, request: StockComparisonRequest) -> StockComparisonResponse:
        provider = get_market_data_provider()
        symbols = [s.upper().strip() for s in request.symbols]
        
        histories = {}
        for sym in symbols:
            data = await provider.get_history(sym, period=request.period, interval="1d")
            if data.bars:
                df = pd.DataFrame([
                    {"date": b.timestamp.strftime("%Y-%m-%d"), "close": b.close}
                    for b in data.bars
                ])
                df.drop_duplicates(subset=["date"], inplace=True)
                df.set_index("date", inplace=True)
                histories[sym] = df["close"]

        if not histories:
            raise ValueError("No historical data available for the requested symbols.")

        combined_df = pd.DataFrame(histories).dropna()
        if combined_df.empty:
            raise ValueError("No overlapping dates found among the selected stocks.")

        dates = combined_df.index.tolist()
        summaries: List[PerformanceSummary] = []
        normalized: Dict[str, List[float]] = {}

        for sym in symbols:
            if sym not in combined_df.columns:
                continue

            series = combined_df[sym]
            start_val = float(series.iloc[0])
            end_val = float(series.iloc[-1])
            total_return = ((end_val - start_val) / start_val) * 100.0

            # 100-indexed normalized performance
            norm_series = ((series / start_val) * 100.0).round(2).tolist()
            normalized[sym] = norm_series

            # Daily returns
            daily_returns = series.pct_change().dropna()
            
            # Annualized volatility (assuming 252 trading days)
            annualized_vol = float(daily_returns.std() * np.sqrt(252) * 100.0)

            # Max Drawdown
            cumulative_max = series.cummax()
            drawdowns = (series - cumulative_max) / cumulative_max
            max_drawdown = float(drawdowns.min() * 100.0)

            # Sharpe Ratio (using 4% risk-free rate assumption)
            risk_free_rate = 0.04
            annualized_ret = (total_return / 100.0)
            sharpe = None
            if annualized_vol > 0:
                sharpe = round((annualized_ret - risk_free_rate) / (annualized_vol / 100.0), 2)

            summaries.append(
                PerformanceSummary(
                    symbol=sym,
                    starting_price=round(start_val, 2),
                    ending_price=round(end_val, 2),
                    total_return_percent=round(total_return, 2),
                    annualized_volatility_percent=round(annualized_vol, 2),
                    max_drawdown_percent=round(abs(max_drawdown), 2),
                    sharpe_ratio=sharpe,
                )
            )

        return StockComparisonResponse(
            period=request.period,
            data_source="yfinance / Historical Adjusted Close",
            retrieval_timestamp=datetime.now(timezone.utc),
            comparisons=summaries,
            normalized_series=normalized,
            dates=dates,
        )

    @classmethod
    def calculate_scenario(cls, req: WhatIfScenarioRequest) -> WhatIfScenarioResponse:
        rate = req.annual_growth_estimate_percent / 100.0
        monthly_rate = rate / 12.0
        months = req.time_horizon_years * 12

        balance = req.initial_investment
        total_contributed = req.initial_investment
        timeline: List[YearProjection] = []

        timeline.append(
            YearProjection(
                year=0,
                contributed_capital=round(total_contributed, 2),
                projected_balance=round(balance, 2),
                estimated_gains=0.0,
            )
        )

        for m in range(1, months + 1):
            balance = balance * (1 + monthly_rate) + req.monthly_contribution
            total_contributed += req.monthly_contribution

            if m % 12 == 0:
                year_num = m // 12
                gains = max(0.0, balance - total_contributed)
                timeline.append(
                    YearProjection(
                        year=year_num,
                        contributed_capital=round(total_contributed, 2),
                        projected_balance=round(balance, 2),
                        estimated_gains=round(gains, 2),
                    )
                )

        final_gains = max(0.0, balance - total_contributed)

        return WhatIfScenarioResponse(
            symbol=req.symbol.upper().strip(),
            assumptions={
                "initial_investment": req.initial_investment,
                "monthly_contribution": req.monthly_contribution,
                "annual_growth_rate": f"{req.annual_growth_estimate_percent}%",
                "horizon_years": req.time_horizon_years,
                "compounding_frequency": "Monthly",
            },
            timeline=timeline,
            final_contributed_capital=round(total_contributed, 2),
            final_projected_balance=round(balance, 2),
            total_estimated_gains=round(final_gains, 2),
        )
