import { useState } from "react";
import {
  AtSign,
  Link,
  Globe,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

    
{/* Input */}
<input
  type="text"
  placeholder="Ask or search for anything. Use @ to tag a file or collection."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="
    flex-1
    outline-none
    bg-transparent
    text-slate-700
    placeholder:text-slate-400
  "
/>

{/* Send */}
  <button
    onClick={handleSend}
    className="
      w-12 h-12
      rounded-full
      bg-slate-100
      flex items-center justify-center
      hover:bg-slate-200
      transition
      cursor-pointer
    "
  >
    <ArrowRight size={20} />
  </button>
</div>
);
}