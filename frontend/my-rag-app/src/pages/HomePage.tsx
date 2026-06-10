import { useState } from "react";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatInput from "../components/ChatInput";
import {
  useChatHistory,
} from "../hooks/useChatHistory";
import {
  Search,
  Send,
} from "lucide-react";
import ChatWindow from "../components/ChatWindow";



export default function HomePage() {
  const [darkMode] = useState(true);
  const [isThinking,setIsThinking, ] = useState(false);
  const [query, setQuery] = useState("");


  const {
  sessions,
  activeSession,
  activeSessionId,
  createNewChat,
  deleteChat,
  setActiveSessionId,
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
    <div
      className={`flex min-h-screen transition-colors ${
        darkMode ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-800"
      }`}
    >
<Sidebar
  darkMode={darkMode}
  sessions={sessions}
  activeSessionId={activeSessionId}
  onSelectChat={setActiveSessionId}
  onNewChat={createNewChat}
  onDeleteChat={deleteChat}
/>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, <span className="text-blue-500">Analyst</span> 👋
          </h1>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 transition rounded-lg text-white">
            New Report
          </button>
        </div>

        {/* Search Box */}
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-md transition-all ${
            darkMode
              ? "bg-slate-800 border border-slate-700"
              : "bg-white border border-slate-200"
          }`}
        >
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            placeholder="Ask anything about your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base"
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 transition text-white p-2 rounded-xl"
          >
            <Send size={20} />
          </button>
          </div>
  <ChatWindow
  messages={
    activeSession?.messages ?? []
  }
  isThinking={isThinking}
/>

<ChatInput
  disabled={isThinking}
  onSend={
    handleSendMessage
  }
/>

        {/* Insight Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Documents Analyzed",
              value: "1,240",
              color: "bg-gradient-to-r from-blue-500 to-indigo-500",
            },
            {
              title: "Knowledge Graphs",
              value: "312",
              color: "bg-gradient-to-r from-purple-500 to-pink-500",
            },
            {
              title: "Search Queries",
              value: "24K",
              color: "bg-gradient-to-r from-green-500 to-emerald-500",
            },
          ].map(({ title, value, color }, i) => (
            <div
              key={i}
              className={`rounded-2xl p-6 text-white ${color} shadow-lg hover:scale-[1.02] active:scale-[0.99] transition-transform`}
            >
              <p className="text-sm opacity-90">{title}</p>
              <h3 className="text-3xl font-semibold mt-2">{value}</h3>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
