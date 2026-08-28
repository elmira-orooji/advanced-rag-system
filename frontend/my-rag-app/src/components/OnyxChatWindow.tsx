import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Copy, FileText, Layers3, Quote, ShieldAlert, Telescope, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import NexoraAvatar from "./NexoraAvatar";
import AnswerSources from "./AnswerSources";
import AnswerLoading from "./AnswerLoading";
import ConversationScrollRail from "./ConversationScrollRail";
import "../styles/chat-answer.css";

import { feedbackService, type FeedbackReason } from "../services/feedbackService";
import type { ChatMessage, Source } from "../types/chat";

interface Props {
  messages: ChatMessage[];
  isThinking: boolean;
  assistantName?: string;
}

export default function OnyxChatWindow({ messages, isThinking, assistantName }: Props) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const [evidence, setEvidence] = useState<Source | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  useEffect(() => {
    const viewport = scrollRef.current;
    if (viewport && followLatest.current) viewport.scrollTop = viewport.scrollHeight;
  }, [messages, isThinking]);

  return <div dir={isFa ? "rtl" : "ltr"} className="chat-thread relative h-full">
    <div ref={scrollRef} onScroll={(event) => { const node = event.currentTarget; followLatest.current = node.scrollHeight - node.scrollTop - node.clientHeight < 100; }} className="chat-thread-scroll h-full overflow-y-auto pe-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
      <div className="chat-thread-messages">
        {messages.map((message) => message.role === "user" ? <article key={message.id} data-scroll-message={message.id} className="chat-question">
          <div className="chat-question-stack"><span className="chat-question-label">{isFa ? "شما" : "You"}</span><div className="chat-question-bubble"><div dir="auto">{message.content}</div></div></div>
        </article> : <article key={message.id} data-scroll-message={message.id} className="chat-answer">
          <NexoraAvatar />
          <div className="chat-answer-body">
            <header className="chat-answer-heading"><strong>Nexora</strong>{assistantName && <span dir="auto">{assistantName}</span>}</header>
            {message.research && <details className="mb-4 overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.025]"><summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-[11px] font-semibold text-white/58"><Telescope size={14} className="text-[#c43cff]" />{isFa ? "فعالیت بازیابی" : "Retrieval activity"}<span className="ms-auto text-[10px] font-normal text-white/25">{message.research.steps.length} {isFa ? "جست‌وجو" : "searches"} · {message.research.evidenceReviewed} {isFa ? "منبع" : "sources"}</span><ChevronDown size={13} className="text-white/25" /></summary><div className="space-y-2 border-t border-white/[.06] px-4 py-3">{message.research.steps.map((step, stepIndex) => <div key={stepIndex} className="flex items-center gap-2 text-[10px] leading-4 text-white/38"><Check size={11} className="text-emerald-300/55" /><span className="min-w-0 flex-1 truncate">{step.query}</span><span className="shrink-0 text-white/20">{step.evidence_count}</span></div>)}</div></details>}

            <div className="chat-answer-text" dir="auto"><CitedText content={message.content} sources={message.sources || []} onOpen={setEvidence} /></div>
            {!message.grounded && <div className="chat-answer-grounding is-ungrounded"><ShieldAlert size={12} />{isFa ? "منبع مرتبطی پیدا نشد" : "No relevant source found"}</div>}

            {message.sources?.length ? <AnswerSources sources={message.sources} isFa={isFa} onOpen={setEvidence} /> : null}

            <div className="chat-answer-actions">
              <Action label={isFa ? "کپی" : "Copy"} onClick={() => { void navigator.clipboard.writeText(message.content); toast.success(isFa ? "پاسخ کپی شد" : "Response copied"); }}><Copy size={13} /></Action>
              {message.responseId && <Feedback responseId={message.responseId} isFa={isFa} />}
              {message.sources?.length ? <button onClick={() => setEvidence(message.sources![0])} className="chat-answer-source-count"><Layers3 size={13} />{message.sources.length} {isFa ? "منبع" : "Sources"}</button> : null}
            </div>
          </div>
        </article>)}
        {isThinking && <AnswerLoading isFa={isFa} assistantName={assistantName} />}
      </div>
    </div>
    <ConversationScrollRail viewportRef={scrollRef} isFa={isFa} messages={messages} />
    {evidence && <Evidence source={evidence} isFa={isFa} onClose={() => setEvidence(null)} />}
  </div>;
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="chat-answer-action">{children}</button>;
}

function Feedback({ responseId, isFa }: { responseId: string; isFa: boolean }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | "">("");
  const [saving, setSaving] = useState(false);
  const reasons: Array<[FeedbackReason, string]> = [["incorrect", isFa ? "پاسخ اشتباه بود" : "Incorrect answer"], ["irrelevant_source", isFa ? "منبع نامرتبط بود" : "Irrelevant source"], ["incomplete", isFa ? "پاسخ ناقص بود" : "Incomplete answer"], ["citation_issue", isFa ? "ارجاع مشکل داشت" : "Citation issue"], ["other", isFa ? "مورد دیگر" : "Something else"]];
  const positive = async () => { setSaving(true); try { await feedbackService.save(responseId, 1); setRating(1); toast.success(isFa ? "از بازخورد شما متشکریم" : "Thanks for your feedback"); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  const negative = async () => { if (!reason) return; setSaving(true); try { await feedbackService.save(responseId, -1, reason); setRating(-1); setOpen(false); toast.success(isFa ? "بازخورد ثبت شد" : "Feedback saved"); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  return <div className="relative flex items-center"><Action label={isFa ? "مفید" : "Helpful"} onClick={() => void positive()}><ThumbsUp size={13} className={rating === 1 ? "text-emerald-300" : ""} /></Action><Action label={isFa ? "غیرمفید" : "Not helpful"} onClick={() => setOpen((value) => !value)}><ThumbsDown size={13} className={rating === -1 ? "text-rose-300" : ""} /></Action>{open && <div className="nexora-dropdown absolute bottom-10 start-0 z-30 w-64 rounded-2xl border border-white/10 bg-[rgba(15,11,22,.98)] p-3 shadow-2xl backdrop-blur-2xl"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-white/65">{isFa ? "مشکل پاسخ چه بود؟" : "What went wrong?"}</p><button onClick={() => setOpen(false)} className="text-white/30"><X size={13} /></button></div><div className="mt-2 space-y-1">{reasons.map(([value, label]) => <button key={value} aria-pressed={reason === value} onClick={() => setReason(value)} className={`w-full rounded-lg px-2.5 py-2 text-start text-[10px] ${reason === value ? "bg-[#7c27ff]/40 text-white/75" : "text-white/38 hover:bg-white/[.04]"}`}>{label}</button>)}</div><button disabled={!reason || saving} onClick={() => void negative()} className="mt-2 h-9 w-full rounded-xl bg-[#7c27ff] text-[10px] font-semibold disabled:opacity-40">{saving ? "…" : isFa ? "ثبت بازخورد" : "Submit"}</button></div>}</div>;
}

function CitedText({ content, sources, onOpen }: { content: string; sources: Source[]; onOpen: (source: Source) => void }) {
  return <>{content.split(/(\[\d+\])/g).map((part, index) => { const match = part.match(/^\[(\d+)\]$/); const source = match ? sources.find((item) => item.citationId === Number(match[1])) : undefined; return source ? <button key={index} onClick={() => onOpen(source)} className="chat-answer-citation" aria-label={`Source ${source.citationId}: ${source.title}`}>{source.citationId}</button> : <span key={index}>{part}</span>; })}</>;
}

function Evidence({ source, isFa, onClose }: { source: Source; isFa: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  return <aside className="chat-evidence" aria-label={isFa ? "جزئیات منبع" : "Source details"} dir={isFa ? "rtl" : "ltr"} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className="chat-evidence-header">
      <span className="chat-evidence-icon"><Quote size={19} /></span>
      <div className="chat-evidence-heading"><h2>{isFa ? `منبع ${source.citationId ?? ""}` : `Source ${source.citationId ?? ""}`}</h2><p>{isFa ? "متن بازیابی‌شده از اسناد" : "Retrieved document passage"}</p></div>
      <button ref={closeRef} type="button" className="chat-evidence-close" onClick={onClose} aria-label={isFa ? "بستن منبع" : "Close source"}><X size={18} /></button>
    </header>
    <div className="chat-evidence-content">
      <div className="chat-evidence-file"><span className="chat-evidence-file-icon"><FileText size={19} /></span><div><strong dir="auto">{source.title}</strong><span>{source.page ? `${isFa ? "صفحه" : "Page"} ${source.page}` : source.chunkIndex != null ? `${isFa ? "بخش" : "Chunk"} ${source.chunkIndex + 1}` : (isFa ? "سند مرجع" : "Source document")}</span></div></div>
      {source.section && <p className="chat-evidence-section" dir="auto">{source.section}</p>}
      <h3 className="chat-evidence-label">{isFa ? "متن منبع" : "Source passage"}</h3>
      <blockquote className="chat-evidence-passage" dir="auto">{source.excerpt || (isFa ? "متن این منبع در دسترس نیست." : "No passage is available for this source.")}</blockquote>
    </div>
    <footer className="chat-evidence-footer"><FileText size={13} /><span>{isFa ? "این بخش از سند برای پاسخ بازیابی شده است." : "This passage was retrieved to support the answer."}</span></footer>
  </aside>;
}
