import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EvaluationDataset from "./EvaluationDataset";

vi.mock("../services/knowledgeService", () => ({
  knowledgeService: {
    listEvaluationCases: vi.fn().mockResolvedValue([]),
  },
}));

function Harness() {
  const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Open evaluations</button>
    {open && <EvaluationDataset setId="set-1" documentIds={[]} filters={{}} isFa={false} canManage onClose={() => setOpen(false)} />}
  </>;
}

describe("EvaluationDataset dialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("labels the dialog and icon buttons, traps focus, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open evaluations" });
    await user.click(opener);

    expect(screen.getByRole("dialog", { name: "Evaluation Dataset" })).toHaveAttribute("aria-modal", "true");
    const add = screen.getByRole("button", { name: "Add evaluation case" });
    const close = screen.getByRole("button", { name: "Close evaluation dataset" });
    await waitFor(() => expect(add).toHaveFocus());

    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab();
    expect(add).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
