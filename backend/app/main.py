from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes import analytics_router, assistants_router, auth_router, chat_shares_router, connectors_router, conversations_router, document_sets_router, documents_router, evaluations_router, feedback_router, rag_router, research_router, search_router, users_router
from app.core.config import FRONTEND_ORIGINS
from app.db.database import get_db

app = FastAPI(title="Advanced RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(assistants_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(document_sets_router, prefix="/api/v1")
app.include_router(evaluations_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(rag_router, prefix="/api/v1")
app.include_router(research_router, prefix="/api/v1")
app.include_router(conversations_router, prefix="/api/v1")
app.include_router(connectors_router, prefix="/api/v1")
app.include_router(chat_shares_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
@app.get("/")
def root():
    return {
        "status": "API is running"
    }


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection failed",
        ) from exc

    return {
        "status": "healthy",
        "database": "connected",
    }
