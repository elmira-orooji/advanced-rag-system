export type MessageRole =
  | "user"
  | "assistant";

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
  responseId?: string;
  feedback?: 1 | -1;
}

export interface ChatSession {
  id: string;

  title: string;

  messages: ChatMessage[];

  createdAt: string;

  updatedAt: string;
}
