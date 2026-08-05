import { useState } from "react";
import {
  ChevronLeft,
  FileUp,
  Home,
  LogOut,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
  UserCog,
  X,
} from "lucide-react";
import type { AuthUser } from "../types/auth";
import type { AppPage } from "../layouts/AppLayout";
import { useTranslation } from "react-i18next";

interface SidebarV2Props {
  currentUser: AuthUser | null;
  activePage: AppPage;
  mobileOpen: boolean;
  setActivePage: (page: AppPage) => void;
  onCloseMobile: () => void;
  onLogout: () => void;
}

const recentChats = ["Quarterly report insights", "Product research summary", "Onboarding policy review"];

export default function SidebarV2({
  activePage,
  currentUser,
  mobileOpen,
  onCloseMobile,
  onLogout,
  setActivePage,
}: SidebarV2Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const labels = isFa
    ? { home: "فضای کاری", upload: "پایگاه دانش", users: "اعضای تیم", settings: "تنظیمات", newChat: "گفتگوی جدید", recent: "اخیر", collapse: "جمع‌کردن منو", account: "حساب" }
    : { home: "Workspace", upload: "Knowledge base", users: "Team members", settings: "Settings", newChat: "New conversation", recent: "Recent", collapse: "Collapse sidebar", account: "account" };
  const navigation = [
    { id: "home" as const, label: labels.home, icon: Home },
    { id: "upload" as const, label: labels.upload, icon: FileUp },
    ...(currentUser?.role === "admin" ? [{ id: "users" as const, label: labels.users, icon: UserCog }] : []),
    { id: "settings" as const, label: labels.settings, icon: Settings },
  ];

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onCloseMobile}
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity md:hidden ${mobileOpen ? "visible opacity-100" : "invisible opacity-0"}`}
      />
      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-50 flex h-[100dvh] flex-col border-r border-white/[.09] transition-[width,transform] duration-300 md:relative md:z-30 ${collapsed ? "md:w-[88px]" : "md:w-[272px]"} w-[286px] ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className={`flex h-20 shrink-0 items-center ${collapsed ? "md:justify-center md:px-3" : "justify-between px-5"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#8f78d8]/30 bg-[#32127A] shadow-[0_0_28px_rgba(50,18,122,.4)]">
              <Sparkles size={19} />
            </span>
            <div className={`${collapsed ? "md:hidden" : "block"} min-w-0`}>
              <p className="truncate text-sm font-semibold tracking-[-.02em]">KnowledgeFlow</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[.16em] text-white/35">RAG Workspace</p>
            </div>
          </div>
          <button type="button" onClick={onCloseMobile} className="app-icon-button grid size-9 place-items-center rounded-lg md:hidden" aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={() => setActivePage("home")}
            className={`flex h-12 w-full items-center rounded-xl bg-[#32127A] text-sm font-semibold shadow-[0_12px_32px_rgba(50,18,122,.3)] transition hover:bg-[#43208F] ${collapsed ? "md:justify-center md:px-0" : "gap-3 px-4"}`}
          >
            <MessageSquareText size={18} />
            <span className={collapsed ? "md:hidden" : "block"}>{labels.newChat}</span>
          </button>
        </div>

        <nav className="mt-6 space-y-1.5 px-3" aria-label="Primary navigation">
          {navigation.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={collapsed ? label : undefined}
              onClick={() => setActivePage(id)}
              className={`group flex h-11 w-full items-center rounded-xl text-sm transition ${collapsed ? "md:justify-center md:px-0" : "gap-3 px-4"} ${activePage === id ? "border border-white/[.1] bg-white/[.09] text-white shadow-[inset_0_1px_rgba(255,255,255,.07)]" : "border border-transparent text-white/45 hover:bg-white/[.05] hover:text-white/85"}`}
            >
              <Icon size={18} className={activePage === id ? "text-[#a995eb]" : "transition group-hover:text-[#a995eb]"} />
              <span className={collapsed ? "md:hidden" : "block"}>{label}</span>
            </button>
          ))}
        </nav>

        <div className={`${collapsed ? "md:hidden" : "block"} mt-7 min-h-0 flex-1 overflow-y-auto px-5`}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-white/25">{labels.recent}</span>
            <ChevronLeft size={14} className="rotate-180 text-white/20" />
          </div>
          <div className="space-y-1">
            {recentChats.map((chat) => (
              <button key={chat} type="button" className="w-full truncate rounded-lg px-2 py-2.5 text-left text-xs text-white/40 transition hover:bg-white/[.04] hover:text-white/75">
                {chat}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto border-t border-white/[.07] p-3">
          <div className={`mb-2 flex items-center rounded-xl border border-white/[.07] bg-white/[.035] p-2 ${collapsed ? "md:justify-center" : "gap-3"}`}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#5b35b8] to-[#241052] text-xs font-bold uppercase">
              {currentUser?.username.slice(0, 2) ?? "U"}
            </span>
            <div className={`${collapsed ? "md:hidden" : "block"} min-w-0 flex-1`}>
              <p className="truncate text-xs font-semibold">{currentUser?.username ?? "User"}</p>
              <p className="mt-0.5 text-[10px] capitalize text-white/35">{currentUser?.role ?? "user"} {labels.account}</p>
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
