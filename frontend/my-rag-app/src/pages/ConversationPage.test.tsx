import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ConversationPage from "./ConversationPage";

const mocks = vi.hoisted(() => ({
  createForSet: vi.fn(),
  send: vi.fn(),
  get: vi.fn(),
  listSets: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" } }),
}));
vi.mock("react-hot-toast", () => ({ default: { error: vi.fn() } }));
vi.mock("../services/assistantService", () => ({ assistantService: { list: vi.fn() } }));
vi.mock("../services/conversationService", () => ({
  conversationService: {
    createForSet: mocks.createForSet,
    send: mocks.send,
    get: mocks.get,
  },
}));
vi.mock("../services/knowledgeService", () => ({
  knowledgeService: { listSets: mocks.listSets },
}));
vi.mock("../components/OnyxChatWindow", () => ({
  default: () => <div>Conversation messages</div>,
}));

describe("ConversationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSets.mockResolvedValue([{ id: "set-1", name: "Knowledge", indexed_document_count: 1 }]);
    mocks.createForSet.mockResolvedValue({ id: "conversation-1" });
    mocks.get.mockResolvedValue({ id: "conversation-1", title: "First chat", messages: [] });
  });

  it("navigates to a new conversation only after the first response is ready", async () => {
    let finishSend: (() => void) | undefined;
    mocks.send.mockImplementation(() => new Promise<void>((resolve) => { finishSend = resolve; }));
    const onConversationChange = vi.fn();

    render(
      <ConversationPage
        conversationId={null}
        onConversationChange={onConversationChange}
        onConversationsUpdated={vi.fn()}
        onOpenKnowledge={vi.fn()}
      />,
    );

    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "First question" } });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith("conversation-1", "First question"));
    expect(onConversationChange).not.toHaveBeenCalled();

    finishSend?.();
    await waitFor(() => expect(onConversationChange).toHaveBeenCalledWith("conversation-1"));
  });

  it("offers a direct knowledge-base CTA when none exists", async () => {
    mocks.listSets.mockResolvedValueOnce([]);
    const onOpenKnowledge = vi.fn();

    render(<ConversationPage conversationId={null} onConversationChange={vi.fn()} onConversationsUpdated={vi.fn()} onOpenKnowledge={onOpenKnowledge} />);

    fireEvent.click(await screen.findByRole("button", { name: "Create knowledge base" }));
    expect(onOpenKnowledge).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Upload first document" })).toBeInTheDocument();
  });
});
