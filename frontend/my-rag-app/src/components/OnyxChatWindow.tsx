import { useEffect, useState, type ReactNode } from "react";
import { Check, CheckCircle2, ChevronDown, Copy, FileText, Layers3, Quote, RotateCcw, Share2, ShieldAlert, Telescope, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { feedbackService, type FeedbackReason } from "../services/feedbackService";
import type { ChatMessage, Source } from "../types/chat";

interface Props {
  messages: ChatMessage[];
  isThinking: boolean;
  onRegenerate?: (prompt: string) => void;
}

export default function OnyxChatWindow({ messages, isThinking, onRegenerate }: Props) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const [evidence, setEvidence] = useState<Source | null>(null);
  const previousPrompt = (index: number) => [...messages.slice(0, index)].reverse().find((item) => item.role === "user")?.content;

  return <div dir={isFa ? "rtl" : "ltr"} className="relative h-full">
    <div className="h-full overflow-y-auto scroll-smooth pe-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-8 py-4 sm:py-7">
        {messages.map((message, index) => message.role === "user" ? <article key={message.id} className="flex justify-end ps-8 sm:ps-20">
          <div className="max-w-[86%] rounded-[20px] rounded-se-md border border-white/[.08] bg-white/[.055] px-4 py-3 text-[13px] leading-6 text-white/78 shadow-[0_12px_34px_rgba(0,0,0,.12)] sm:max-w-[74%] sm:px-5">{message.content}</div>
        </article> : <article key={message.id} className="group/answer flex items-start gap-3.5 sm:gap-4">
          <NexoraMark />
          <div className="min-w-0 flex-1 pt-0.5">
            {message.research && <details className="mb-4 overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.025]"><summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-[11px] font-semibold text-white/58"><Telescope size={14} className="text-[#a995eb]" />{isFa ? "فعالیت بازیابی" : "Retrieval activity"}<span className="ms-auto text-[10px] font-normal text-white/25">{message.research.steps.length} {isFa ? "جست‌وجو" : "searches"} · {message.research.evidenceReviewed} {isFa ? "منبع" : "sources"}</span><ChevronDown size={13} className="text-white/25" /></summary><div className="space-y-2 border-t border-white/[.06] px-4 py-3">{message.research.steps.map((step, stepIndex) => <div key={stepIndex} className="flex items-center gap-2 text-[10px] leading-4 text-white/38"><Check size={11} className="text-emerald-300/55" /><span className="min-w-0 flex-1 truncate">{step.query}</span><span className="shrink-0 text-white/20">{step.evidence_count}</span></div>)}</div></details>}

            <div className="whitespace-pre-wrap text-[14px] leading-7 text-white/76 sm:text-[15px] sm:leading-[1.9]"><CitedText content={message.content} sources={message.sources || []} onOpen={setEvidence} /></div>
            <div className={`mt-4 flex items-center gap-1.5 text-[10px] ${message.grounded ? "text-emerald-200/48" : "text-amber-200/45"}`}>{message.grounded ? <><CheckCircle2 size={12} />{isFa ? "پاسخ مستند به منابع" : "Grounded in your sources"}</> : <><ShieldAlert size={12} />{isFa ? "منبع مرتبطی پیدا نشد" : "No relevant source found"}</>}</div>

            {message.sources?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.sources.slice(0, 4).map((source) => <button key={`${source.id}-${source.citationId}`} onClick={() => setEvidence(source)} className="flex max-w-full items-center gap-1.5 rounded-lg border border-white/[.07] bg-white/[.025] px-2.5 py-1.5 text-[10px] text-white/38 transition hover:border-[#8f78d8]/30 hover:bg-[#32127A]/15 hover:text-white/68"><span className="grid size-4 shrink-0 place-items-center rounded bg-[#32127A]/45 text-[9px] text-[#c5b8f4]">{source.citationId}</span><span className="max-w-40 truncate">{source.title}</span></button>)}</div> : null}

            <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-white/[.045] pt-2.5 opacity-75 transition group-hover/answer:opacity-100">
              <Action label={isFa ? "کپی" : "Copy"} onClick={() => { void navigator.clipboard.writeText(message.content); toast.success(isFa ? "پاسخ کپی شد" : "Response copied"); }}><Copy size={13} /></Action>
              {message.responseId && <Feedback responseId={message.responseId} isFa={isFa} />}
              {onRegenerate && previousPrompt(index) && <Action label={isFa ? "تولید دوباره" : "Regenerate"} onClick={() => onRegenerate(previousPrompt(index)!)}><RotateCcw size={13} /></Action>}
              <Action label={isFa ? "اشتراک" : "Share"} onClick={() => { void navigator.clipboard.writeText(message.content); toast.success(isFa ? "متن پاسخ برای اشتراک کپی شد" : "Answer copied for sharing"); }}><Share2 size={13} /></Action>
              {message.sources?.length ? <button onClick={() => setEvidence(message.sources![0])} className="ms-1 flex h-8 items-center gap-1.5 rounded-lg px-2 text-[10px] font-medium text-white/35 transition hover:bg-white/[.05] hover:text-white/70"><Layers3 size={13} />{message.sources.length} {isFa ? "منبع" : "Sources"}</button> : null}
            </div>
          </div>
        </article>)}
        {isThinking && <Thinking isFa={isFa} />}
      </div>
    </div>
    {evidence && <Evidence source={evidence} isFa={isFa} onClose={() => setEvidence(null)} />}
  </div>;
}

function NexoraMark() {
  return <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#9f8be8]/20 bg-[linear-gradient(145deg,rgba(50,18,122,.5),rgba(143,120,216,.12))] shadow-[0_10px_30px_rgba(50,18,122,.2)]"><img src="/brand/nexora-symbol.svg" alt="Nexora" className="size-5" /></span>;
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid size-8 place-items-center rounded-lg text-white/30 transition hover:bg-white/[.06] hover:text-white/75">{children}</button>;
}

function Thinking({ isFa }: { isFa: boolean }) {
  const [step, setStep] = useState(0);
  const steps = isFa ? ["در حال جست‌وجو در پایگاه دانش", "در حال ارزیابی و رتبه‌بندی منابع", "در حال تدوین پاسخ مستند"] : ["Searching your knowledge base", "Evaluating and reranking sources", "Composing a grounded response"];
  useEffect(() => { const timer = window.setInterval(() => setStep((value) => Math.min(value + 1, steps.length - 1)), 1400); return () => window.clearInterval(timer); }, [steps.length]);
  return <article className="flex items-start gap-3.5 sm:gap-4" aria-live="polite"><NexoraMark /><details open className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#8f78d8]/16 bg-[linear-gradient(135deg,rgba(50,18,122,.14),rgba(255,255,255,.018))]"><summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3.5 text-[11px] font-semibold text-white/62"><span className="relative size-3"><span className="absolute inset-0 animate-ping rounded-full bg-[#a995eb]/30" /><span className="absolute inset-[3px] rounded-full bg-[#b6a7ef]" /></span>{isFa ? "در حال پردازش" : "Thinking"}<ChevronDown size={13} className="ms-auto text-white/25" /></summary><div className="border-t border-white/[.055] px-4 py-3.5"><div className="space-y-2.5">{steps.map((label, index) => <div key={label} className={`flex items-center gap-2 text-[10px] transition ${index <= step ? "text-white/48" : "text-white/18"}`}>{index < step ? <Check size={12} className="text-emerald-300/60" /> : index === step ? <span className="size-3 animate-spin rounded-full border border-[#b6a7ef]/25 border-t-[#b6a7ef]" /> : <span className="size-3 rounded-full border border-white/10" />}<span>{label}</span></div>)}</div><p className="mt-3 text-[9px] leading-4 text-white/18">{isFa ? "این بخش وضعیت پردازش را نشان می‌دهد و شامل زنجیره‌فکر خصوصی مدل نیست." : "This displays processing status, not the model's private chain of thought."}</p></div></details></article>;
}

function Feedback({ responseId, isFa }: { responseId: string; isFa: boolean }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | "">("");
  const [saving, setSaving] = useState(false);
  const reasons: Array<[FeedbackReason, string]> = [["incorrect", isFa ? "پاسخ اشتباه بود" : "Incorrect answer"], ["irrelevant_source", isFa ? "منبع نامرتبط بود" : "Irrelevant source"], ["incomplete", isFa ? "پاسخ ناقص بود" : "Incomplete answer"], ["citation_issue", isFa ? "ارجاع مشکل داشت" : "Citation issue"], ["other", isFa ? "مورد دیگر" : "Something else"]];
  const positive = async () => { setSaving(true); try { await feedbackService.save(responseId, 1); setRating(1); toast.success(isFa ? "از بازخورد شما متشکریم" : "Thanks for your feedback"); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  const negative = async () => { if (!reason) return; setSaving(true); try { await feedbackService.save(responseId, -1, reason); setRating(-1); setOpen(false); toast.success(isFa ? "بازخورد ثبت شد" : "Feedback saved"); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  return <div className="relative flex items-center"><Action label={isFa ? "مفید" : "Helpful"} onClick={() => void positive()}><ThumbsUp size={13} className={rating === 1 ? "text-emerald-300" : ""} /></Action><Action label={isFa ? "غیرمفید" : "Not helpful"} onClick={() => setOpen((value) => !value)}><ThumbsDown size={13} className={rating === -1 ? "text-rose-300" : ""} /></Action>{open && <div className="absolute bottom-10 start-0 z-30 w-64 rounded-2xl border border-white/10 bg-[rgba(15,11,22,.98)] p-3 shadow-2xl backdrop-blur-2xl"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-white/65">{isFa ? "مشکل پاسخ چه بود؟" : "What went wrong?"}</p><button onClick={() => setOpen(false)} className="text-white/30"><X size={13} /></button></div><div className="mt-2 space-y-1">{reasons.map(([value, label]) => <button key={value} onClick={() => setReason(value)} className={`w-full rounded-lg px-2.5 py-2 text-start text-[10px] ${reason === value ? "bg-[#32127A]/40 text-white/75" : "text-white/38 hover:bg-white/[.04]"}`}>{label}</button>)}</div><button disabled={!reason || saving} onClick={() => void negative()} className="mt-2 h-9 w-full rounded-xl bg-[#32127A] text-[10px] font-semibold disabled:opacity-40">{saving ? "…" : isFa ? "ثبت بازخورد" : "Submit"}</button></div>}</div>;
}

function CitedText({ content, sources, onOpen }: { content: string; sources: Source[]; onOpen: (source: Source) => void }) {
  return <>{content.split(/(\[\d+\])/g).map((part, index) => { const match = part.match(/^\[(\d+)\]$/); const source = match ? sources.find((item) => item.citationId === Number(match[1])) : undefined; return source ? <button key={index} onClick={() => onOpen(source)} className="mx-0.5 inline-grid min-w-5 place-items-center rounded-md border border-[#8f78d8]/25 bg-[#32127A]/35 px-1 text-[10px] font-bold leading-5 text-[#c5b8f4] align-text-top hover:bg-[#32127A]/60">{source.citationId}</button> : <span key={index}>{part}</span>; })}</>;
}

function Evidence({ source, isFa, onClose }: { source: Source; isFa: boolean; onClose: () => void }) {
  return <aside className="absolute inset-y-0 end-0 z-40 flex w-full max-w-md flex-col border-s border-white/10 bg-[rgba(12,9,18,.97)] shadow-2xl backdrop-blur-2xl"><header className="flex items-center justify-between border-b border-white/[.07] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#32127A]/30 text-[#b6a7ef]"><Quote size={15} /></span><div><p className="text-xs font-semibold">{isFa ? `منبع ${source.citationId}` : `Source ${source.citationId}`}</p><p className="mt-0.5 max-w-64 truncate text-[10px] text-white/30">{source.title}</p></div></div><button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-white/35 hover:bg-white/5"><X size={15} /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="flex items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] p-3 text-[11px] text-white/50"><FileText size={14} className="text-[#a995eb]" /><span className="truncate">{source.title}</span></div><blockquote className="mt-4 whitespace-pre-wrap rounded-2xl border-s-2 border-[#8f78d8]/45 bg-[#32127A]/10 p-4 text-xs leading-6 text-white/60">{source.excerpt}</blockquote></div></aside>;
}
