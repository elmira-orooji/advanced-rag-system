import { authService } from "./authService";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");

export interface ConversationSummary {
  id: string;
  title: string;
  document_id: string | null;
  document_set_id: string | null;
  assistant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersistedMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Array<{
    chunk_id: string;
    document_id: string;
    filename: string;
    content: string;
    score: number;
    chunk_index?: number;
    page?: number | null;
    section?: string | null;
  }> | null;
  answer_id: string | null;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: PersistedMessage[];
}

function headers() {
  const token = authService.getSession()?.accessToken;
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof payload?.detail === "string" ? payload.detail : "Conversation request failed");
  return payload as T;
}

export const conversationService = {
  list: () => request<ConversationSummary[]>("/conversations?limit=100", { headers: headers() }),
  get: (id: string) => request<ConversationDetail>(`/conversations/${id}`, { headers: headers() }),
  createForSet: (documentSetId: string, title?: string) => request<ConversationSummary>("/conversations", {
    method: "POST", headers: headers(), body: JSON.stringify({ document_set_id: documentSetId, title: title || undefined }),
  }),
  send: (id: string, content: string) => request<PersistedMessage>(`/conversations/${id}/messages`, {
    method: "POST", headers: headers(), body: JSON.stringify({ content, limit: 5 }),
  }),
  rename: (id: string, title: string) => request<ConversationSummary>(`/conversations/${id}`, {
    method: "PATCH", headers: headers(), body: JSON.stringify({ title }),
  }),
  remove: (id: string) => request<void>(`/conversations/${id}`, { method: "DELETE", headers: headers() }),
};
