# -------------------------------------------------------------------
# Multi-stage Dockerfile for Back4app Container Platform
# Builds React UI and serves unified FastAPI application
# -------------------------------------------------------------------

# Stage 1: Build Frontend UI
FROM node:20-alpine AS frontend-builder
WORKDIR /build
COPY frontend/stock-assistant-ui/package*.json ./
RUN npm install
COPY frontend/stock-assistant-ui/ ./
RUN npm run build

# Stage 2: Runtime Python Backend
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend /app/backend

# Copy built frontend assets into static directory
COPY --from=frontend-builder /build/dist /app/static

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8080}"]
