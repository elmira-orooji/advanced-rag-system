import uuid
from typing import Literal
from pydantic import BaseModel, Field, model_validator


class FeedbackUpsert(BaseModel):
    rating: Literal[-1, 1]
    reason: Literal["incorrect", "irrelevant_source", "incomplete", "citation_issue", "other"] | None = None
    comment: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def negative_requires_reason(self):
        if self.rating == -1 and self.reason is None:
            raise ValueError("A reason is required for negative feedback")
        if self.rating == 1:
            self.reason = None
            self.comment = None
        return self


class FeedbackResponse(BaseModel):
    id: uuid.UUID
    answer_id: uuid.UUID
    rating: int
    reason: str | None
    comment: str | None
