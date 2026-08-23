import { useState } from "react";
import {
  ChevronLeft,
  Bot,
  FileUp,
  Home,
  LogOut,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UserCog,
  X,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import type { AuthUser } from "../types/auth";
import type { AppPage } from "../layouts/AppLayout";
import { useTranslation } from "react-i18next";
import type { ConversationSummary } from "../services/conversationService";

interface SidebarV2Props {
  currentUser: AuthUser | null;
  activePage: AppPage;
  mobileOpen: boolean;
  setActivePage: (page: AppPage) => void;
  onCloseMobile: () => void;
  onLogout: () => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (item: ConversationSummary) => void;
  onDeleteConversation: (item: ConversationSummary) => void;
}

export default function SidebarV2({
  activePage,
  currentUser,
  mobileOpen,
  onCloseMobile,
  onLogout,
  setActivePage,
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}: SidebarV2Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuQuery, setMenuQuery] = useState("");
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const labels = isFa
    ? { home: "فضای کاری", upload: "پایگاه دانش", assistants: "دستیارها", users: "اعضای تیم", settings: "تنظیمات", newChat: "گفتگوی جدید", recent: "اخیر", navigation: "منوی اصلی", search: "جست‌وجو...", collapse: "جمع‌کردن منو", account: "حساب" }
    : { home: "Workspace", upload: "Knowledge base", assistants: "Assistants", users: "Team members", settings: "Settings", newChat: "New conversation", recent: "Recent", navigation: "Navigation", search: "Search...", collapse: "Collapse sidebar", account: "account" };
  const navigation = [
    { id: "home" as const, label: labels.home, icon: Home },
    { id: "upload" as const, label: labels.upload, icon: FileUp },
    { id: "assistants" as const, label: labels.assistants, icon: Bot },
    ...(currentUser?.role === "admin" ? [{ id: "users" as const, label: labels.users, icon: UserCog }] : []),
    { id: "settings" as const, label: labels.settings, icon: Settings },
  ];
  const normalizedQuery = menuQuery.trim().toLocaleLowerCase();
  const visibleNavigation = normalizedQuery ? navigation.filter((item) => item.label.toLocaleLowerCase().includes(normalizedQuery)) : navigation;
  const visibleConversations = normalizedQuery ? conversations.filter((item) => item.title.toLocaleLowerCase().includes(normalizedQuery)) : conversations;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? "visible opacity-100" : "invisible opacity-0"}`}
      />
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-[100dvh] flex-col border-r border-[#213157] transition-[width,transform] duration-300 md:relative md:z-30 ${collapsed ? "md:w-[88px]" : "md:w-[272px]"} w-[286px] ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className={`flex h-[76px] shrink-0 items-center ${collapsed ? "md:justify-center md:px-3" : "justify-between px-5"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg">
              <img src="/brand/nexora-symbol.svg" alt="" className="size-8" />
            </span>
            <div className={`${collapsed ? "md:hidden" : "block"} min-w-0`}>
              <p className="truncate text-[15px] font-semibold tracking-[-.025em]">Nexora</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[.15em] text-[#7180a2]">Knowledge intelligence</p>
            </div>
          </div>
          <button type="button" onClick={onCloseMobile} className="app-icon-button grid size-9 place-items-center rounded-lg md:hidden" aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className={`${collapsed ? "md:hidden" : "block"} px-4 pb-4`}>
          <label className="sidebar-search relative block">
            <Search size={14} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#7585aa]" />
            <input value={menuQuery} onChange={(event) => setMenuQuery(event.target.value)} placeholder={labels.search} className="h-10 w-full rounded-lg border border-[#22335d] bg-[#0c1838] ps-10 pe-3 text-[11px] text-white outline-none placeholder:text-[#6e7b99]" />
          </label>
        </div>

        <div className="px-4">
          <button
            type="button"
            onClick={onNewConversation}
            className={`sidebar-primary-action flex h-11 w-full items-center rounded-lg text-[12px] font-semibold transition ${collapsed ? "md:justify-center md:px-0" : "gap-3 px-3.5"}`}
          >
            <MessageSquareText size={18} />
            <span className={collapsed ? "md:hidden" : "block"}>{labels.newChat}</span>
          </button>
        </div>

        <nav className="mt-6 space-y-1 px-4" aria-label="Primary navigation">
          <p className={`${collapsed ? "md:hidden" : "block"} mb-2 px-2 text-[9px] font-medium uppercase tracking-[.14em] text-[#657493]`}>{labels.navigation}</p>
          {visibleNavigation.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={collapsed ? label : undefined}
              onClick={() => setActivePage(id)}
              className={`sidebar-nav-item group relative flex h-10 w-full items-center rounded-lg text-[12px] transition ${collapsed ? "md:justify-center md:px-0" : "gap-3 px-3"} ${activePage === id ? "is-active text-white" : "border border-transparent text-[#92a0bf] hover:text-white"}`}
            >
              <Icon size={18} className={activePage === id ? "text-[#18c7f4]" : "transition group-hover:text-[#c43cff]"} />
              <span className={collapsed ? "md:hidden" : "block"}>{label}</span>
            </button>
          ))}
        </nav>

        <div className={`${collapsed ? "md:hidden" : "block"} mt-7 min-h-0 flex-1 overflow-y-auto px-4`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">{labels.recent}</span>
            <ChevronLeft size={14} className="rotate-180 text-white/20" />
          </div>
          <div className="space-y-1">
            {visibleConversations.map((chat) => (
              <div key={chat.id} className={`group flex items-center rounded-lg transition ${activeConversationId === chat.id ? "bg-white/[.07]" : "hover:bg-white/[.04]"}`}>
                <button onClick={() => onSelectConversation(chat.id)} type="button" title={chat.title} className="min-w-0 flex-1 truncate px-2 py-2.5 text-left text-xs text-white/45 transition group-hover:text-white/75">{chat.title}</button>
                <button onClick={() => onRenameConversation(chat)} aria-label="Rename conversation" className="grid size-7 shrink-0 place-items-center text-white/0 transition group-hover:text-white/35 hover:!text-[#d9a6ff]"><Pencil size={12} /></button>
                <button onClick={() => onDeleteConversation(chat)} aria-label="Delete conversation" className="grid size-7 shrink-0 place-items-center text-white/0 transition group-hover:text-white/35 hover:!text-rose-300"><Trash2 size={12} /></button>
              </div>
            ))}
            {!visibleConversations.length && <p className="px-2 py-3 text-[11px] text-[#687693]">{normalizedQuery ? (isFa ? "نتیجه‌ای پیدا نشد" : "No results found") : (isFa ? "هنوز گفتگویی وجود ندارد" : "No conversations yet")}</p>}
          </div>
        </div>

        <div className="mt-auto border-t border-[#213157] p-3">
          <div className={`mb-1 flex items-center rounded-lg p-2 transition hover:bg-[#101d3d] ${collapsed ? "md:justify-center" : "gap-3"}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#c43cff] via-[#7c27ff] to-[#1b4dff] text-xs font-bold uppercase shadow-[0_8px_24px_rgba(124,39,255,.24)]">
              {currentUser?.username.slice(0, 2) ?? "U"}
            </span>
            <div className={`${collapsed ? "md:hidden" : "block"} min-w-0 flex-1`}>
              <p className="truncate text-xs font-semibold">{currentUser?.username ?? "User"}</p>
              <p className="mt-0.5 truncate text-[10px] capitalize text-white/35">{currentUser?.organization_name ?? "Workspace"} · {currentUser?.role ?? "user"}</p>
            </div>
            <button type="button" onClick={onLogout} aria-label="Log out" className={`${collapsed ? "md:hidden" : "grid"} app-icon-button size-8 place-items-center rounded-lg text-white/35 hover:text-rose-300`}>
              <LogOut size={15} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-white/30 transition hover:bg-white/[.04] hover:text-white/65 md:flex"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            {!collapsed && <span>{labels.collapse}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

