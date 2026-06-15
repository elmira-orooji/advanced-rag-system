import type { ReactNode } from "react";
import SidebarV2 from "../components/SidebarV2";
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
  } = useChatHistory();

  return (
    <div className="flex h-screen bg-[#F6F8FC]">
      <SidebarV2
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectChat={setActiveSessionId}
    
      />

      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}