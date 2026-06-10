import { Copy, FileText } from "lucide-react";

import type {
  ChatMessage,
} from "../types/chat";

interface ChatWindowProps {
  messages: ChatMessage[];

  isThinking: boolean;
}

export default function ChatWindow({
  messages,
  isThinking,
}: ChatWindowProps) {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === "user"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <div
            className={`
              max-w-3xl
              rounded-3xl
              px-6
              py-4
              shadow-lg

              ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-100"
              }
            `}
          >
            {/* Content */}
            <p className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>

            {/* Sources */}
            {message.role ===
              "assistant" &&
              message.sources &&
              message.sources.length >
                0 && (
                <div className="mt-5 border-t border-slate-700 pt-4">
                  <p className="mb-3 text-sm font-semibold text-blue-400">
                    Sources
                  </p>

                  <div className="space-y-2">
                    {message.sources.map(
                      (source) => (
                        <div
                          key={source.id}
                          className="
                            flex
                            items-center
                            gap-2
                            text-sm
                            text-slate-300
                          "
                        >
                          <FileText
                            size={16}
                          />

                          <span>
                            {
                              source.title
                            }
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Copy */}
            {message.role ===
              "assistant" && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      message.content
                    )
                  }
                  className="
                    rounded-lg
                    p-2
                    text-slate-400
                    transition
                    hover:bg-slate-700
                    hover:text-white
                  "
                >
                  <Copy size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Thinking */}
      {isThinking && (
        <div className="flex justify-start">
          <div className="rounded-3xl bg-slate-800 px-6 py-4 text-slate-300">
            <div className="flex gap-2">
              <span className="animate-bounce">
                ●
              </span>

              <span
                className="animate-bounce"
                style={{
                  animationDelay:
                    "0.15s",
                }}
              >
                ●
              </span>

              <span
                className="animate-bounce"
                style={{
                  animationDelay:
                    "0.3s",
                }}
              >
                ●
              </span>
            </div>

            <p className="mt-2 text-sm">
              KnowledgeFlow AI is
              thinking...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}