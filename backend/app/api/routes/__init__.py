from app.api.routes.assistants import router as assistants_router
from app.api.routes.auth import router as auth_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.document_sets import router as document_sets_router
from app.api.routes.documents import router as documents_router
from app.api.routes.rag import router as rag_router
from app.api.routes.search import router as search_router

__all__ = [
    "assistants_router",
    "auth_router",
    "conversations_router",
    "document_sets_router",
    "documents_router",
    "rag_router",
    "search_router",
]
