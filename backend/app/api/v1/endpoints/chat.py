from fastapi import APIRouter
from app.ai.harness import AIHarness, ChatRequest, ChatResponse

router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """Submit a conversational stock research inquiry."""
    return await AIHarness.process_query(request)
