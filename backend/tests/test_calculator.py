import pytest
from app.schemas.analysis import WhatIfScenarioRequest
from app.services.calculator import FinancialCalculatorService


def test_scenario_calculation_with_known_inputs():
    """Verify compound interest calculation:
    $10,000 initial, $0 monthly, 10% annual growth, 1 year.
    Formula: 10000 * (1 + 0.10/12)^12 ~= 11047.13
    """
    req = WhatIfScenarioRequest(
        symbol="AAPL",
        initial_investment=10000.0,
        monthly_contribution=0.0,
        annual_growth_estimate_percent=10.0,
        time_horizon_years=1,
    )

    res = FinancialCalculatorService.calculate_scenario(req)

    assert res.symbol == "AAPL"
    assert res.final_contributed_capital == 10000.0
    # Expected compound value: approx 11,047.13
    assert 11040.0 < res.final_projected_balance < 11050.0
    assert 1040.0 < res.total_estimated_gains < 1050.0
    assert len(res.timeline) == 2  # Year 0 and Year 1


def test_scenario_with_monthly_contributions():
    """Verify scenario with periodic monthly additions."""
    req = WhatIfScenarioRequest(
        symbol="MSFT",
        initial_investment=1000.0,
        monthly_contribution=100.0,
        annual_growth_estimate_percent=8.0,
        time_horizon_years=2,
    )

    res = FinancialCalculatorService.calculate_scenario(req)
    # Contributed capital: $1,000 + ($100 * 24) = $3,400
    assert res.final_contributed_capital == 3400.0
    assert res.final_projected_balance > 3400.0
    assert res.total_estimated_gains > 0.0
    assert len(res.timeline) == 3  # Year 0, Year 1, Year 2
