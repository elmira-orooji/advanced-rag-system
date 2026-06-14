import { useState } from "react";
import { useEffect } from "react";
import { Search } from "lucide-react";
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

      {/* Card 2 */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">

  <p className="text-sm text-slate-400 mb-4">
    Summarize your last meeting
  </p>

  <h3 className="font-semibold text-xl">
    UX Strategy Meet up
  </h3>

  <p className="text-slate-400 mt-2">
    1 Apr 2025, 14:00 pm
  </p>

</div>

      {/* Card 3 */}

      <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">

  <p className="text-sm text-slate-400 mb-4">
    Suggested Task
  </p>

  <h3 className="font-semibold text-2xl">
    Conduct UX Research
  </h3>

</div>
 
      {/* Card 4 */}
      <div className="flex items-center justify-between mb-8">

  <div className="flex items-center gap-4">

    <h2 className="text-2xl font-semibold">
      My Tasks
      <span className="ml-2 text-slate-400 font-normal">
        13
      </span>
    </h2>

    <div className="relative">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        placeholder="Search for name..."
        className="
          w-64
          rounded-full
          border
          border-slate-200
          bg-white
          py-2
          pl-11
          pr-10
          text-sm
          outline-none
        "
      />

      <div className="
        absolute
        right-3
        top-1/2
        -translate-y-1/2
        w-5
        h-5
        rounded-full
        bg-slate-200
      " />
    </div>

  </div>

  <button
    className="
      rounded-full
      border
      border-purple-300
      px-5
      py-2
      text-purple-600
      hover:bg-purple-50
      transition
    "
  >
    Prioritize Tasks
  </button>

</div>

<div className="space-y-5">
  <div className="flex items-center gap-4">

  <div className="w-2 h-2 rounded-full bg-orange-500" />

  <span className="flex-1">
    Design Meeting
  </span>

  <span className="
    rounded-full
    bg-slate-100
    px-3
    py-1
    text-sm
  ">
    2 pm
  </span>

  <span className="
    rounded-full
    bg-purple-100
    text-purple-600
    px-3
    py-1
    text-sm
  ">
    Join now
  </span>

</div>

<div className="flex items-center gap-4">

  <div className="w-2 h-2 rounded-full bg-red-500" />

  <span className="flex-1">
    Refine UI components based on user feedback
  </span>

  <span className="
    rounded-full
    bg-red-100
    text-red-600
    px-3
    py-1
    text-sm
  ">
    Urgent
  </span>

  <span className="
    rounded-full
    bg-red-50
    text-red-500
    px-3
    py-1
    text-sm
  ">
    By today
  </span>

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