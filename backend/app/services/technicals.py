from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from app.schemas.stock import (
    HistoricalDataResponse,
    TechnicalAnalysisResponse,
    IndicatorSeries,
)


class TechnicalAnalysisEngine:
    @staticmethod
    def calculate_indicators(history: HistoricalDataResponse) -> TechnicalAnalysisResponse:
        if not history.bars or len(history.bars) < 20:
            return TechnicalAnalysisResponse(
                symbol=history.symbol,
                source=history.data_source,
                retrieval_timestamp=datetime.now(timezone.utc),
                indicators=[],
                summary_trend="Insufficient historical bars for indicator calculation (minimum 20 required).",
            )

        # Convert bars into DataFrame
        records = [
            {"timestamp": bar.timestamp, "close": bar.close, "volume": bar.volume}
            for bar in history.bars
        ]
        df = pd.DataFrame(records)
        df.sort_values("timestamp", inplace=True)
        timestamps = df["timestamp"].tolist()
        close = df["close"]

        indicator_list: List[IndicatorSeries] = []

        # 1. Simple Moving Averages (SMA 20, SMA 50)
        sma20 = close.rolling(window=20).mean().replace({np.nan: None}).tolist()
        indicator_list.append(
            IndicatorSeries(
                indicator="SMA_20",
                parameters={"window": 20, "formula": "arithmetic mean of past 20 closes"},
                timestamps=timestamps,
                values={"sma": sma20},
            )
        )

        if len(close) >= 50:
            sma50 = close.rolling(window=50).mean().replace({np.nan: None}).tolist()
            indicator_list.append(
                IndicatorSeries(
                    indicator="SMA_50",
                    parameters={"window": 50, "formula": "arithmetic mean of past 50 closes"},
                    timestamps=timestamps,
                    values={"sma": sma50},
                )
            )

        # 2. Exponential Moving Averages (EMA 12, EMA 26)
        ema12 = close.ewm(span=12, adjust=False).mean().replace({np.nan: None}).tolist()
        ema26 = close.ewm(span=26, adjust=False).mean().replace({np.nan: None}).tolist()
        indicator_list.append(
            IndicatorSeries(
                indicator="EMA_12_26",
                parameters={"fast_span": 12, "slow_span": 26},
                timestamps=timestamps,
                values={"ema_12": ema12, "ema_26": ema26},
            )
        )

        # 3. RSI (Relative Strength Index - 14)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = (100 - (100 / (1 + rs))).replace({np.nan: None}).tolist()

        indicator_list.append(
            IndicatorSeries(
                indicator="RSI_14",
                parameters={"window": 14, "formula": "100 - (100 / (1 + RS))"},
                timestamps=timestamps,
                values={"rsi": rsi},
            )
        )

        # 4. MACD (12, 26, 9)
        ema_fast = close.ewm(span=12, adjust=False).mean()
        ema_slow = close.ewm(span=26, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line

        indicator_list.append(
            IndicatorSeries(
                indicator="MACD",
                parameters={"fast": 12, "slow": 26, "signal": 9},
                timestamps=timestamps,
                values={
                    "macd": macd_line.replace({np.nan: None}).tolist(),
                    "signal": signal_line.replace({np.nan: None}).tolist(),
                    "histogram": histogram.replace({np.nan: None}).tolist(),
                },
            )
        )

        # 5. Bollinger Bands (20, 2 std)
        rolling_mean = close.rolling(window=20).mean()
        rolling_std = close.rolling(window=20).std()
        upper_band = (rolling_mean + (rolling_std * 2)).replace({np.nan: None}).tolist()
        lower_band = (rolling_mean - (rolling_std * 2)).replace({np.nan: None}).tolist()

        indicator_list.append(
            IndicatorSeries(
                indicator="BOLLINGER_BANDS_20_2",
                parameters={"window": 20, "num_std": 2},
                timestamps=timestamps,
                values={
                    "middle": rolling_mean.replace({np.nan: None}).tolist(),
                    "upper": upper_band,
                    "lower": lower_band,
                },
            )
        )

        # Descriptive trend summary (purely factual description, not advice)
        last_close = close.iloc[-1]
        last_sma20 = [x for x in sma20 if x is not None]
        summary = "Neutral"
        if last_sma20:
            if last_close > last_sma20[-1]:
                summary = "Trading above 20-period moving average"
            else:
                summary = "Trading below 20-period moving average"

        return TechnicalAnalysisResponse(
            symbol=history.symbol,
            source=f"{history.data_source} (Computed via Pandas/NumPy)",
            retrieval_timestamp=datetime.now(timezone.utc),
            indicators=indicator_list,
            summary_trend=summary,
        )
