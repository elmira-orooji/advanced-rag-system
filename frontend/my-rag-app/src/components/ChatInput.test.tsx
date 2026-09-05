import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ChatInput from "./ChatInput";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

describe("ChatInput", () => {
  it("keeps the message when sending fails", async () => {
    const onSend = vi.fn().mockResolvedValue(false);
    render(<ChatInput disabled={false} onSend={onSend} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Retry this question" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("Retry this question"));
    expect(input).toHaveValue("Retry this question");
  });

  it("clears the message after a successful send", async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    render(<ChatInput disabled={false} onSend={onSend} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Sent question" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(input).toHaveValue(""));
  });
});
