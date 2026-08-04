
import SidebarV2 from "../components/SidebarV2";
import SettingsPage from "../pages/SettingsPage";
import UploadFilesPage from "../pages/UploadFilesPage";
import DashboardPage from "../pages/DashboardPage";
import UsersPage from "../pages/UsersPage";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";


export default function AppLayout() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
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
    | "upload"
    | "users"
    | "settings"
  >("home");

  const handleLogout = () => {
    authService.logout();
    navigate("/", { replace: true });
  };
  
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
      activePage={activePage}
      setActivePage={setActivePage}
      currentUser={currentUser}
      onLogout={handleLogout}
    />

      <main className="flex-1 min-h-0 overflow-hidden">

        {activePage === "home" && (
          <DashboardPage />
        )}

          
        {activePage === "upload" && (
          <UploadFilesPage />
        )}
        
        {activePage === "users" && currentUser?.role === "admin" && (
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
