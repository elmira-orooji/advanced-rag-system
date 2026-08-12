from datetime import date

from pydantic import BaseModel, Field


class MetadataFilters(BaseModel):
    authors: list[str] | None = Field(default=None, max_length=20)
    languages: list[str] | None = Field(default=None, max_length=10)
    source_types: list[str] | None = Field(default=None, max_length=10)
    tags: list[str] | None = Field(default=None, max_length=20)
    date_from: date | None = None
    date_to: date | None = None
