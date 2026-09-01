import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProtectedRoute from "./ProtectedRoute";

const user = {
  id: "user-1",
  username: "member",
  role: "user",
  organization_id: "org-1",
  organization_name: "Nexora",
  organization_slug: "nexora",
};

function renderRoutes() {
  return render(<MemoryRouter initialEntries={["/home/settings"]}>
    <Routes>
      <Route path="/" element={<div>Login page</div>} />
      <Route path="/home/settings" element={<ProtectedRoute><div>Private settings</div></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>);
}

describe("ProtectedRoute", () => {
  it("redirects an unauthenticated visitor to login", () => {
    renderRoutes();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("allows a user with a valid session", () => {
    sessionStorage.setItem("knowledgeflow.auth", JSON.stringify({ user, expiresAt: Date.now() + 60_000 }));
    renderRoutes();
    expect(screen.getByText("Private settings")).toBeInTheDocument();
  });
});
