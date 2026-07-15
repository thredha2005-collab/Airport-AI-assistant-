from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.routes.auth import router as auth_router
from app.routes.api import router as api_router
from app.routes.demo import router as demo_router
from app.routes.chatbot import router as chatbot_router

app = FastAPI(
    title="AI Airport Companion API",
    description="Backend API for simulation, machine learning wait-time predictions, airport facility directory, and SkyGuide AI chatbot.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend web integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits connection from React frontend servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(api_router)
app.include_router(demo_router)
app.include_router(chatbot_router)

@app.get("/")
def read_root():
    return {
        "app": "AI Airport Companion API",
        "version": "1.0.0",
        "status": "healthy",
        "documentation": "/docs"
    }
