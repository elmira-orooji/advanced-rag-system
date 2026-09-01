import { authService } from "./authService";

export const API_URL = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
export const AUTH_EXPIRED_EVENT = "nexora:auth-expired";

type ErrorPayload = {
  detail?: string | { message?: string };
};

function errorMessage(payload: ErrorPayload | null, fallback: string) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (payload?.detail && typeof payload.detail.message === "string") return payload.detail.message;
  return fallback;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: init.credentials ?? "include",
  });

  if (response.status === 401) {
    authService.clearLocalSession();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  return response;
}

export async function apiRequest<T>(path: string, init?: RequestInit, fallback = "Request failed"): Promise<T> {
  const response = await apiFetch(path, init);
  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as ErrorPayload | T | null;
  if (!response.ok) throw new Error(errorMessage(payload as ErrorPayload | null, fallback));
  return payload as T;
}

export function apiUpload<T>(path: string, body: FormData, onProgress: (progress: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_URL}${path}`);
    request.withCredentials = true;
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const payload = (() => {
        try { return JSON.parse(request.responseText) as T | ErrorPayload; }
        catch { return null; }
      })();
      if (request.status === 401) {
        authService.clearLocalSession();
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve(payload as T);
      } else {
        reject(new Error(errorMessage(payload as ErrorPayload | null, "Upload failed")));
      }
    });
    request.addEventListener("error", () => reject(new Error("Network error while uploading")));
    request.addEventListener("abort", () => reject(new DOMException("Upload aborted", "AbortError")));
    request.send(body);
  });
}
