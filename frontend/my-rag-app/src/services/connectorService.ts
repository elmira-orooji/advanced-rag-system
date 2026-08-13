import { authService } from "./authService";
const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const headers = (json = false) => ({ ...(json ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${authService.getSession()?.accessToken || ""}` });
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(`${API}${path}`, init); if (response.status === 204) return undefined as T; const data = await response.json().catch(() => null); if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed"); return data; }
export type ConnectorType = "website" | "github" | "google_drive" | "s3" | "sharepoint";
export interface Connector { id: string; document_set_id: string; connector_type: ConnectorType; name: string; source_url: string; status: string; last_error: string | null; last_synced_at: string | null; schedule_enabled: boolean; schedule_interval: "hourly" | "daily" | "weekly"; next_sync_at: string | null; last_sync_summary: { discovered?: number; created?: number; updated?: number; unchanged?: number; deleted?: number }; created_at: string; }
export const connectorService = {
  list: (setId: string) => request<Connector[]>(`/document-sets/${setId}/connectors`, { headers: headers() }),
  create: (setId: string, payload: { connector_type: ConnectorType; name: string; source_url: string; schedule_enabled?: boolean; schedule_interval?: "hourly" | "daily" | "weekly" }) => request<Connector>(`/document-sets/${setId}/connectors`, { method: "POST", headers: headers(true), body: JSON.stringify(payload) }),
  sync: (setId: string, id: string) => request<{ discovered: number; created: number; updated: number; unchanged: number; deleted: number }>(`/document-sets/${setId}/connectors/${id}/sync`, { method: "POST", headers: headers() }),
  remove: (setId: string, id: string) => request<void>(`/document-sets/${setId}/connectors/${id}`, { method: "DELETE", headers: headers() }),
  updateSchedule: (setId: string, id: string, schedule_enabled: boolean, schedule_interval: "hourly" | "daily" | "weekly") => request<Connector>(`/document-sets/${setId}/connectors/${id}/schedule`, { method: "PATCH", headers: headers(true), body: JSON.stringify({ schedule_enabled, schedule_interval }) }),
};
