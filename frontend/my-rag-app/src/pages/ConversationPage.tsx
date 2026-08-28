import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, FileSearch, FileText, Loader2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import "../styles/conversation.css";
import ChatInput from "../components/ChatInput";
import OnyxChatWindow from "../components/OnyxChatWindow";
import { conversationService, type ConversationDetail, type PersistedMessage } from "../services/conversationService";
import { knowledgeService, type DocumentSet } from "../services/knowledgeService";
import type { ChatMessage } from "../types/chat";

interface ConversationPageProps {
  conversationId: string | null;
  onConversationChange: (id: string) => void;
  onConversationsUpdated: () => void;
}

function toChatMessage(message: PersistedMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content.replace(/\[Source\s+(\d+)\]/gi, "[$1]"),
    createdAt: message.created_at,
    grounded: Boolean(message.sources?.length),
    responseId: message.answer_id || undefined,
    sources: message.sources?.map((source, index) => ({
      id: source.chunk_id,
      citationId: index + 1,
      documentId: source.document_id,
      title: source.filename,
      chunkIndex: source.chunk_index,
      excerpt: source.content,
      score: source.score,
      page: source.page,
      section: source.section,
    })),
  };
}

export default function ConversationPage({ conversationId, onConversationChange, onConversationsUpdated }: ConversationPageProps) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [sets, setSets] = useState<DocumentSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [suggestedPrompt, setSuggestedPrompt] = useState({ value: "", revision: 0 });
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");

  useEffect(() => {
    let active = true;
    const task = conversationId
      ? conversationService.get(conversationId).then((value) => { if (active) setDetail(value); })
      : knowledgeService.listSets().then((value) => {
          if (!active) return;
          setSets(value);
          setSelectedSetId((current) => current || value[0]?.id || "");
          setDetail(null);
        });
    task.catch((error) => toast.error((error as Error).message)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [conversationId]);

  const messages = useMemo(() => {
    const persisted = detail?.messages.map(toChatMessage) ?? [];
    if (!pendingPrompt) return persisted;
    return [...persisted, { id: "pending-user-message", role: "user" as const, content: pendingPrompt, createdAt: new Date().toISOString() }];
  }, [detail, pendingPrompt]);
  const selectedSet = sets.find((item) => item.id === selectedSetId);

  const send = async (content: string) => {
    setPendingPrompt(content);
    setSending(true);
    try {
      let id = conversationId;
      if (!id) {
        if (!selectedSetId) throw new Error("Create or select a knowledge base first.");
        const created = await conversationService.createForSet(selectedSetId);
        id = created.id;
        onConversationChange(id);
      }
      await conversationService.send(id, content);
      const updated = await conversationService.get(id);
      setDetail(updated);
      onConversationsUpdated();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPendingPrompt("");
      setSending(false);
    }
  };

  if (loading) return <div className="grid h-full place-items-center conversation-muted"><Loader2 className="animate-spin" /></div>;

  if (!messages.length && !conversationId) {
    const suggestions = isFa
      ? [
          ["خلاصه‌سازی", "مهم‌ترین نکات اسناد این پایگاه دانش را خلاصه کن"],
          ["یافتن پاسخ", "براساس منابع موجود، پاسخ دقیق و مستند ارائه بده"],
          ["مقایسه منابع", "دیدگاه منابع مختلف درباره یک موضوع را مقایسه کن"],
        ]
      : [
          ["Summarize knowledge", "Summarize the most important insights in this knowledge base"],
          ["Find a grounded answer", "Give me a precise answer supported by the available sources"],
          ["Compare sources", "Compare how different documents discuss the same topic"],
        ];

    return <div dir={isFa ? "rtl" : "ltr"} className="conversation-page conversation-page--welcome flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto px-4 sm:px-7 lg:px-10">

      <header className="conversation-header flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2.5 text-[11px] font-semibold conversation-muted">
          <span className="conversation-header-icon"><MessageSquareText size={13} /></span>
          <span>{isFa ? "گفتگوی جدید" : "New conversation"}</span>
        </div>
        <span className="conversation-private hidden items-center gap-2 sm:flex">
          <span className="conversation-status-dot" />
          {isFa ? "فضای کاری خصوصی" : "Private workspace"}
        </span>
      </header>

      <main className="conversation-welcome">
        <div className="conversation-intro">
          <span className="conversation-emblem">
            <Sparkles size={23} />
          </span>
          <h1 className="conversation-title">
            {isFa ? "امروز چه چیزی را بررسی کنیم؟" : "What would you like to explore?"}
          </h1>
          <p className="conversation-description">
            {isFa ? "از دانش سازمانی خود سؤال کنید و پاسخ‌هایی دقیق، مستند و قابل پیگیری دریافت کنید." : "Ask across your organizational knowledge and get precise, source-grounded answers you can verify."}
          </p>
        </div>

        <div className="conversation-compose-area">
          <div className="conversation-context">
            <label className="conversation-selector">
              <BookOpen size={12} className="shrink-0 conversation-accent" />
              <span className="hidden sm:inline">{isFa ? "پایگاه دانش" : "Knowledge base"}</span>
              <span className="relative min-w-0">
                <select value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} aria-label={isFa ? "انتخاب پایگاه دانش" : "Select knowledge base"} className="conversation-select">
                  {sets.length ? sets.map((set) => <option  key={set.id} value={set.id}>{set.name}</option>) : <option  value="">{isFa ? "پایگاه دانشی موجود نیست" : "No knowledge base available"}</option>}
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute end-0 top-1/2 -translate-y-1/2 conversation-muted" />
              </span>
            </label>
            {selectedSet && <span className="shrink-0 text-[9px] conversation-muted">{selectedSet.indexed_document_count} {isFa ? "سند آماده" : "indexed documents"}</span>}
          </div>

          <ChatInput key={suggestedPrompt.revision} initialValue={suggestedPrompt.value} prominent disabled={sending || !selectedSetId} onSend={send} />

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {suggestions.map(([label, prompt], index) => <button key={label} type="button" onClick={() => setSuggestedPrompt((current) => ({ value: prompt, revision: current.revision + 1 }))} className="conversation-suggestion">
              <span className="conversation-suggestion-icon">{index === 0 ? <FileText size={13} /> : index === 1 ? <FileSearch size={13} /> : <ShieldCheck size={13} />}</span>
              <span className="conversation-suggestion-label">{label}</span>
            </button>)}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] conversation-muted"><ShieldCheck size={10} />{isFa ? "پاسخ‌ها همراه با ارجاع به منابع ذخیره می‌شوند" : "Answers are saved with traceable source citations"}</div>
        </div>
      </main>
    </div>;
  }

  return <div dir={isFa ? "rtl" : "ltr"} className="conversation-page relative mx-auto flex h-full w-full flex-col overflow-hidden px-4 sm:px-7 lg:px-10">
    <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-white/[.045]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-[#9f8be8]/15 bg-[#7c27ff]/20"><img src="/brand/nexora-symbol.svg" alt="Nexora" className="size-[18px]" /></span>
        <div className="min-w-0"><h1 className="truncate text-sm font-semibold tracking-[-.02em] conversation-muted">{detail?.title || (isFa ? "گفتگوی جدید" : "New conversation")}</h1><p className="mt-0.5 text-[9px] conversation-muted">{isFa ? "پاسخ‌گویی مبتنی بر منابع" : "Source-grounded conversation"}</p></div>
      </div>
      <span className="conversation-save-status hidden items-center gap-2 text-[10px] sm:flex"><span className="size-1.5 rounded-full bg-emerald-300/70" />{isFa ? "ذخیره خودکار" : "Saved automatically"}</span>
    </header>

    <section className="relative z-10 min-h-0 flex-1 overflow-hidden px-0 sm:px-3">
      {messages.length ? <OnyxChatWindow messages={messages} isThinking={sending} onRegenerate={send} /> : <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-[#18c7f4]/25 bg-[#7c27ff]/25 text-[#d9a6ff]"><MessageSquareText size={23} /></span>
        <h2 className="mt-5 text-xl font-semibold">Start a source-grounded conversation</h2>
        <p className="mt-2 max-w-md text-sm leading-6 conversation-muted">Choose the knowledge base this conversation should use. Your messages and answers will remain available in Recent chats.</p>
        {!conversationId && <label className="mt-6 w-full max-w-sm text-left text-xs conversation-muted">
          <span className="mb-2 flex items-center gap-2"><BookOpen size={13} />Knowledge base</span>
          <select value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-[#12101a] px-3 text-sm text-white outline-none focus:border-[#18c7f4]/45">
            {sets.length ? sets.map((set) => <option key={set.id} value={set.id}>{set.name} ({set.indexed_document_count} indexed)</option>) : <option value="">No knowledge base available</option>}
          </select>
        </label>}
      </div>}
    </section>
    <div className="conversation-dock relative z-20 shrink-0 px-0 pb-4 pt-3 sm:px-3 sm:pb-5"><ChatInput prominent disabled={sending || (!conversationId && !selectedSetId)} onSend={send} /><div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] conversation-muted"><FileText size={10} />{isFa ? "پاسخ‌ها ممکن است خطا داشته باشند؛ منابع را بررسی کنید." : "AI can make mistakes. Verify important details in the cited sources."}</div></div>
  </div>;
}

