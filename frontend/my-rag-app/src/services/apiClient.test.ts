import { describe, expect, it, vi } from "vitest";
import { apiRequest, AUTH_EXPIRED_EVENT } from "./apiClient";

describe("apiRequest authentication handling", () => {
  it("clears local session and announces a 401 response", async () => {
    localStorage.setItem("knowledgeflow.auth", JSON.stringify({ expiresAt: Date.now() + 60_000, user: {} }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "Expired" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }));
    const listener = vi.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, listener);

    await expect(apiRequest("/private")).rejects.toThrow("Expired");

    expect(localStorage.getItem("knowledgeflow.auth")).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(AUTH_EXPIRED_EVENT, listener);
  });
});
