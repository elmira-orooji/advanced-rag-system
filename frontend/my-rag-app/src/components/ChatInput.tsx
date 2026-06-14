import { Paperclip, Send } from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  disabled: boolean;

  onSend: (
    message: string
  ) => void;
}

export default function ChatInput({
  disabled,
  onSend,
}: ChatInputProps) {
  const [value, setValue] =
    useState("");

  const handleSend = () => {
    if (
      !value.trim() ||
      disabled
    )
      return;

    onSend(value);

    setValue("");
  };

  return (
    <div className="rounded-3xl border border-slate-700 bg-white border border-slate-200 p-4">
      <div className="flex items-end gap-3">
        <button
          className="
            rounded-xl
            p-3
            text-slate-400
            transition
            hover:bg-slate-800
          "
        >
          <Paperclip size={20} />
        </button>

        <textarea
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="How can I help you today?"
          onChange={(e) =>
            setValue(
              e.target.value
            )
          }
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();

              handleSend();
            }
          }}
          className="
            max-h-40
            flex-1
            resize-none
            bg-transparent
            outline-none
            text-white
            placeholder:text-slate-500
          "
        />

        <button
          onClick={handleSend}
          disabled={disabled}
          className="
            rounded-xl
            bg-blue-600
            p-3
            text-white
            transition
            hover:bg-blue-700
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}