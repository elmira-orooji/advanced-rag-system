import { useState } from "react";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChatInputProps {
  disabled: boolean;
  onSend: (message: string) => void;
  initialValue?: string;
  prominent?: boolean;
}

export default function ChatInput({ disabled, onSend, initialValue = "", prominent = false }: ChatInputProps) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const [value, setValue] = useState(initialValue);

  const handleSend = () => {
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue("");
  };

  return (
    <div className={`app-composer mx-auto flex w-full items-end gap-2 rounded-[22px] p-2 sm:p-2.5 ${prominent ? "max-w-4xl" : "max-w-3xl"}`}>
      <button type="button" aria-label={isFa ? "پیوست سند" : "Attach a document"} className="app-icon-button mb-0.5 grid size-10 shrink-0 place-items-center rounded-xl text-white/35 hover:text-white/75">
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
        placeholder={isFa ? "از پایگاه دانش خود بپرسید..." : "Ask your knowledge base..."}
        className="chat-composer-textarea max-h-32 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-white/25 disabled:opacity-50"
      />
      <div className="chat-rag-label mb-0.5 hidden items-center gap-1.5 text-[10px] text-white/20 sm:flex">
        <Sparkles size={12} /> RAG
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label={isFa ? "ارسال پیام" : "Send message"}
        className="mb-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[#32127A] text-white shadow-[0_8px_24px_rgba(50,18,122,.35)] transition hover:-translate-y-0.5 hover:bg-[#43208F] disabled:translate-y-0 disabled:bg-white/[.06] disabled:text-white/20 disabled:shadow-none"
      >
        <ArrowUp size={18} />
      </button>
    </div>
  );
}
