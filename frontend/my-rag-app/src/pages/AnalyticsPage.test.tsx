import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AnalyticsPage from "./AnalyticsPage";

const mocks = vi.hoisted(() => ({ overview: vi.fn(), toastError: vi.fn() }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (key: string) => key }),
}));
vi.mock("react-hot-toast", () => ({ default: { error: mocks.toastError } }));
vi.mock("framer-motion", () => ({
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> },
  useReducedMotion: () => true,
}));
vi.mock("../services/authService", () => ({ authService: { getUser: () => ({ username: "manager" }) } }));
vi.mock("../services/analyticsService", () => ({ analyticsService: { overview: mocks.overview } }));

const overview = {
  period_days: 30,
  total_queries: 12,
  active_users: 3,
  grounded_rate: 75,
  positive_feedback_rate: 80,
  feedback_coverage: 50,
  unanswered_queries: 1,
  average_citations: 2,
  indexed_documents: 9,
  failed_documents: 0,
  daily: [{ date: "2026-09-01", queries: 12, grounded: 9, negative_feedback: 1 }],
  assistants: [],
  knowledge_sets: [],
  negative_reasons: [],
  recent_issues: [],
};

describe("AnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.overview.mockResolvedValueOnce(overview);
  });

  it("keeps the loaded period selected when a new period fails", async () => {
    mocks.overview.mockRejectedValueOnce(new Error("Analytics unavailable"));
    render(<AnalyticsPage />);

    const thirtyDays = await screen.findByRole("button", { name: "30 days" });
    await waitFor(() => expect(thirtyDays).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "7 days" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Analytics unavailable"));
    expect(thirtyDays).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
  });
});
