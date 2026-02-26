"""
Security Intelligence Platform — FastAPI Backend
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_pool, close_pool
from app.routes.analytics import router as analytics_router
from app.routes.ai_summary import router as ai_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection pool lifecycle."""
    init_pool()
    yield
    close_pool()


app = FastAPI(
    title="Security Intelligence Platform",
    description="KPI-driven security analytics API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "security-intel-api"}
