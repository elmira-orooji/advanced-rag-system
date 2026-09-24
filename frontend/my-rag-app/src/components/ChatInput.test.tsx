import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ChatInput from "./ChatInput";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));

describe("ChatInput", () => {
  it("keeps the message when sending fails", async () => {
    const onSend = vi.fn().mockResolvedValue(false);
    const { container } = render(<ChatInput disabled={false} onSend={onSend} />);

    const input = screen.getByRole("textbox");
    expect(container.querySelector(".chat-send-beam[data-active]")).not.toBeInTheDocument();
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

  it("replaces send with a stop action while a response is being generated", () => {
    const onCancel = vi.fn();
    const { container } = render(<ChatInput disabled={false} isSending onCancel={onCancel} onSend={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Stop generating" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(container.querySelector(".chat-send-beam[data-active]")).toBeInTheDocument();
  });
});
