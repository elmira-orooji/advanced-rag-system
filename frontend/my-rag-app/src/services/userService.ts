import { authService } from "./authService";
import type { DocumentSet } from "./knowledgeService";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
const headers = (json = false) => ({ ...(json ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${authService.getSession()?.accessToken || ""}` });
async function request<T>(path: string, init?: RequestInit): Promise<T> { const response = await fetch(`${API}${path}`, init); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Request failed"); return data; }

export interface ManagedUser { id: string; username: string; job_title: string | null; role: "admin" | "user"; is_active: boolean; created_at: string; }
export interface CreateManagedUser { username: string; password: string; job_title?: string; role: "admin" | "user"; is_active: boolean; }
export type PermissionLevel = "view" | "edit" | "manage";
export interface SetPermission { document_set_id: string; document_set_name: string; permission: PermissionLevel; }

export const userService = {
  list: () => request<ManagedUser[]>("/users", { headers: headers() }),
  create: (payload: CreateManagedUser) => request<ManagedUser>("/users", { method: "POST", headers: headers(true), body: JSON.stringify(payload) }),
  listSets: () => request<DocumentSet[]>("/document-sets", { headers: headers() }),
  permissions: (userId: string) => request<SetPermission[]>(`/users/${userId}/document-set-permissions`, { headers: headers() }),
  savePermissions: (userId: string, permissions: Array<{ document_set_id: string; permission: PermissionLevel }>) => request<SetPermission[]>(`/users/${userId}/document-set-permissions`, { method: "PUT", headers: headers(true), body: JSON.stringify({ permissions }) }),
};
