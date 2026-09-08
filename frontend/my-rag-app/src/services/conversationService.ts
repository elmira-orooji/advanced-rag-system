import { apiRequest } from "./apiClient";
import type { AnswerBasis } from "../types/chat";

export interface ConversationSummary {
  id: string;
  title: string;
  document_id: string | null;
  document_set_id: string | null;
  assistant_id: string | null;
  workspace_scope?: boolean;
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
  answer_basis: AnswerBasis | null;
  answer_id: string | null;
  created_at: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: PersistedMessage[];
}

function headers() {
  return { "Content-Type": "application/json" };
}

const request = <T,>(path: string, init?: RequestInit) => apiRequest<T>(path, init, "Conversation request failed");

export const conversationService = {
  list: () => request<ConversationSummary[]>("/conversations?limit=100", { headers: headers() }),
  get: (id: string, signal?: AbortSignal) => request<ConversationDetail>(`/conversations/${id}`, { headers: headers(), signal }),
  createForSet: (documentSetId: string, title?: string, signal?: AbortSignal) => request<ConversationSummary>("/conversations", {
    method: "POST", headers: headers(), body: JSON.stringify({ document_set_id: documentSetId, title: title || undefined }), signal,
  }),
  createForWorkspace: (title?: string, signal?: AbortSignal) => request<ConversationSummary>("/conversations", {
    method: "POST", headers: headers(), body: JSON.stringify({ workspace_scope: true, title: title || undefined }), signal,
  }),
  createForAssistant: (assistantId: string, title?: string) => request<ConversationSummary>("/conversations", {
    method: "POST", headers: headers(), body: JSON.stringify({ assistant_id: assistantId, title: title || undefined }),
  }),
  send: (id: string, content: string, signal?: AbortSignal) => request<PersistedMessage>(`/conversations/${id}/messages`, {
    method: "POST", headers: headers(), body: JSON.stringify({ content, limit: 5 }), signal,
  }),
  rename: (id: string, title: string) => request<ConversationSummary>(`/conversations/${id}`, {
    method: "PATCH", headers: headers(), body: JSON.stringify({ title }),
  }),
  remove: (id: string) => request<void>(`/conversations/${id}`, { method: "DELETE", headers: headers() }),
};
