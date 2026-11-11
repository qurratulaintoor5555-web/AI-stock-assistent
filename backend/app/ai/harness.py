from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
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
    async def process_query(cls, request: ChatRequest) -> ChatResponse:
        user_query = request.message.strip()
        provider = get_market_data_provider()
        sources: List[SourceAttribution] = []

        # Simple symbol heuristic if not provided
        symbol = request.symbol
        if not symbol:
            tokens = user_query.replace("?", "").replace(",", "").split()
            for token in tokens:
                clean_token = token.upper()
                if clean_token in ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"]:
                    symbol = clean_token
                    break

        context_data = ""
        if symbol:
            try:
                quote = await provider.get_quote(symbol)
                fundamentals = await FundamentalAnalysisService.get_fundamentals(symbol)
                history = await provider.get_history(symbol, period="6mo", interval="1d")
                technicals = TechnicalAnalysisEngine.calculate_indicators(history)

                context_data = (
                    f"DATA FOR {symbol}:\n"
                    f"- Company: {quote.company_name} ({quote.exchange})\n"
                    f"- Current Price: {quote.price} {quote.currency} (Change: {quote.change_percent}%)\n"
                    f"- P/E Ratio: {fundamentals.pe_ratio}, Market Cap: {fundamentals.market_cap}\n"
                    f"- Profit Margin: {fundamentals.profit_margin}, ROE: {fundamentals.return_on_equity}\n"
                    f"- Technical Trend: {technicals.summary_trend}\n"
                    f"- Data Retrieval: {quote.timestamp.isoformat()} from {quote.data_source}\n"
                )

                sources.append(
                    SourceAttribution(
                        title=f"{symbol} Market & Fundamental Snapshot",
                        source_name=quote.data_source,
                        retrieval_timestamp=quote.timestamp,
                        data_points=[
                            f"Price: {quote.price} {quote.currency}",
                            f"P/E: {fundamentals.pe_ratio}",
                            f"Technical: {technicals.summary_trend}",
                        ],
                    )
                )
            except Exception as e:
                context_data = f"Note: Encountered error retrieving data for {symbol}: {str(e)}"

        # If Gemini API Key is configured, use Google GenAI SDK
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
            except Exception as ex:
                reply_text = (
                    f"Retrieved Market Data:\n{context_data}\n\n"
                    f"(AI reasoning note: Gemini API call failed with '{str(ex)}', returning grounded data snapshot directly)."
                )
                return ChatResponse(reply=reply_text, sources=sources)

        # Fallback when no LLM key is configured yet
        fallback_reply = (
            f"### Research Snapshot for {symbol or 'General Market'}\n\n"
            f"{context_data if context_data else 'Please specify a stock ticker (e.g., AAPL, NVDA, MSFT) to inspect quote, technicals, and fundamentals.'}\n\n"
            f"*(To activate natural language reasoning, configure `GEMINI_API_KEY` in your `.env` file per Constitution Principle 9)*"
        )
        return ChatResponse(reply=fallback_reply, sources=sources)
