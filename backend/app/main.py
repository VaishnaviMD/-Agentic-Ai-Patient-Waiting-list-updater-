from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from app.core.config import settings
from app.api.v1.auth import router as auth_router
from app.api.v1.doctors import router as doctors_router
from app.api.v1.appointments import router as appointments_router
from app.api.v1.waitlist import router as waitlist_router
from app.api.v1.offers import router as offers_router
from app.api.v1.agent_tools import router as agent_tools_router
from app.api.v1.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Agentic AI-powered administrative scheduling system and intelligent waitlist engine.",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(doctors_router, prefix=settings.API_V1_STR)
app.include_router(appointments_router, prefix=settings.API_V1_STR)
app.include_router(waitlist_router, prefix=settings.API_V1_STR)
app.include_router(offers_router, prefix=settings.API_V1_STR)
app.include_router(agent_tools_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
def read_root():
    """Root platform information endpoint."""
    return {
        "platform": settings.PROJECT_NAME,
        "status": "online",
        "version": settings.VERSION,
        "docs": "/docs",
    }


@app.get("/api/health", tags=["Health"])
def health_check():
    """Service health check endpoint used by Docker and monitoring agents."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "hospital-backend",
    }
