import { beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "./authService";

const user = {
  id: "user-1",
  username: "elmira",
  role: "admin" as const,
  organization_id: "org-1",
  organization_name: "Nexora",
  organization_slug: "nexora",
};

describe("authService", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("creates a cookie-backed session without storing an access token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      expires_in: 3600,
      user,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const session = await authService.login({
      username: " elmira ",
      password: "password123",
      rememberMe: true,
      organization: " NEXORA ",
    });

    expect(session.user).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/auth/login", expect.objectContaining({
      credentials: "include",
      body: JSON.stringify({
        username: "elmira",
        password: "password123",
        remember_me: true,
        organization: "nexora",
      }),
    }));
    const stored = JSON.parse(localStorage.getItem("knowledgeflow.auth") ?? "{}") as Record<string, unknown>;
    expect(stored.user).toEqual(user);
    expect(stored).not.toHaveProperty("accessToken");
  });

  it("removes an expired local session", () => {
    localStorage.setItem("knowledgeflow.auth", JSON.stringify({ user, expiresAt: Date.now() - 1 }));
    expect(authService.getSession()).toBeNull();
    expect(localStorage.getItem("knowledgeflow.auth")).toBeNull();
  });
});
