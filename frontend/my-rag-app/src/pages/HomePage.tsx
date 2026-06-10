import { useState } from "react";
import { useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatInput from "../components/ChatInput";
import UploadPanel from "../components/UploadPanel";
import {
  useChatHistory,
} from "../hooks/useChatHistory";
import ChatWindow from "../components/ChatWindow";



export default function HomePage() {
  const [darkMode] = useState(true);
  const [isThinking,setIsThinking, ] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  

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
  onOpenUpload={() =>
    setShowUploadPanel(true)
  }
/>

      {/* Main Content */}
      <main className="flex-1 p-8 flex flex-col gap-8">
        {/* Header */}
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">
    KnowledgeFlow AI
  </h1>

  <p className="text-slate-400 mt-1">
    Enterprise Retrieval-Augmented
    Generation Platform
  </p>
        </div>
        
  {showUploadPanel && (
    <UploadPanel />
  )}

<ChatWindow
  messages={activeSession?.messages ?? []}
  isThinking={isThinking}
/>
{showUploadPanel && (
  <UploadPanel />
)}

<ChatInput
  disabled={isThinking}
  onSend={handleSendMessage}
/>
      </main>
    </div>
  );
}
