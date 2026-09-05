import { BookOpen, Clock3, MessageSquareText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ConversationSummary } from "../services/conversationService";
import type { AuthUser } from "../types/auth";

interface WorkspacePageProps {
  currentUser: AuthUser | null;
  conversations: ConversationSummary[];
  onNewConversation: () => void;
  onOpenConversation: (id: string) => void;
  onOpenKnowledge: () => void;
}

export default function WorkspacePage({ currentUser, conversations, onNewConversation, onOpenConversation, onOpenKnowledge }: WorkspacePageProps) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const recentConversations = conversations.slice(0, 5);

  return <div dir={isFa ? "rtl" : "ltr"} className="h-full overflow-y-auto px-4 py-6 sm:px-7 lg:px-10">
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#caa1ff]">{isFa ? "فضای کاری" : "Workspace"}</span>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-.025em] sm:text-3xl">{isFa ? `خوش آمدید، ${currentUser?.username ?? "کاربر"}` : `Welcome back, ${currentUser?.username ?? "there"}`}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{isFa ? "گفتگوهای اخیر را ادامه دهید یا یک پرسش تازه را با منابع سازمانی شروع کنید." : "Continue a recent conversation or start a new question grounded in your organization’s knowledge."}</p>
        </div>
        <button type="button" onClick={onNewConversation} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#7c27ff] px-4 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(124,39,255,.3)] transition hover:bg-[#9238ff]"><Plus size={17} />{isFa ? "گفتگوی جدید" : "New conversation"}</button>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[.08] bg-white/[.035] p-5">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/20 text-[#d8a8ff]"><MessageSquareText size={19} /></span><div><p className="text-2xl font-semibold">{conversations.length}</p><p className="text-xs text-white/45">{isFa ? "گفتگوی ذخیره‌شده" : "Saved conversations"}</p></div></div>
        </div>
        <button type="button" onClick={onOpenKnowledge} className="rounded-2xl border border-white/[.08] bg-white/[.035] p-5 text-start transition hover:border-[#18c7f4]/30 hover:bg-[#18c7f4]/[.06]"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#18c7f4]/10 text-[#8de8ff]"><BookOpen size={19} /></span><div><p className="text-sm font-semibold">{isFa ? "پایگاه دانش" : "Knowledge base"}</p><p className="mt-1 text-xs text-white/45">{isFa ? "اسناد و مجموعه‌های دانش را مدیریت کنید" : "Manage source documents and knowledge sets"}</p></div></div></button>
      </section>

      <section className="mt-8 rounded-2xl border border-white/[.08] bg-[#0d1730]/65 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold">{isFa ? "گفتگوهای اخیر" : "Recent conversations"}</h2><p className="mt-1 text-xs text-white/45">{isFa ? "برای ادامه، یک گفتگو را انتخاب کنید." : "Select a conversation to continue where you left off."}</p></div><Clock3 size={18} className="text-white/35" /></div>
        {recentConversations.length ? <div className="mt-5 divide-y divide-white/[.06]">{recentConversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => onOpenConversation(conversation.id)} className="flex w-full items-center gap-3 py-3 text-start transition hover:text-[#d8a8ff]"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/[.05] text-white/45"><MessageSquareText size={15} /></span><span className="min-w-0 flex-1 truncate text-sm font-medium">{conversation.title}</span><span className="shrink-0 text-[11px] text-white/35">{new Date(conversation.updated_at).toLocaleDateString(isFa ? "fa-IR" : "en", { month: "short", day: "numeric" })}</span></button>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-white/[.1] px-5 py-8 text-center"><MessageSquareText className="mx-auto text-white/25" size={22} /><p className="mt-3 text-sm text-white/55">{isFa ? "هنوز گفتگویی ندارید." : "You have no conversations yet."}</p><button type="button" onClick={onNewConversation} className="mt-4 text-sm font-semibold text-[#d8a8ff] hover:text-white">{isFa ? "شروع گفتگوی جدید" : "Start a new conversation"}</button></div>}
      </section>
    </div>
  </div>;
}
