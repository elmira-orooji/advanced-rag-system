import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";     
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import {
  UploadCloud,
  FileText,
  Pencil,
  MessageSquare,
} from "lucide-react";

interface SettingsPageProps {
  theme: "light" | "dark";

  setTheme: (
    theme: "light" | "dark"
  ) => void;
}


 export default function SettingsPage({
  theme,
  setTheme,
}: SettingsPageProps) {
  const { t, i18n } = useTranslation();
  
  return (

    <motion.div
  className="
    h-full
    overflow-hidden

    
    bg-[#F6F8FC]
    dark:bg-[#151B2D]
  "
>
  <div className="grid grid-cols-12 h-full">
<div
  className="
    col-span-5
    flex
    flex-col
    items-center
    pt-12
  "
>
  <div className="relative">
    <img
      src="https://i.pravatar.cc/200"
      alt="Profile"
      className="
        w-28
        h-28
        rounded-full
        object-cover
        border-2
        border-white
      "
    />

    <button
      className="
        absolute
        bottom-0
        right-2
        w-8
        h-8
        rounded-full
        bg-blue-600
        text-white
        flex
        items-center
        justify-center
        shadow-lg
      "
    >
      <Pencil size={16} />
    </button>
  </div>

  <h2 className="mt-3
    text-2xl
    font-bold
    text-slate-900
    dark:text-slate-100">

    Sam Smith
  </h2>

  <p className="mt-1 text-slate-500 dark:text-slate-400 text-xl">
    {t("productManager")}
  </p>

  <div className="w-full max-w-sm mt-10">
  <p className="text-slate-500 dark:text-slate-300 mb-3 px-3">
    {t("language")}
  </p>

  <div className="flex rounded-2xl border border-slate-200 dark:border-[#334155] p-1">
<button
  onClick={() => {
    i18n.changeLanguage("en");
    localStorage.setItem("lang", "en");
  }}
  className={`
    flex-1
    h-11
    rounded-xl
    transition-all

    ${
      i18n.language === "en"
        ? `
          bg-[#24304A]
          text-cyan-300
          font-semibold
        `
        : `
          text-slate-600
          dark:text-slate-300
        `
    }
  `}
>
  English
</button>
<button
  onClick={() => {
    i18n.changeLanguage("fa");
    localStorage.setItem("lang", "fa");
  }}
  className={`
    flex-1
    h-11
    rounded-xl
    transition-all

    ${
      i18n.language === "fa"
        ? `
          bg-[#24304A]
          text-cyan-300
          font-semibold
        `
        : `
          text-slate-600
          dark:text-slate-300
        `
    }
  `}
>
  فارسی
</button>
  </div>
</div>

<div className="w-full max-w-sm mt-6">
  <p className="text-slate-500 dark:text-slate-300 mb-3 px-3">
    Theme
  </p>

  <div className="flex rounded-2xl border border-slate-200 dark:border-[#334155] p-1">
      <button
        onClick={() => setTheme("light")}
        className={`
          flex-1
          h-11
          rounded-xl
          transition-all
          dark:text-slate-300
          ${
            theme === "light"
              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-cyan-300 font-medium"
              : ""
          }
        `}
      >
        Light
      </button>

  <button
    onClick={() => setTheme("dark")}
    className={`
      flex-1
      h-11
      rounded-xl
      transition-all

      ${
        theme === "dark"
          ? "bg-[#24304A] text-cyan-300  dark:bg-blue-500/15 dark:text-cyan-300 font-medium"
          : "bg-blue-50 text-blue-600"
      }
    `}
  >
    Dark
  </button>
  </div>
</div>
</div>





         {/* Right Side - Chat */}
        <div className="col-span-7 h-screen">
          <div
className="
  bg-white
  dark:bg-[#1D263B]
  border-1
  border-slate-200
 dark:border-[#334155]

  h-full

  flex
  flex-col
"
          >
            {/* Header */}
            <div
              className="
                px-6
                py-5

                border-b
                border-slate-200
                dark:border-[#334155]

                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  w-12
                  h-12

                  rounded-2xl

                  bg-blue-100
                  dark:bg-[#24304A]
                  dark:text-cyan-300
                  flex
                  items-center
                  justify-center
                "
              >
                <MessageSquare
                  size={22}
                  className="text-blue-600"
                />
              </div>

              <div>
                <h2
                  className="
                    font-semibold
                    text-lg
                  "
                >
                  AI Assistant
                </h2>

                <p
                  className="
                    text-green-400
                    text-sm
                  "
                >
                  ● RAG Active
                </p>
              </div>
            </div>

                    {/* Existing Chat */}
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                    <ChatWindow
                        messages={[]}
                        isThinking={false}
                    />
                    </div>

                    {/* Existing Input */}
                <div className="px-8 py-6 border-t border-slate-200 ">
                <ChatInput
                    disabled={false}
                    onSend={() => {}}
                />
                </div>
          </div>
        </div>
    </div>
       </motion.div>
  );
}
    
      
      
      
     