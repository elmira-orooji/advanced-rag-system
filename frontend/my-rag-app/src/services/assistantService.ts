import { authService } from "./authService";
import type { DocumentSet } from "./knowledgeService";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const headers = (json = false) => ({ ...(json ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${authService.getSession()?.accessToken || ""}` });
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(`${API}${path}`, init); if (response.status === 204) return undefined as T; const data = await response.json().catch(() => null); if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed"); return data; }

export interface CustomAssistant { id: string; name: string; description: string | null; instructions: string; is_active: boolean; created_by_id: string; document_set_ids: string[]; document_set_names: string[]; created_at: string; updated_at: string; }
export interface AssistantPayload { name: string; description?: string; instructions: string; document_set_ids: string[]; is_active: boolean; }
export interface AssistantAnswer { response_id: string; answer: string; grounded: boolean; citations: Array<{ id: number; chunk_id: string; document_id: string; filename: string; chunk_index: number; excerpt: string; score: number; page: number | null; section: string | null }>; }

export const assistantService = {
  list: () => request<CustomAssistant[]>("/assistants", { headers: headers() }),
  listSets: () => request<DocumentSet[]>("/document-sets", { headers: headers() }),
  create: (payload: AssistantPayload) => request<CustomAssistant>("/assistants", { method: "POST", headers: headers(true), body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<AssistantPayload>) => request<CustomAssistant>(`/assistants/${id}`, { method: "PATCH", headers: headers(true), body: JSON.stringify(payload) }),
  remove: (id: string) => request<void>(`/assistants/${id}`, { method: "DELETE", headers: headers() }),
  ask: (id: string, question: string) => request<AssistantAnswer>(`/assistants/${id}/answer`, { method: "POST", headers: headers(true), body: JSON.stringify({ question, limit: 5 }) }),
};
