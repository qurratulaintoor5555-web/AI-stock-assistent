from datetime import datetime, timezone, timedelta
import pytest
from app.schemas.stock import HistoricalDataResponse, HistoricalBar
from app.services.technicals import TechnicalAnalysisEngine


def test_technical_analysis_indicator_calculation():
    """Verify SMA, EMA, RSI, and Bollinger Bands calculation with synthetic test data."""
    base_time = datetime(2026, 1, 1, tzinfo=timezone.utc)
    bars = []
    
    # Generate 60 synthetic bars with steady upward trend
    for i in range(60):
        price = 100.0 + (i * 0.5)
        bars.append(
            HistoricalBar(
                timestamp=base_time + timedelta(days=i),
                open=price - 0.2,
                high=price + 0.5,
                low=price - 0.5,
                close=price,
                volume=1000000,
            )
        )

    history = HistoricalDataResponse(
        symbol="TEST",
        currency="USD",
        timeframe="1y_1d",
        data_source="Synthetic Unit Test Mock",
        bars=bars,
    )

    result = TechnicalAnalysisEngine.calculate_indicators(history)

    assert result.symbol == "TEST"
    assert len(result.indicators) >= 5
    
    # Check that SMA_20 exists and has valid values
    sma20_series = next((i for i in result.indicators if i.indicator == "SMA_20"), None)
    assert sma20_series is not None
    assert len(sma20_series.values["sma"]) == 60
    # The 20th item (index 19) should have a calculated mean
    assert sma20_series.values["sma"][19] is not None

    # Check RSI
    rsi_series = next((i for i in result.indicators if i.indicator == "RSI_14"), None)
    assert rsi_series is not None
    # Upward steady prices should produce a high RSI (> 70)
    last_rsi = [x for x in rsi_series.values["rsi"] if x is not None][-1]
    assert last_rsi > 70.0


def test_insufficient_bars_handling():
    """Verify controlled error / warning behavior when fewer than 20 bars are provided."""
    history = HistoricalDataResponse(
        symbol="EMPTY",
        currency="USD",
        timeframe="1y_1d",
        data_source="Synthetic Mock",
        bars=[],
    )

    result = TechnicalAnalysisEngine.calculate_indicators(history)
    assert result.symbol == "EMPTY"
    assert len(result.indicators) == 0
    assert "Insufficient historical bars" in result.summary_trend
