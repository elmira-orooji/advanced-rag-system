import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpenText, FileSearch, FileText, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import { useChatHistory } from "../hooks/useChatHistory";

interface DashboardPageProps {
  username: string;
}

export default function DashboardPage({ username }: DashboardPageProps) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const copy = isFa ? {
    eyebrow: "فضای کاری دانش هوشمند", welcome: "خوش آمدید،", subtitle: "سؤال بپرسید، منابع را بررسی کنید و اسناد خود را به پاسخ‌های قابل اعتماد تبدیل کنید.",
    ready: "پایگاه دانش آماده است", discover: "دوست دارید چه چیزی کشف کنید؟", grounded: "هر پاسخ بر اساس اسناد فضای کاری شما تولید می‌شود و منابع قابل پیگیری دارد.",
    disclaimer: "پاسخ‌ها ممکن است خطا داشته باشند؛ اطلاعات مهم را با منابع بررسی کنید.",
  } : {
    eyebrow: "AI knowledge workspace", welcome: "Welcome back,", subtitle: "Ask questions, explore sources, and turn your documents into trusted answers.",
    ready: "Knowledge base ready", discover: "What would you like to discover?", grounded: "Every response is grounded in your workspace documents and includes traceable sources.",
    disclaimer: "Answers may contain errors. Verify important information from cited sources.",
  };
  const suggestions = isFa ? [
    { icon: FileSearch, title: "تحلیل یک سند", description: "یافتن نکات کلیدی و شواهد پشتیبان" },
    { icon: BookOpenText, title: "خلاصه‌سازی دانش من", description: "ساخت یک گزارش کوتاه و مبتنی بر منبع" },
    { icon: ShieldCheck, title: "اعتبارسنجی پاسخ", description: "ردیابی ادعاها در اسناد بارگذاری‌شده" },
  ] : [
    { icon: FileSearch, title: "Analyze a document", description: "Find key insights and supporting evidence" },
    { icon: BookOpenText, title: "Summarize my knowledge", description: "Create a concise, source-grounded brief" },
    { icon: ShieldCheck, title: "Verify an answer", description: "Trace a claim back to uploaded sources" },
  ];
  const [isThinking, setIsThinking] = useState(false);
  const { activeSession, activeSessionId, addMessage, createNewChat, sessions } = useChatHistory();
  const hasMessages = Boolean(activeSession?.messages.length);

  useEffect(() => {
    if (sessions.length === 0) createNewChat();
  }, [createNewChat, sessions.length]);

  const handleSendMessage = (content: string) => {
    if (!activeSessionId) return;
    addMessage(activeSessionId, {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    });
    setIsThinking(true);

    window.setTimeout(() => {
      addMessage(activeSessionId, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I analyzed your knowledge base and prepared a grounded response. This is a preview response until the chat endpoint is connected.",
        createdAt: new Date().toISOString(),
        sources: [{ id: "1", title: "annual_report.pdf" }, { id: "2", title: "research_notes.docx" }],
      });
      setIsThinking(false);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex h-full w-full max-w-[1120px] flex-col px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-7 lg:px-10 lg:py-9"
    >
      <header className="flex shrink-0 items-start justify-between gap-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#a995eb]">
            <span className="size-1.5 rounded-full bg-[#8f78d8] shadow-[0_0_12px_#8f78d8]" />
            {copy.eyebrow}
          </div>
          <h1 className="text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">
            {copy.welcome} <span className="text-white/55">{username}</span>
          </h1>
          <p className="mt-2 text-sm text-white/35">{copy.subtitle}</p>
        </div>
        <div className="hidden items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/[.05] px-3 py-2 text-[11px] text-emerald-200/60 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
          {copy.ready}
        </div>
      </header>

      <section className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 sm:mt-8 lg:overflow-visible lg:pr-0">
        {hasMessages ? (
          <div className="app-glass-panel h-full min-h-0 rounded-[24px] p-4 sm:p-6">
            <ChatWindow messages={activeSession?.messages ?? []} isThinking={isThinking} />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center py-4">
            <div className="mx-auto w-full max-w-3xl text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#8f78d8]/25 bg-[#32127A]/25 text-[#b6a7ef] shadow-[0_0_40px_rgba(50,18,122,.26)]">
                <Sparkles size={24} />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-[-.03em] sm:text-2xl">{copy.discover}</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-white/35">{copy.grounded}</p>
            </div>

            <div className="mx-auto mt-7 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {suggestions.map(({ description, icon: Icon, title }) => (
                <button
                  key={title}
                  type="button"
                  onClick={() => handleSendMessage(title)}
                  className="app-suggestion-card group rounded-2xl p-4 text-left sm:min-h-36"
                >
                  <span className="grid size-9 place-items-center rounded-xl border border-white/[.09] bg-white/[.05] text-[#a995eb] transition group-hover:bg-[#32127A]/25">
                    <Icon size={17} />
                  </span>
                  <p className="mt-4 text-sm font-semibold text-white/85">{title}</p>
                  <p className="mt-1.5 text-xs leading-5 text-white/30">{description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 shrink-0 sm:mt-5">
        <ChatInput disabled={isThinking} onSend={handleSendMessage} />
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-white/20">
          <FileText size={11} />
          {copy.disclaimer}
        </div>
      </div>
    </motion.div>
  );
}
