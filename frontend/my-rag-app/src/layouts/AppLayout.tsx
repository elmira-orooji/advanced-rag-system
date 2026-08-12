import { useEffect, useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

import SidebarV2 from "../components/SidebarV2";
import DashboardPage from "../pages/DashboardPage";
import SettingsPage from "../pages/SettingsPage";
import UploadFilesPage from "../pages/UploadFilesPage";
import UsersPage from "../pages/UsersPage";
import AssistantsPage from "../pages/AssistantsPage";
import { authService } from "../services/authService";

export type AppPage = "home" | "upload" | "assistants" | "users" | "settings";

export default function AppLayout() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [activePage, setActivePage] = useState<AppPage>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const selectPage = (page: AppPage) => {
    setActivePage(page);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    authService.logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="app-shell flex h-[100dvh] overflow-hidden bg-[#050507] text-white">
      <SidebarV2
        activePage={activePage}
        currentUser={currentUser}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
        setActivePage={selectPage}
      />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="app-orb absolute -right-24 -top-28 size-[28rem] rounded-full bg-[#32127A]/25 blur-[120px]" />
          <div className="app-orb app-orb-delayed absolute -bottom-36 left-[12%] size-[30rem] rounded-full bg-[#8f78d8]/10 blur-[140px]" />
          <div className="app-grid absolute inset-0" />
        </div>

        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-white/[.07] bg-black/20 px-4 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            className="app-icon-button grid size-10 place-items-center rounded-xl"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-[#32127A] shadow-[0_0_24px_rgba(50,18,122,.45)]">
              <Sparkles size={16} />
            </span>
            KnowledgeFlow
          </div>
          <span className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[.06] text-xs font-bold uppercase">
            {currentUser?.username.slice(0, 2) ?? "U"}
          </span>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
          {activePage === "home" && <DashboardPage username={currentUser?.username ?? "there"} />}
          {activePage === "upload" && <UploadFilesPage />}
          {activePage === "assistants" && <AssistantsPage />}
          {activePage === "users" && currentUser?.role === "admin" && <UsersPage />}
          {activePage === "settings" && <SettingsPage theme={theme} setTheme={setTheme} />}
        </main>
      </section>
    </div>
  );
}
