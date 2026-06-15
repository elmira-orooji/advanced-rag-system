import { useState } from "react";
import {
  Plus,
  X,
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

    <AnimatePresence>

  {showActions && (

    <motion.div
      initial={{
        width: 0,
        opacity: 0,
      }}

      animate={{
        width: "auto",
        opacity: 1,
      }}

      exit={{
        width: 0,
        opacity: 0,
      }}

      transition={{
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      }}

      className="
        flex
        items-center
        gap-8
        overflow-hidden
        ml-4
      "
    >

      <motion.div
        initial={{
          opacity: 0,
          x: -10,
        }}

        animate={{
          opacity: 1,
          x: 0,
        }}

        transition={{
          delay: 0.15,
          duration: 0.3,
        }}

        className="
          flex
          items-center
          gap-2
          whitespace-nowrap
        "
      >
        <AtSign
          size={18}
          className="text-slate-400"
        />

        <span className="font-medium">
          Select sources
        </span>
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
          x: -10,
        }}

        animate={{
          opacity: 1,
          x: 0,
        }}

        transition={{
          delay: 0.25,
          duration: 0.3,
        }}

        className="
          flex
          items-center
          gap-2
          whitespace-nowrap
        "
      >
        <Link
          size={18}
          className="text-slate-400"
        />

        <span className="font-medium">
          Upload Files
        </span>
      </motion.div>

      <motion.div
        initial={{
          opacity: 0,
          x: -10,
        }}

        animate={{
          opacity: 1,
          x: 0,
        }}

        transition={{
          delay: 0.35,
          duration: 0.3,
        }}

        className="
          flex
          items-center
          gap-3
          whitespace-nowrap
        "
      >
        <Globe
          size={18}
          className="text-slate-400"
        />

        <span className="font-medium">
          Search Web
        </span>

        <div className="
          w-11
          h-6
          rounded-full
          bg-green-500
          relative
        ">
          <div className="
            absolute
            top-0.5
            right-0.5
            w-5
            h-5
            rounded-full
            bg-white
          " />
        </div>

      </motion.div>

    </motion.div>

  )}

</AnimatePresence>

{/* Divider */}
<div className="w-px h-6 bg-slate-200 mx-6" />

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

</div>
);
}