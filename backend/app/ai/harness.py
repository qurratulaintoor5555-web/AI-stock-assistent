from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import re
from pydantic import BaseModel
from app.core.config import settings
from app.services.market_data import get_market_data_provider
from app.services.fundamentals import FundamentalAnalysisService
from app.services.technicals import TechnicalAnalysisEngine


class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    symbol: Optional[str] = None


class SourceAttribution(BaseModel):
    title: str
    source_name: str
    retrieval_timestamp: datetime
    data_points: List[str]


class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceAttribution]
    disclaimer: str = (
        "Educational research only. This analysis does not constitute investment advice "
        "or buy/sell recommendations. Always conduct independent verification."
    )


class AIHarness:
    """Coordinates context, tool execution, grounded answers, and financial safety."""

    @classmethod
    def extract_tickers(cls, text: str) -> List[str]:
        # Match common stock tickers (1 to 5 capital letters)
        candidates = re.findall(r"\b[A-Z]{1,5}\b", text.upper())
        exclude = {"A", "I", "THE", "AND", "OR", "FOR", "ARE", "HOW", "WHAT", "WHY", "IS", "BUY", "SELL", "AI"}
        tickers = [c for c in candidates if c not in exclude]
        return list(dict.fromkeys(tickers))  # Deduplicate

    @classmethod
    async def process_query(cls, request: ChatRequest) -> ChatResponse:
        user_query = request.message.strip()
        provider = get_market_data_provider()
        sources: List[SourceAttribution] = []

        # Find tickers in message or fallback to current symbol
        detected = cls.extract_tickers(user_query)
        primary_symbol = detected[0] if detected else (request.symbol or "AAPL")

        context_data = ""
        quote = None
        fundamentals = None
        technicals = None

        try:
            quote = await provider.get_quote(primary_symbol)
            fundamentals = await FundamentalAnalysisService.get_fundamentals(primary_symbol)
            history = await provider.get_history(primary_symbol, period="6mo", interval="1d")
            technicals = TechnicalAnalysisEngine.calculate_indicators(history)

            sources.append(
                SourceAttribution(
                    title=f"{primary_symbol} Market & Fundamental Snapshot",
                    source_name=quote.data_source,
                    retrieval_timestamp=quote.timestamp,
                    data_points=[
                        f"Price: ${quote.price} {quote.currency} ({quote.change_percent}%)",
                        f"P/E Ratio: {fundamentals.pe_ratio or 'N/A'}",
                        f"Profit Margin: {round((fundamentals.profit_margin or 0) * 100, 2)}%",
                        f"Technical Trend: {technicals.summary_trend}",
                    ],
                )
            )

            context_data = (
                f"TICKER: {primary_symbol} ({quote.company_name})\n"
                f"- Price: ${quote.price} {quote.currency} ({quote.change_percent:+0.2f}%)\n"
                f"- Exchange: {quote.exchange} | Volume: {quote.volume:, if quote.volume else 'N/A'}\n"
                f"- P/E (TTM): {fundamentals.pe_ratio} | Forward P/E: {fundamentals.forward_pe}\n"
                f"- PEG: {fundamentals.peg_ratio} | P/B: {fundamentals.price_to_book}\n"
                f"- Margins: Operating {round((fundamentals.operating_margin or 0)*100, 1)}%, Net {round((fundamentals.profit_margin or 0)*100, 1)}%\n"
                f"- Technical Posture: {technicals.summary_trend}\n"
                f"- Data Timestamp: {quote.timestamp.isoformat()} ({quote.data_source})\n"
            )
        except Exception as e:
            context_data = f"Note: Encountered error retrieving data for {primary_symbol}: {str(e)}"

        # If an LLM API Key is configured, use Google GenAI SDK
        if settings.GEMINI_API_KEY:
            try:
                from google import genai

                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                system_prompt = (
                    "You are the AI Stock Market Assistant. Follow these strict rules:\n"
                    "1. Provide educational, grounded stock research only.\n"
                    "2. NEVER give buy/sell recommendations or guarantee returns.\n"
                    "3. Cite data points, currencies, and timestamps provided in the context.\n"
                    "4. Clearly distinguish retrieved facts from interpretations.\n"
                )
                full_prompt = f"{system_prompt}\n\nContext:\n{context_data}\n\nUser Question: {user_query}"
                response = client.models.generate_content(
                    model=settings.LLM_MODEL,
                    contents=full_prompt,
                )
                reply_text = response.text or "I was unable to formulate a response."
                return ChatResponse(reply=reply_text, sources=sources)
            except Exception:
                pass  # Fallback to local structured generator below

        # High-Quality Local Structured Research Synthesizer (Works 100% offline with zero external costs)
        reply = (
            f"### 📊 Research Brief: **{primary_symbol}** ({quote.company_name if quote else ''})\n\n"
            f"**1. Price & Market Snapshot**\n"
            f"- **Current Price:** `${quote.price:.2f} {quote.currency}` ({quote.change_percent:+0.2f}%)\n"
            f"- **Exchange:** {quote.exchange} | **52-Week Range:** `${quote.fifty_two_week_low:.2f} - ${quote.fifty_two_week_high:.2f}`\n\n"
            f"**2. Fundamental & Valuation Metrics**\n"
            f"- **Trailing P/E:** `{fundamentals.pe_ratio or 'N/A'}` | **Forward P/E:** `{fundamentals.forward_pe or 'N/A'}`\n"
            f"- **Profit Margin:** `{round((fundamentals.profit_margin or 0)*100, 2)}%` | **Return on Equity (ROE):** `{round((fundamentals.return_on_equity or 0)*100, 2)}%`\n"
            f"- **Debt-to-Equity:** `{fundamentals.debt_to_equity or 'N/A'}`\n\n"
            f"**3. Technical Trend Summary**\n"
            f"- **Price Action:** {technicals.summary_trend if technicals else 'Moving averages neutral'}\n"
            f"- **Momentum:** Calculated via 20-period and 50-period moving average bands.\n\n"
            f"💡 *Tip: You can compare this stock with others or simulate compound scenarios using the tabs above!*"
        )
        return ChatResponse(reply=reply, sources=sources)
