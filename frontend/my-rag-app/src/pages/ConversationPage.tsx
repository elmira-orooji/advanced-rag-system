import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, FileSearch, FileText, Loader2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

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

  if (loading) return <div className="grid h-full place-items-center text-white/30"><Loader2 className="animate-spin" /></div>;

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

    return <div dir={isFa ? "rtl" : "ltr"} className="relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto px-4 sm:px-7 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[34%] size-[32rem] -translate-x-1/2 rounded-full bg-[#32127A]/10 blur-[130px]" />
        <div className="absolute bottom-[-14rem] left-[38%] h-80 w-[38rem] rounded-full bg-[#0067A5]/10 blur-[140px]" />
      </div>

      <header className="relative z-10 flex h-20 shrink-0 items-center justify-between border-b border-white/[.045]">
        <div className="flex items-center gap-2.5 text-[11px] font-semibold text-white/45">
          <span className="grid size-7 place-items-center rounded-lg border border-[#8f78d8]/20 bg-[#32127A]/20 text-[#b6a7ef]"><MessageSquareText size={13} /></span>
          <span>{isFa ? "گفتگوی جدید" : "New conversation"}</span>
        </div>
        <span className="hidden items-center gap-2 rounded-full border border-emerald-300/10 bg-emerald-300/[.04] px-3 py-1.5 text-[10px] text-emerald-200/55 sm:flex">
          <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.65)]" />
          {isFa ? "فضای کاری خصوصی" : "Private workspace"}
        </span>
      </header>

      <main className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center pb-[7vh]">
        <div className="mb-7 text-center sm:mb-9">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-[#a995eb]/20 bg-[linear-gradient(145deg,rgba(50,18,122,.42),rgba(143,120,216,.12))] text-[#c5b8f4] shadow-[0_18px_55px_rgba(50,18,122,.24),inset_0_1px_rgba(255,255,255,.08)]">
            <Sparkles size={23} />
          </span>
          <h1 className="mt-5 text-[clamp(1.75rem,3.2vw,2.65rem)] font-semibold tracking-[-.045em] text-white/95">
            {isFa ? "امروز چه چیزی را بررسی کنیم؟" : "What would you like to explore?"}
          </h1>
          <p className="mx-auto mt-2.5 max-w-xl text-xs leading-6 text-white/35 sm:text-sm">
            {isFa ? "از دانش سازمانی خود سؤال کنید و پاسخ‌هایی دقیق، مستند و قابل پیگیری دریافت کنید." : "Ask across your organizational knowledge and get precise, source-grounded answers you can verify."}
          </p>
        </div>

        <div className="w-full max-w-4xl">
          <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
            <label className="group relative flex min-w-0 items-center gap-2 text-[10px] text-white/35">
              <BookOpen size={12} className="shrink-0 text-[#a995eb]" />
              <span className="hidden sm:inline">{isFa ? "پایگاه دانش" : "Knowledge base"}</span>
              <span className="relative min-w-0">
                <select value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} className="max-w-56 cursor-pointer appearance-none truncate bg-transparent pe-5 text-[11px] font-semibold text-white/70 outline-none">
                  {sets.length ? sets.map((set) => <option className="bg-[#12101a]" key={set.id} value={set.id}>{set.name}</option>) : <option className="bg-[#12101a]" value="">{isFa ? "پایگاه دانشی موجود نیست" : "No knowledge base available"}</option>}
                </select>
                <ChevronDown size={11} className="pointer-events-none absolute end-0 top-1/2 -translate-y-1/2 text-white/25" />
              </span>
            </label>
            {selectedSet && <span className="shrink-0 text-[9px] text-white/25">{selectedSet.indexed_document_count} {isFa ? "سند آماده" : "indexed documents"}</span>}
          </div>

          <ChatInput key={suggestedPrompt.revision} initialValue={suggestedPrompt.value} prominent disabled={sending || !selectedSetId} onSend={send} />

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {suggestions.map(([label, prompt], index) => <button key={label} type="button" onClick={() => setSuggestedPrompt((current) => ({ value: prompt, revision: current.revision + 1 }))} className="group flex min-w-0 items-center gap-2.5 rounded-xl border border-white/[.055] bg-white/[.018] px-3 py-2.5 text-start transition hover:-translate-y-0.5 hover:border-[#8f78d8]/20 hover:bg-[#32127A]/10">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[.035] text-white/30 transition group-hover:bg-[#32127A]/25 group-hover:text-[#b6a7ef]">{index === 0 ? <FileText size={13} /> : index === 1 ? <FileSearch size={13} /> : <ShieldCheck size={13} />}</span>
              <span className="truncate text-[10px] font-medium text-white/38 group-hover:text-white/65">{label}</span>
            </button>)}
          </div>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-white/18"><ShieldCheck size={10} />{isFa ? "پاسخ‌ها همراه با ارجاع به منابع ذخیره می‌شوند" : "Answers are saved with traceable source citations"}</div>
        </div>
      </main>
    </div>;
  }

  return <div dir={isFa ? "rtl" : "ltr"} className="relative mx-auto flex h-full w-full max-w-[1180px] flex-col overflow-hidden px-4 sm:px-7 lg:px-10">
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 size-[34rem] -translate-x-1/2 rounded-full bg-[#32127A]/[.055] blur-[140px]" />
    <header className="relative z-10 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-white/[.045]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-[#9f8be8]/15 bg-[#32127A]/20"><img src="/brand/nexora-symbol.svg" alt="Nexora" className="size-[18px]" /></span>
        <div className="min-w-0"><h1 className="truncate text-sm font-semibold tracking-[-.02em] text-white/80">{detail?.title || (isFa ? "گفتگوی جدید" : "New conversation")}</h1><p className="mt-0.5 text-[9px] text-white/24">{isFa ? "پاسخ‌گویی مبتنی بر منابع" : "Source-grounded conversation"}</p></div>
      </div>
      <span className="hidden items-center gap-2 text-[9px] text-emerald-200/40 sm:flex"><span className="size-1.5 rounded-full bg-emerald-300/70" />{isFa ? "ذخیره خودکار" : "Saved automatically"}</span>
    </header>

    <section className="relative z-10 min-h-0 flex-1 overflow-hidden px-0 sm:px-3">
      {messages.length ? <OnyxChatWindow messages={messages} isThinking={sending} onRegenerate={send} /> : <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-[#8f78d8]/25 bg-[#32127A]/25 text-[#b6a7ef]"><MessageSquareText size={23} /></span>
        <h2 className="mt-5 text-xl font-semibold">Start a source-grounded conversation</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/35">Choose the knowledge base this conversation should use. Your messages and answers will remain available in Recent chats.</p>
        {!conversationId && <label className="mt-6 w-full max-w-sm text-left text-xs text-white/45">
          <span className="mb-2 flex items-center gap-2"><BookOpen size={13} />Knowledge base</span>
          <select value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-[#12101a] px-3 text-sm text-white outline-none focus:border-[#8f78d8]/45">
            {sets.length ? sets.map((set) => <option key={set.id} value={set.id}>{set.name} ({set.indexed_document_count} indexed)</option>) : <option value="">No knowledge base available</option>}
          </select>
        </label>}
      </div>}
    </section>
    <div className="relative z-20 shrink-0 border-t border-white/[.035] bg-[linear-gradient(180deg,rgba(10,8,14,0),rgba(10,8,14,.72)_24%)] px-0 pb-4 pt-3 sm:px-3 sm:pb-5"><ChatInput prominent disabled={sending || (!conversationId && !selectedSetId)} onSend={send} /><div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-white/18"><FileText size={10} />{isFa ? "پاسخ‌ها ممکن است خطا داشته باشند؛ منابع را بررسی کنید." : "AI can make mistakes. Verify important details in the cited sources."}</div></div>
  </div>;
}
