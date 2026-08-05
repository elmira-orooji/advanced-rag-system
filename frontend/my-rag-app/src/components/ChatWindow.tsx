import { Copy, FileText, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import type { ChatMessage } from "../types/chat";

interface ChatWindowProps {
  messages: ChatMessage[];
  isThinking: boolean;
}

export default function ChatWindow({ messages, isThinking }: ChatWindowProps) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
      {messages.map((message) => (
        <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
          {message.role === "assistant" && (
            <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]">
              <Sparkles size={14} />
            </span>
          )}
          <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[75%] ${message.role === "user" ? "rounded-br-md bg-[#32127A] text-white shadow-[0_10px_28px_rgba(50,18,122,.25)]" : "rounded-tl-md border border-white/[.08] bg-white/[.045] text-white/75"}`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
            {message.role === "assistant" && message.sources?.length ? (
              <div className="mt-4 border-t border-white/[.07] pt-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#a995eb]">Sources</p>
                <div className="flex flex-wrap gap-2">
                  {message.sources.map((source) => (
                    <span key={source.id} className="flex items-center gap-1.5 rounded-lg border border-white/[.07] bg-black/15 px-2.5 py-1.5 text-[11px] text-white/45">
                      <FileText size={12} /> {source.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {message.role === "assistant" && (
              <button type="button" aria-label="Copy response" onClick={() => { void navigator.clipboard.writeText(message.content); toast.success("Response copied"); }} className="mt-3 grid size-7 place-items-center rounded-lg text-white/25 transition hover:bg-white/[.06] hover:text-white/70">
                <Copy size={13} />
              </button>
            )}
          </div>
        </article>
      ))}
      {isThinking && (
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]"><Sparkles size={14} /></span>
          <div className="flex gap-1.5 rounded-2xl rounded-tl-md border border-white/[.08] bg-white/[.045] px-4 py-4">
            {[0, 1, 2].map((item) => <span key={item} className="size-1.5 animate-bounce rounded-full bg-[#a995eb]" style={{ animationDelay: `${item * 120}ms` }} />)}
          </div>
        </div>
      )}
    </div>
  );
}
