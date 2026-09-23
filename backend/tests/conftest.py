"""Shared test-pyramid classification for the backend suite."""

import pytest


def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Treat every test without an explicit integration marker as a unit test."""
    for item in items:
        if not item.get_closest_marker("integration"):
            item.add_marker(pytest.mark.unit)
