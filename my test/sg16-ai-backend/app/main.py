from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_db_and_tables
from app.routers import auth_router, chat_router, safety_router, student_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Most Powerful AI Engine - Privacy First",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    create_db_and_tables()


app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(safety_router, prefix=settings.API_V1_STR)
app.include_router(student_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": "🚀 SG16 AI Backend is Running",
        "version": "1.0.0",
        "status": "Student Mode + Safety Shield Ready",
    }
