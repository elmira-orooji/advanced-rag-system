import { useState } from "react";
import { useEffect } from "react";
import ChatInput from "../components/ChatInput";
import {
  useChatHistory,
} from "../hooks/useChatHistory";
import ChatWindow from "../components/ChatWindow";
import { Search,ArrowRight} from "lucide-react";


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
  <div className="h-full flex flex-col">
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


  {/* Tasks */}
    <div
        className="
        rounded-3xl
        bg-white
        p-6
        border
        border-slate-100
        shadow-sm
        space-y-3
      "
    >


  {/* Task Header */}
  <div className="flex items-center justify-between mb-6">

  <div className="flex items-center gap-5">

    <h2 className="text-2xl font-semibold flex items-center">
      My Tasks

      <span className="ml-2 text-slate-400 font-normal text-xl">
        13
      </span>
    </h2>

    <div className="relative w-[190px]">
      <Search
        size={16}
        className="
          absolute
          left-4
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
      />
      
      <input
        placeholder="Search ..."
        className="
          w-full
          h-10
          rounded-full
          border border-slate-200
          bg-white
          pl-10
          pr-10
          text-sm
          placeholder:text-slate-400
          outline-none
          focus:ring-2
          focus:ring-slate-100
        "
      />

      <button
        className="
          absolute
          right-2
          top-1/2
          -translate-y-1/2

          w-8
          h-8

          rounded-full
          bg-slate-100

          flex
          items-center
          justify-center

          hover:bg-slate-200
          transition-all
          duration-300

          shrink-0
        "
      >
        <ArrowRight
          size={16}
          className="text-slate-500"
        />
      </button>
    </div>

  </div>

</div>


    {/* Task 1 */}
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-orange-500" />

      <span>Design Meeting</span>

      <span
        className="
          rounded-full
          bg-slate-100
          px-3
          py-1
          text-sm
        "
      >
        2 pm
      </span>

      <span
        className="
          rounded-full
          bg-purple-100
          text-purple-600
          px-3
          py-1
          text-sm
        "
      >
        Join now
      </span>
    </div>

    {/* Task 2 */}
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-red-500" />

      <span>
        Refine UI components based on user feedback
      </span>

      <span
        className="
          rounded-full
          bg-red-100
          text-red-600
          px-3
          py-1
          text-sm
        "
      >
        Urgent
      </span>

      <span
        className="
          rounded-full
          bg-red-50
          text-red-500
          px-3
          py-1
          text-sm
        "
      >
        By today
      </span>
    </div>

    {/* Task 3 */}
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-blue-500" />

      <span>
        Prepare a prototype for usability testing
      </span>

      <span
        className="
          rounded-full
          bg-blue-100
          text-blue-600
          px-3
          py-1
          text-sm
        "
      >
        In progress
      </span>

      <span
        className="
          rounded-full
          bg-cyan-100
          text-cyan-600
          px-3
          py-1
          text-sm
        "
      >
        By tomorrow
      </span>
    </div>

    {/* Task 4 */}
    <div className="flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-blue-500" />

      <span>
        Collaborate with developers on implementation detail
      </span>

      <span
        className="
          rounded-full
          bg-slate-100
          text-slate-600
          px-3
          py-1
          text-sm
        "
      >
        To do
      </span>

      <span
        className="
          rounded-full
          bg-cyan-100
          text-cyan-600
          px-3
          py-1
          text-sm
        "
      >
        By tomorrow
      </span>
    </div>

  </div>


      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        <div
        className="
          rounded-3xl
          bg-white
          p-6
          border
          border-slate-100
          shadow-sm

          transition-all
          duration-500
          ease-out

          hover:-translate-y-2
          hover:scale-[1.02]
          hover:bg-[#9FD7FF]
          hover:shadow-xl

          cursor-pointer
        "
      >
    <h3 className="font-semibold text-slate-900">
      Recent Documents
    </h3>

    <p className="text-slate-500 mt-2">
      12 files uploaded this week
    </p>
  </div>

          <div
        className="
          rounded-3xl
          bg-white
          p-6
          border
          border-slate-100
          shadow-sm

          transition-all
          duration-500
          ease-out

          hover:-translate-y-2
          hover:scale-[1.02]
          hover:bg-[#9FD7FF]
          hover:shadow-xl

          cursor-pointer
        "
      >
    <h3 className="font-semibold text-slate-900">
      Pending Tasks
    </h3>

    <p className="text-slate-500 mt-2">
      3 tasks need attention
    </p>
  </div>

          <div
        className="
          rounded-3xl
          bg-white
          p-6
          border
          border-slate-100
          shadow-sm

          transition-all
          duration-500
          ease-out

          hover:-translate-y-2
          hover:scale-[1.02]
          hover:bg-[#9FD7FF]
          hover:shadow-xl

          cursor-pointer
        "
      >
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
    </div>
  </>
)}