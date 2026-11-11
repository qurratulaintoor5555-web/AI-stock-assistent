from fastapi import APIRouter
from app.api.v1.endpoints import stocks, technicals, fundamentals, chat, analysis, jobs

api_router = APIRouter()

api_router.include_router(stocks.router, prefix="/stocks", tags=["Market Data"])
api_router.include_router(technicals.router, prefix="/technicals", tags=["Technical Analysis"])
api_router.include_router(fundamentals.router, prefix="/fundamentals", tags=["Fundamental Analysis"])
api_router.include_router(analysis.router, prefix="/analysis", tags=["Calculations & Scenarios"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Background Tasks & Celery"])
api_router.include_router(chat.router, prefix="/chat", tags=["AI Assistant"])
