import { useState } from "react";
import {
  Plus,
  X,
  AtSign,
  Link,
  Globe,
  ArrowRight,
} from "lucide-react";

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

  const [showActions, setShowActions] = useState(false);

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
    <button
      onClick={() => setShowActions(!showActions)}
      className="
        w-10 h-10
        flex items-center justify-center
        text-purple-500
        transition-all duration-300
      "
    >
      {showActions ? (
        <X size={22} />
      ) : (
        <Plus size={22} />
      )}
    </button>

    <div
      className={`
        overflow-hidden
        transition-all duration-300 ease-in-out
        flex items-center gap-8

        ${
          showActions
            ? "max-w-[700px] opacity-100 ml-4"
            : "max-w-0 opacity-0"
        }
      `}
    >

      <div className="flex items-center gap-2 whitespace-nowrap">
        <AtSign size={18} className="text-slate-400" />

        <span className="font-medium">
          Select sources
        </span>
      </div>

      <div className="flex items-center gap-2 whitespace-nowrap">
        <Link size={18} className="text-slate-400" />

        <span className="font-medium">
          Upload Files
        </span>
      </div>

      <div className="flex items-center gap-3 whitespace-nowrap">
        <Globe size={18} className="text-slate-400" />

        <span className="font-medium">
          Search Web
        </span>

        <Switch checked />
      </div>

    </div>

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