import { useState } from "react";
import { useEffect } from "react";
import ChatInput from "../components/ChatInput";
import TasksPage from "../pages/TasksPage";
import { motion } from "framer-motion";
import {
  useChatHistory,
} from "../hooks/useChatHistory";
import ChatWindow from "../components/ChatWindow";
import { Search,ArrowRight,ListTodo} from "lucide-react";


export default function DasboardPage() {
  

  const [isThinking,setIsThinking, ] = useState(false);
  
  const {
  sessions,
  activeSession,
  activeSessionId,
  createNewChat,

  addMessage,
 } = useChatHistory();

  useEffect(() => {
  if (sessions.length === 0) {
    createNewChat();
   }
  }, [sessions.length]);

const handleSendMessage = (
  content: string
) => {
  if (!activeSessionId)
    return;

  const userMessage = {
    id: crypto.randomUUID(),

    role: "user" as const,

    content,

    createdAt:
      new Date().toISOString(),
  };

  addMessage(
    activeSessionId,
    userMessage
  );

  setIsThinking(true);

  setTimeout(() => {
    addMessage(
      activeSessionId,
      {
        id: crypto.randomUUID(),

        role:
          "assistant" as const,

        content:
          "KnowledgeFlow AI analyzed your documents and generated this mock response.",

        createdAt:
          new Date().toISOString(),

        sources: [
          {
            id: "1",

            title:
              "annual_report.pdf",
          },

          {
            id: "2",

            title:
              "research_notes.docx",
          },
        ],
      }
    );

    setIsThinking(false);
  }, 1500);
};

  return (
  <>
  return (
  <motion.div
    initial={{
      opacity: 0,
      y: 20,
      filter: "blur(8px)",
    }}
    animate={{
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
    }}
    transition={{
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    }}
    className="flex-1 p-8"
  >
    <main className="flex-1 p-8 flex flex-col gap-8">

       {/* Header */}
    <div className="mb-12">
    <h1 className="text-6xl font-bold text-[#3B82F6]">
      Welcome, Sam! 👋
    </h1>

      <p className="mt-3 text-4xl font-medium text-slate-400">
        How can I help you today?
      </p>
    </div>

      <ChatWindow
        messages={activeSession?.messages ?? []}
        isThinking={isThinking}
      />

      <div className="mt-auto sticky bottom-0 pb-4">
      <div className="mt-16">
        <ChatInput
          disabled={isThinking}
          onSend={handleSendMessage}
        />
      </div>
    </div>

    </main>
    </motion.div>
  </>
)}