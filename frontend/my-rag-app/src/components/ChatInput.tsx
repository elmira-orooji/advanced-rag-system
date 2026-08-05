import { useState } from "react";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";

interface ChatInputProps {
  disabled: boolean;
  onSend: (message: string) => void;
}

export default function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue("");
  };

  return (
    <div className="app-composer mx-auto flex w-full max-w-3xl items-end gap-2 rounded-[22px] p-2 sm:p-2.5">
      <button type="button" aria-label="Attach a document" className="app-icon-button mb-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-white/35 hover:text-white/75">
        <Paperclip size={18} />
      </button>
      <textarea
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        }}
        placeholder="Ask your knowledge base..."
        className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/25 disabled:opacity-50"
      />
      <div className="mb-0.5 hidden items-center gap-1.5 text-[10px] text-white/20 sm:flex">
        <Sparkles size={12} /> RAG
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[#32127A] text-white shadow-[0_8px_24px_rgba(50,18,122,.35)] transition hover:-translate-y-0.5 hover:bg-[#43208F] disabled:translate-y-0 disabled:bg-white/[.06] disabled:text-white/20 disabled:shadow-none"
      >
        <ArrowUp size={18} />
      </button>
    </div>
  );
}
