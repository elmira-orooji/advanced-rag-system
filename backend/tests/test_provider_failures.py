from app.services.openrouter import OpenRouterError
from app.services.provider_failures import provider_http_error
from app.services.qdrant import QdrantError


def test_qdrant_errors_do_not_expose_provider_details():
    response = provider_http_error(QdrantError("internal host unavailable"))

    assert response.status_code == 503
    assert response.detail == "Knowledge search is temporarily unavailable. Please retry shortly."


def test_model_errors_do_not_expose_provider_details():
    response = provider_http_error(OpenRouterError("credential rejected"))

    assert response.status_code == 503
    assert response.detail == "The AI response service is temporarily unavailable. Please retry shortly."
