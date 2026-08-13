import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvaluationCaseCreate(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    expected_answer: str | None = Field(default=None, max_length=12000)
    expected_keywords: list[str] = Field(default_factory=list, max_length=20)
    relevant_chunk_ids: list[str] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def normalize(self):
        self.question = self.question.strip()
        self.expected_answer = self.expected_answer.strip() if self.expected_answer else None
        self.expected_keywords = list(dict.fromkeys(value.strip() for value in self.expected_keywords if value.strip()))
        try:
            self.relevant_chunk_ids = list(dict.fromkeys(str(uuid.UUID(value.strip())) for value in self.relevant_chunk_ids if value.strip()))
        except ValueError as exc:
            raise ValueError("Relevant chunk IDs must be valid UUIDs") from exc
        return self


class EvaluationCaseUpdate(EvaluationCaseCreate):
    pass


class EvaluationCaseResponse(EvaluationCaseCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    document_set_id: uuid.UUID
    created_by_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
