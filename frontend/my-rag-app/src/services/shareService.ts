import { authService } from "./authService";
import type { ChatMessage } from "../types/chat";
const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const auth = () => ({ Authorization: `Bearer ${authService.getSession()?.accessToken || ""}` });
export interface SharedChat { id: string; title: string; owner_username: string; visibility: "team" | "link"; messages: Array<{ role: "user" | "assistant"; content: string; sources: Array<{ title: string; citation_id?: number; excerpt?: string; page?: number | null; section?: string | null }> }>; created_at: string; expires_at: string | null; }
async function json<T>(response: Response): Promise<T> { const data = await response.json().catch(() => null); if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed"); return data; }
export const shareService = {
  async list() { return json<Array<{ id: string; title: string; visibility: "team" | "link"; expires_at: string | null; created_at: string }>>(await fetch(`${API}/chat-shares`, { headers: auth() })); },
  async create(title: string, visibility: "team" | "link", expiresInDays: 1 | 7 | 30 | null, messages: ChatMessage[]) {
    return json<{ id: string; share_token: string; visibility: "team" | "link"; expires_at: string | null }>(await fetch(`${API}/chat-shares`, { method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify({ title, visibility, expires_in_days: expiresInDays, messages: messages.map((message) => ({ role: message.role, content: message.content, sources: (message.sources || []).map((source) => ({ title: source.title, citation_id: source.citationId, excerpt: source.excerpt, page: source.page, section: source.section })) })) }) }));
  },
  async view(token: string, visibility: "team" | "link") { return json<SharedChat>(await fetch(`${API}/shared/${visibility}/${encodeURIComponent(token)}`, { headers: visibility === "team" ? auth() : {} })); },
  async revoke(id: string) { const response = await fetch(`${API}/chat-shares/${id}`, { method: "DELETE", headers: auth() }); if (!response.ok) throw new Error("Could not revoke shared conversation"); },
};
