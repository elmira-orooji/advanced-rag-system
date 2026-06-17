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
      
 export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  return (

    <motion.div
  className="
    h-full
    overflow-hidden
    bg-[#F6F8FC]
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

  <h2 className="mt-3 text-2xl font-bold">
    Sam Smith
  </h2>

  <p className="mt-1 text-slate-500 text-xl">
    {t("productManager")}
  </p>

  <div className="w-full max-w-sm mt-10">
  <p className="text-slate-500 mb-3 px-3">
    {t("language")}
  </p>

  <div className="flex rounded-2xl border border-slate-200 p-1">
<button
  onClick={() => {
    i18n.changeLanguage("en");
    localStorage.setItem("lang", "en");
  }}
  className="
    flex-1
    h-11
    rounded-xl
    bg-blue-50
    text-blue-600
    font-medium
  "
>
  English
</button>
<button
  onClick={() => {
    i18n.changeLanguage("fa");
    localStorage.setItem("lang", "fa");
  }}
  className="
    flex-1
    h-11
    rounded-xl
  "
>
  فارسی
</button>
  </div>
</div>

<div className="w-full max-w-sm mt-6">
  <p className="text-slate-500 mb-3 px-3">
    Theme
  </p>

  <div className="flex rounded-2xl border border-slate-200 p-1">
    <button
      className="
        flex-1
        h-11
        rounded-xl
        bg-blue-50
        text-blue-600
        font-medium
      "
    >
      Light
    </button>

    <button
      className="
        flex-1
        h-11
        rounded-xl
      "
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
  border-1
  border-slate-200

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
                    text-green-500
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
                <div className="px-8 py-6 border-t border-slate-200">
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
    
      
      
      
     