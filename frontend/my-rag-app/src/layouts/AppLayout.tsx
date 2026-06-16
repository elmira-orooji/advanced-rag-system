import type { ReactNode } from "react";
import SidebarV2 from "../components/SidebarV2";
import { useChatHistory } from "../hooks/useChatHistory";
import { useState } from "react";
import UploadFilesPage from "../pages/UploadFilesPage";
import DashboardPage from "../pages/DashboardPage";
import TasksPage from "../pages/TasksPage";
interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
  } = useChatHistory();

  const [activePage, setActivePage] =
  useState<"home" | "tasks" | "upload">("home");
  
  return (
    <div className="flex h-screen bg-[#F6F8FC]">
    <SidebarV2
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelectChat={setActiveSessionId}
      activePage={activePage}
      setActivePage={setActivePage}
    />

      <main className="flex-1 min-h-0 overflow-hidden">

        {activePage === "home" && (
          <DashboardPage />
        )}

          {activePage === "tasks" && (
            <TasksPage />
          )}
          
        {activePage === "upload" && (
          <UploadFilesPage />
        )}

      </main>
    </div>
  );
}