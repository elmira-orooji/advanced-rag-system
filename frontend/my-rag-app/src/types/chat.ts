export type MessageRole =
  | "user"
  | "assistant";

export type AnswerBasis =
  | "sources"
  | "general"
  | "hybrid";

export interface Source {
  id: string;
  title: string;
  citationId?: number;
  documentId?: string;
  chunkIndex?: number;
  excerpt?: string;
  score?: number;
  page?: number | null;
  section?: string | null;
}

export interface ChatMessage {
  id: string;

  role: MessageRole;

  content: string;

  createdAt: string;

  sources?: Source[];
  grounded?: boolean;
  answerBasis?: AnswerBasis;
  responseId?: string;
  feedback?: 1 | -1;
  research?: { steps: Array<{ query: string; evidence_count: number }>; evidenceReviewed: number };
}

