import { Plus, ArrowRight } from "lucide-react";
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
    <div className="flex items-center bg-white rounded-full border border-slate-200 px-4 py-3 shadow-sm">
  <button className="text-purple-500">
    <Plus size={22} />
  </button>

  <div className="w-px h-6 bg-slate-200 mx-4" />

  <input
    placeholder="Ask or search for anything. Use @ to tag a file or collection."
    className="flex-1 outline-none bg-transparent"
  />

    <button
      onClick={handleSend}
      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200"
    >
      <ArrowRight size={18} />
    </button>
      </div>
  );
}