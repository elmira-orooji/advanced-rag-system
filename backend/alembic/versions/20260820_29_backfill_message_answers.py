"""Backfill answer records for persisted assistant messages.

Revision ID: 20260820_29
Revises: 20260819_28
"""

from alembic import op


revision = "20260820_29"
down_revision = "20260819_28"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO answer_records (
            id, user_id, assistant_id, document_set_id, question, answer,
            grounded, citation_count, created_at
        )
        SELECT
            message.id,
            conversation.user_id,
            conversation.assistant_id,
            conversation.document_set_id,
            COALESCE(
                (
                    SELECT user_message.content
                    FROM messages AS user_message
                    WHERE user_message.conversation_id = message.conversation_id
                      AND user_message.role = 'user'
                      AND user_message.created_at <= message.created_at
                    ORDER BY user_message.created_at DESC, user_message.id DESC
                    LIMIT 1
                ),
                'Imported conversation question'
            ),
            message.content,
            message.sources IS NOT NULL,
            0,
            message.created_at
        FROM messages AS message
        JOIN conversations AS conversation ON conversation.id = message.conversation_id
        WHERE message.role = 'assistant'
          AND message.answer_id IS NULL
          AND conversation.user_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM answer_records AS answer WHERE answer.id = message.id
          )
        """
    )
    op.execute(
        """
        UPDATE messages AS message
        SET answer_id = message.id
        WHERE message.role = 'assistant'
          AND message.answer_id IS NULL
          AND EXISTS (
              SELECT 1 FROM answer_records AS answer WHERE answer.id = message.id
          )
        """
    )


def downgrade() -> None:
    # Keep historical analytics and feedback intact when rolling the schema back.
    op.execute(
        """
        UPDATE messages
        SET answer_id = NULL
        WHERE answer_id = id
        """
    )
