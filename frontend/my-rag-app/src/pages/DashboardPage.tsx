import { useState } from "react";
import { useEffect } from "react";
import ChatInput from "../components/ChatInput";
import {
  useChatHistory,
} from "../hooks/useChatHistory";
import ChatWindow from "../components/ChatWindow";



export default function HomePage() {

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

         {/* Top Cards */}
         <div className="grid grid-cols-2 gap-6"></div>

          {/* Card 1 */}
         <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">

        <p className="text-sm text-slate-400 mb-4">
          Previously viewed files
        </p>

        <div className="space-y-3">

          <p>Miro - Product Analytics and Statistics</p>

          <p>Figma - UX Research</p>

          <p>R2 Strategic Goals & Objectives.pdf</p>

        </div>

      </div>


      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

  <div className="bg-white rounded-3xl p-6 shadow-sm">
    <h3 className="font-semibold text-slate-900">
      Recent Documents
    </h3>

    <p className="text-slate-500 mt-2">
      12 files uploaded this week
    </p>
  </div>

  <div className="bg-white rounded-3xl p-6 shadow-sm">
    <h3 className="font-semibold text-slate-900">
      Pending Tasks
    </h3>

    <p className="text-slate-500 mt-2">
      3 tasks need attention
    </p>
  </div>

  <div className="bg-white rounded-3xl p-6 shadow-sm">
    <h3 className="font-semibold text-slate-900">
      Knowledge Base
    </h3>

    <p className="text-slate-500 mt-2">
      142 indexed documents
    </p>
  </div>

</section>

      <ChatWindow
        messages={activeSession?.messages ?? []}
        isThinking={isThinking}
      />

      <div className="mt-auto sticky bottom-0 pb-4">
      <ChatInput
        disabled={isThinking}
        onSend={handleSendMessage}
      />
    </div>

    </main>
  </>
)}