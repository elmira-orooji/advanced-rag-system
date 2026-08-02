from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.routes import documents_router, search_router
from app.db.database import get_db

app = FastAPI(title="Advanced RAG API")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")


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
