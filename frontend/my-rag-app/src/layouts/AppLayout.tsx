import type { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

import { useChatHistory } from "../hooks/useChatHistory";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({
  children,
}: AppLayoutProps) {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
    createNewChat,
    deleteChat,
  } = useChatHistory();

  return (
    <div className="flex min-h-screen bg-[#F6F8FC]">
      <Sidebar
        darkMode={false}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectChat={setActiveSessionId}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        onOpenUpload={() => {}}
        />

      <main
        className="
          flex-1
          px-10
          py-8
          overflow-y-auto
        "
      >
        {children}
      </main>
    </div>
  );
}