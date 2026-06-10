import { useState } from "react";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import {
  useChatHistory,
} from "../hooks/useChatHistory";
import {
  Search,
  Send,
  Copy,
} from "lucide-react";



export default function HomePage() {
  const [darkMode] = useState(true);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  const {
  sessions,
  activeSessionId,
  createNewChat,
  deleteChat,
  setActiveSessionId,
 } = useChatHistory();

  useEffect(() => {
  if (sessions.length === 0) {
    createNewChat();
   }
  }, [sessions.length]);

  const handleAsk = () => {
    if (!query.trim()) return;
    setResponse("Analyzing your question with advanced RAG system...");
    setTimeout(() => {
      setResponse(
        "📊 Here’s your insight:\n\nThe model found strong correlations in the dataset between user engagement and content recency."
      );
    }, 1200);
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
            onClick={handleAsk}
            className="bg-blue-600 hover:bg-blue-700 transition text-white p-2 rounded-xl"
          >
            <Send size={20} />
          </button>
        </div>

        {/* AI Response Box */}
        {response && (
          <div
            className={`p-6 rounded-2xl backdrop-blur-md border shadow-lg transition hover:shadow-blue-500/10 whitespace-pre-line ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-300"
                : "bg-white border-slate-200 text-slate-700"
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <h2 className="font-bold text-blue-400">AI Response</h2>
              <button
                onClick={() => navigator.clipboard.writeText(response)}
                className="text-slate-400 hover:text-blue-500 transition"
              >
                <Copy size={18} />
              </button>
            </div>
            {response}
          </div>
        )}

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
