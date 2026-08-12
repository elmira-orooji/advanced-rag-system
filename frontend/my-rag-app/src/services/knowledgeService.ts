import { authService } from "./authService";

const API_URL = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");

export interface KnowledgeDocument {
  id: string;
  filename: string;
  content_type: string | null;
  status: string;
  processing_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentSet {
  id: string;
  name: string;
  description: string | null;
  created_by_id: string;
  document_count: number;
  indexed_document_count: number;
  created_at: string;
  updated_at: string;
}

interface RagResponse {
  answer: string;
  grounded: boolean;
  citations: Array<{
    id: number;
    chunk_id: string;
    document_id: string;
    filename: string;
    chunk_index: number;
    excerpt: string;
    score: number;
    page: number | null;
    section: string | null;
  }>;
  sources: Array<{ chunk_id: string; document_id: string; filename: string; content: string; score: number }>;
}

function headers(json = false) {
  const token = authService.getSession()?.accessToken;
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    throw new Error(typeof detail === "string" ? detail : detail?.message || "Request failed");
  }
  return payload as T;
}

export const knowledgeService = {
  listSets: () => request<DocumentSet[]>("/document-sets", { headers: headers() }),
  createSet: (data: { name: string; description?: string }) =>
    request<DocumentSet>("/document-sets", { method: "POST", headers: headers(true), body: JSON.stringify(data) }),
  updateSet: (id: string, data: { name?: string; description?: string | null }) =>
    request<DocumentSet>(`/document-sets/${id}`, { method: "PATCH", headers: headers(true), body: JSON.stringify(data) }),
  deleteSet: (id: string) => request<void>(`/document-sets/${id}`, { method: "DELETE", headers: headers() }),
  listDocuments: (setId?: string) =>
    request<KnowledgeDocument[]>(`/documents?limit=100${setId ? `&document_set_id=${encodeURIComponent(setId)}` : ""}`, { headers: headers() }),
  uploadDocument: async (file: File, setId: string) => {
    const form = new FormData();
    form.append("file", file);
    const document = await request<KnowledgeDocument>("/documents/ingest", { method: "POST", headers: headers(), body: form });
    await request(`/document-sets/${setId}/documents`, {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ document_id: document.id }),
    });
    return document;
  },
  removeDocumentFromSet: (setId: string, documentId: string) =>
    request(`/document-sets/${setId}/documents/${documentId}`, { method: "DELETE", headers: headers() }),
  deleteDocument: (documentId: string) => request(`/documents/${documentId}`, { method: "DELETE", headers: headers() }),
  ask: (question: string, documentSetId: string) =>
    request<RagResponse>("/rag/answer", {
      method: "POST",
      headers: headers(true),
      body: JSON.stringify({ question, document_set_id: documentSetId, limit: 5 }),
    }),
};
