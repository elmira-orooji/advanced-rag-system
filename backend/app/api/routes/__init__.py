from app.api.routes.assistants import router as assistants_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.auth import router as auth_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.connectors import router as connectors_router
from app.api.routes.chat_shares import router as chat_shares_router
from app.api.routes.document_sets import router as document_sets_router
from app.api.routes.feedback import router as feedback_router
from app.api.routes.documents import router as documents_router
from app.api.routes.rag import router as rag_router
from app.api.routes.research import router as research_router
from app.api.routes.search import router as search_router
from app.api.routes.users import router as users_router

__all__ = [
    "assistants_router",
    "analytics_router",
    "auth_router",
    "conversations_router",
    "connectors_router",
    "chat_shares_router",
    "document_sets_router",
    "feedback_router",
    "documents_router",
    "rag_router",
    "research_router",
    "search_router",
    "users_router",
]
