import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

import SidebarV2 from "../components/SidebarV2";
import SettingsPage from "../pages/SettingsPage";
import UploadFilesPage from "../pages/UploadFilesPage";
import UsersPage from "../pages/UsersPage";
import AssistantsPage from "../pages/AssistantsPage";
import AnalyticsPage from "../pages/AnalyticsPage";
import ConversationPage from "../pages/ConversationPage";
import { authService } from "../services/authService";
import { conversationService, type ConversationSummary } from "../services/conversationService";
import toast from "react-hot-toast";

export type AppPage = "home" | "chat" | "upload" | "assistants" | "users" | "settings";

export default function AppLayout() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [activePage, setActivePage] = useState<AppPage>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const loadConversations = () => {
    conversationService.list().then(setConversations).catch((error) => toast.error((error as Error).message));
  };

  useEffect(() => { loadConversations(); }, []);

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

  const newConversation = () => {
    setActiveConversationId(null);
    selectPage("chat");
  };

  const selectConversation = (id: string) => {
    setActiveConversationId(id);
    selectPage("chat");
  };

  const renameConversation = async (item: ConversationSummary) => {
    const title = window.prompt("Conversation title", item.title)?.trim();
    if (!title || title === item.title) return;
    try { await conversationService.rename(item.id, title); loadConversations(); }
    catch (error) { toast.error((error as Error).message); }
  };

  const deleteConversation = async (item: ConversationSummary) => {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    try {
      await conversationService.remove(item.id);
      if (activeConversationId === item.id) { setActiveConversationId(null); setActivePage("chat"); }
      loadConversations();
      toast.success("Conversation deleted");
    } catch (error) { toast.error((error as Error).message); }
  };

  return (
    <div className="app-shell flex h-[100dvh] overflow-hidden text-white">
      <SidebarV2
        activePage={activePage}
        currentUser={currentUser}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
        setActivePage={selectPage}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={newConversation}
        onSelectConversation={selectConversation}
        onRenameConversation={(item) => void renameConversation(item)}
        onDeleteConversation={(item) => void deleteConversation(item)}
      />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="app-orb absolute -right-24 -top-28 size-[30rem] rounded-full bg-[#7c27ff]/15 blur-[130px]" />
          <div className="app-orb app-orb-delayed absolute -bottom-36 left-[12%] size-[32rem] rounded-full bg-[#18c7f4]/10 blur-[150px]" />
          <div className="app-grid absolute inset-0" />
        </div>

        <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#213157] bg-[#09132a]/80 px-4 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation"
            className="app-icon-button grid size-10 place-items-center rounded-xl"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-8 place-items-center rounded-lg border border-[#c43cff]/20 bg-[#15123a] shadow-[0_0_24px_rgba(124,39,255,.3)]">
              <img src="/brand/nexora-symbol.svg" alt="" className="size-5" />
            </span>
            Nexora
          </div>
          <span className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[.06] text-xs font-bold uppercase">
            {currentUser?.username.slice(0, 2) ?? "U"}
          </span>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-hidden">
          {activePage === "home" && (currentUser?.role === "admin" ? <AnalyticsPage /> : <ConversationPage conversationId={activeConversationId} onConversationChange={setActiveConversationId} onConversationsUpdated={loadConversations} />)}
          {activePage === "chat" && <ConversationPage conversationId={activeConversationId} onConversationChange={setActiveConversationId} onConversationsUpdated={loadConversations} />}
          {activePage === "upload" && <UploadFilesPage />}
          {activePage === "assistants" && <AssistantsPage />}
          {activePage === "users" && currentUser?.role === "admin" && <UsersPage />}
          {activePage === "settings" && <SettingsPage theme={theme} setTheme={setTheme} />}
        </main>
      </section>
    </div>
  );
}
