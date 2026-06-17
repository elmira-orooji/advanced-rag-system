import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";     
import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  MessageSquare,
} from "lucide-react";
      
      
      
      
      
      
      {/* Right Side - Chat */}
        <div className="col-span-7 h-screen">
          <div
className="
  bg-white
  border-l
  border-slate-200

  h-full

  flex
  flex-col
"
          >
            {/* Header */}
            <div
              className="
                px-8
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