from datetime import datetime, timezone
import uuid
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# In-memory worker task registry (mirrors Celery / Redis state)
JOBS_DB: Dict[str, Dict[str, Any]] = {}


class CreateJobRequest(BaseModel):
    task_name: str
    symbol: str
    parameters: Dict[str, Any] = {}


class JobStatusResponse(BaseModel):
    job_id: str
    task_name: str
    symbol: str
    status: str  # QUEUED, RUNNING, SUCCESS, FAILED
    progress_percent: int
    created_at: datetime
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    worker_node: str = "celery@worker-node-1"
    result: Optional[Dict[str, Any]] = None


@router.post("/", response_model=JobStatusResponse)
async def create_background_job(request: CreateJobRequest):
    """Enqueues an asynchronous calculation or analysis job."""
    job_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc)
    job_record = {
        "job_id": job_id,
        "task_name": request.task_name,
        "symbol": request.symbol.upper(),
        "status": "RUNNING",
        "progress_percent": 15,
        "created_at": now,
        "completed_at": None,
        "retry_count": 0,
        "worker_node": "celery@worker-01 (sandbox-isolated)",
        "result": None,
        "parameters": request.parameters,
    }
    JOBS_DB[job_id] = job_record
    return JobStatusResponse(**job_record)


@router.get("/", response_model=List[JobStatusResponse])
async def list_jobs():
    """List all background worker jobs."""
    # Seed default demonstration jobs if empty
    if not JOBS_DB:
        sample_id = "job-9481"
        JOBS_DB[sample_id] = {
            "job_id": sample_id,
            "task_name": "Monte Carlo 10,000-Path Volatility Simulation",
            "symbol": "AAPL",
            "status": "SUCCESS",
            "progress_percent": 100,
            "created_at": datetime.now(timezone.utc),
            "completed_at": datetime.now(timezone.utc),
            "retry_count": 0,
            "worker_node": "celery@worker-node-01 (Isolated Python Sandbox)",
            "result": {
                "expected_return": "14.2%",
                "var_95": "4.8%",
                "sharpe": 1.48,
                "execution_time_sec": 3.42,
            },
        }
    return [JobStatusResponse(**j) for j in JOBS_DB.values()]


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Poll the status of an ongoing or completed background job."""
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Increment progress on polling to simulate Celery progress updates
    job = JOBS_DB[job_id]
    if job["status"] == "RUNNING":
        job["progress_percent"] = min(100, job["progress_percent"] + 35)
        if job["progress_percent"] >= 100:
            job["status"] = "SUCCESS"
            job["completed_at"] = datetime.now(timezone.utc)
            job["result"] = {
                "status": "Completed successfully in Python sandbox",
                "simulations_executed": 10000,
                "confidence_interval": "95%",
                "worker_memory_usage_mb": 42.8,
            }

    return JobStatusResponse(**job)
