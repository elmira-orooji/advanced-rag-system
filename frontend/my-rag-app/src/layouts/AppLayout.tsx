
import SidebarV2 from "../components/SidebarV2";
import { useChatHistory } from "../hooks/useChatHistory";
import SettingsPage from "../pages/SettingsPage";
import UploadFilesPage from "../pages/UploadFilesPage";
import DashboardPage from "../pages/DashboardPage";
import TasksPage from "../pages/TasksPage";
import UsersPage from "../pages/UsersPage";
import { useEffect, useState } from "react";


export default function AppLayout() {
  const {
    sessions,
    activeSessionId,
    setActiveSessionId,
  } = useChatHistory();

  const [theme, setTheme] =
  useState<"light" | "dark">(
    () =>
      (localStorage.getItem("theme") as
        | "light"
        | "dark") || "light"
  );

const [activePage, setActivePage] =
  useState<
    | "home"
    | "tasks"
    | "upload"
    | "users"
    | "settings"
  >("home");
  
useEffect(() => {
  if (theme === "dark") {
    document.documentElement.classList.add(
      "dark"
    );
  } else {
    document.documentElement.classList.remove(
      "dark"
    );
  }

  localStorage.setItem(
    "theme",
    theme
  );
}, [theme]);


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
        
        {activePage === "users" && (
            <UsersPage />
          )}

          {activePage === "settings" && (
            <SettingsPage
              theme={theme}
              setTheme={setTheme}
            />
          )}

      </main>
    </div>
  );
}