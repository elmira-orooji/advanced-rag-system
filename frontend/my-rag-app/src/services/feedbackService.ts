import { authService } from "./authService";

const API = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
export type FeedbackReason = "incorrect" | "irrelevant_source" | "incomplete" | "citation_issue" | "other";

export const feedbackService = {
  async save(answerId: string, rating: -1 | 1, reason?: FeedbackReason, comment?: string) {
    const response = await fetch(`${API}/answers/${answerId}/feedback`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authService.getSession()?.accessToken || ""}` },
      body: JSON.stringify({ rating, reason: reason || null, comment: comment || null }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Could not save feedback");
    return data;
  },
};
