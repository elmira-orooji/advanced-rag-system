export type MessageRole =
  | "user"
  | "assistant";

export interface Source {
  id: string;
  title: string;
}

export interface ChatMessage {
  id: string;

  role: MessageRole;

  content: string;

  createdAt: string;

  sources?: Source[];
}

export interface ChatSession {
  id: string;

  title: string;

  messages: ChatMessage[];

  createdAt: string;

  updatedAt: string;
}