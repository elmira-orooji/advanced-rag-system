import { useState } from "react";
import { CheckCircle2, Copy, FileText, Quote, Share2, ShieldAlert, Sparkles, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { ChatMessage, Source } from "../types/chat";
import { feedbackService, type FeedbackReason } from "../services/feedbackService";
import { shareService } from "../services/shareService";

interface ChatWindowProps { messages: ChatMessage[]; isThinking: boolean; }

export default function ChatWindow({ messages, isThinking }: ChatWindowProps) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const [evidence, setEvidence] = useState<Source | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  return <div className="relative h-full">
    <div className="flex h-full flex-col gap-5 overflow-y-auto pe-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
      {messages.map((message) => <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        {message.role === "assistant" && <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]"><Sparkles size={14} /></span>}
        <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] ${message.role === "user" ? "rounded-br-md bg-[#32127A] text-white shadow-[0_10px_28px_rgba(50,18,122,.25)]" : "rounded-tl-md border border-white/[.08] bg-white/[.045] text-white/75"}`}>
          <p className="whitespace-pre-wrap">{message.role === "assistant" ? <CitedText content={message.content} sources={message.sources || []} onOpen={setEvidence} /> : message.content}</p>
          {message.role === "assistant" && <>
            <div className={`mt-3 flex items-center gap-1.5 text-[10px] ${message.grounded ? "text-emerald-200/50" : "text-amber-200/45"}`}>{message.grounded ? <><CheckCircle2 size={12} />{isFa ? "پاسخ متصل به منبع" : "Source-linked answer"}</> : <><ShieldAlert size={12} />{isFa ? "بدون ارجاع به منبع" : "No source citation"}</>}</div>
            {message.sources?.length ? <div className="mt-3 border-t border-white/[.07] pt-3"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#a995eb]">{isFa ? "شواهد" : "Evidence"}</p><div className="flex flex-wrap gap-2">{message.sources.map((source) => <button key={`${source.id}-${source.citationId}`} onClick={() => setEvidence(source)} className="flex max-w-full items-center gap-1.5 rounded-lg border border-white/[.07] bg-black/15 px-2.5 py-1.5 text-[11px] text-white/45 transition hover:border-[#8f78d8]/30 hover:bg-[#32127A]/15 hover:text-white/70"><span className="grid size-4 shrink-0 place-items-center rounded bg-[#32127A]/40 text-[9px] text-[#c5b8f4]">{source.citationId}</span><FileText size={11} /><span className="truncate">{source.title}</span></button>)}</div></div> : null}
            <div className="mt-3 flex items-center gap-1"><button aria-label="Copy response" onClick={() => { void navigator.clipboard.writeText(message.content); toast.success(isFa ? "پاسخ کپی شد" : "Response copied"); }} className="grid size-7 place-items-center rounded-lg text-white/25 hover:bg-white/[.06] hover:text-white/70"><Copy size={13} /></button>{message.responseId && <MessageFeedback responseId={message.responseId} isFa={isFa} />}<button onClick={() => setShareOpen(true)} aria-label="Share conversation" className="grid size-7 place-items-center rounded-lg text-white/25 hover:bg-white/[.06] hover:text-white/70"><Share2 size={13} /></button></div>
          </>}
        </div>
      </article>)}
      {isThinking && <div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]"><Sparkles size={14} /></span><div className="flex gap-1.5 rounded-2xl border border-white/[.08] bg-white/[.045] px-4 py-4">{[0, 1, 2].map((item) => <span key={item} className="size-1.5 animate-bounce rounded-full bg-[#a995eb]" style={{ animationDelay: `${item * 120}ms` }} />)}</div></div>}
    </div>
    {evidence && <EvidenceDrawer source={evidence} isFa={isFa} onClose={() => setEvidence(null)} />}
    {shareOpen && <ShareDialog messages={messages} isFa={isFa} onClose={() => setShareOpen(false)} />}
  </div>;
}

function ShareDialog({ messages, isFa, onClose }: { messages: ChatMessage[]; isFa: boolean; onClose: () => void }) {
  const [visibility, setVisibility] = useState<"team" | "link">("team"); const [expiry, setExpiry] = useState<1 | 7 | 30>(7); const [saving, setSaving] = useState(false); const [created, setCreated] = useState<{ id: string; token: string } | null>(null);
  const url = created ? `${window.location.origin}/share/${visibility}/${created.token}` : "";
  const create = async () => { setSaving(true); try { const title = messages.find((item) => item.role === "user")?.content || "Shared conversation"; const result = await shareService.create(title.slice(0, 100), visibility, expiry, messages); setCreated({ id: result.id, token: result.share_token }); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  const revoke = async (id = created?.id) => { if (!id) return; try { await shareService.revoke(id); if (created?.id === id) setCreated(null); toast.success(isFa ? "دسترسی لغو شد" : "Share access revoked"); } catch (e) { toast.error((e as Error).message); } };
  return <div className="absolute inset-0 z-40 grid place-items-center rounded-[20px] bg-black/75 p-3 backdrop-blur-md"><div className="w-full max-w-sm rounded-[22px] border border-white/10 bg-[rgba(18,14,25,.98)] p-5 shadow-2xl"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">{isFa ? "اشتراک‌گذاری گفتگو" : "Share conversation"}</h3><p className="mt-1 text-[9px] text-white/25">{isFa ? "یک نسخه فقط‌خواندنی منتشر می‌شود." : "A read-only snapshot will be published."}</p></div><button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-white/30 hover:bg-white/5"><X size={14} /></button></div>{created ? <div className="mt-5"><div className="flex gap-2"><input readOnly value={url} className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-[10px] text-white/45" /><button onClick={() => { void navigator.clipboard.writeText(url); toast.success(isFa ? "لینک کپی شد" : "Link copied"); }} className="rounded-xl bg-[#32127A] px-4 text-[10px] font-semibold">{isFa ? "کپی" : "Copy"}</button></div><button onClick={() => void revoke()} className="mt-4 w-full rounded-xl border border-rose-300/10 py-2.5 text-[10px] text-rose-200/55">{isFa ? "لغو دسترسی" : "Revoke access"}</button></div> : <><div className="mt-5 grid grid-cols-2 gap-2">{(["team", "link"] as const).map((value) => <button key={value} onClick={() => setVisibility(value)} className={`rounded-xl border p-3 text-start ${visibility === value ? "border-[#8f78d8]/35 bg-[#32127A]/25" : "border-white/[.08]"}`}><p className="text-[11px] font-semibold text-white/65">{value === "team" ? (isFa ? "اعضای تیم" : "Team members") : (isFa ? "لینک عمومی" : "Public link")}</p><p className="mt-1 text-[9px] text-white/25">{value === "team" ? (isFa ? "نیازمند ورود" : "Sign-in required") : (isFa ? "هرکس لینک را دارد" : "Anyone with link")}</p></button>)}</div><div className="mt-4 flex gap-1 rounded-xl bg-black/20 p-1">{([1, 7, 30] as const).map((value) => <button key={value} onClick={() => setExpiry(value)} className={`flex-1 rounded-lg py-2 text-[9px] ${expiry === value ? "bg-[#32127A] text-white" : "text-white/30"}`}>{isFa ? `${value} روز` : `${value} days`}</button>)}</div><button disabled={saving} onClick={() => void create()} className="mt-5 h-10 w-full rounded-xl bg-[#32127A] text-[10px] font-semibold disabled:opacity-50">{saving ? "…" : isFa ? "ایجاد لینک امن" : "Create secure link"}</button></>}</div></div>;
}

function MessageFeedback({ responseId, isFa }: { responseId: string; isFa: boolean }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | "">("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const positive = async () => { setSaving(true); try { await feedbackService.save(responseId, 1); setRating(1); setOpen(false); toast.success(isFa ? "از بازخورد شما متشکریم" : "Thanks for your feedback"); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  const negative = async () => { if (!reason) return; setSaving(true); try { await feedbackService.save(responseId, -1, reason, comment.trim()); setRating(-1); setOpen(false); toast.success(isFa ? "بازخورد ثبت شد" : "Feedback saved"); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  const reasons: Array<[FeedbackReason, string]> = [
    ["incorrect", isFa ? "پاسخ اشتباه بود" : "The answer was incorrect"],
    ["irrelevant_source", isFa ? "منبع نامرتبط بود" : "The source was irrelevant"],
    ["incomplete", isFa ? "پاسخ ناقص بود" : "The answer was incomplete"],
    ["citation_issue", isFa ? "ارجاع مشکل داشت" : "The citation had an issue"],
    ["other", isFa ? "مورد دیگر" : "Something else"],
  ];
  return <div className="relative flex items-center gap-1">
    <button disabled={saving} onClick={() => void positive()} aria-label="Helpful" className={`grid size-7 place-items-center rounded-lg transition ${rating === 1 ? "bg-emerald-300/10 text-emerald-200" : "text-white/25 hover:bg-white/[.06] hover:text-white/70"}`}><ThumbsUp size={13} /></button>
    <button disabled={saving} onClick={() => setOpen(!open)} aria-label="Not helpful" className={`grid size-7 place-items-center rounded-lg transition ${rating === -1 ? "bg-rose-300/10 text-rose-200" : "text-white/25 hover:bg-white/[.06] hover:text-white/70"}`}><ThumbsDown size={13} /></button>
    {open && <div className="absolute bottom-9 start-0 z-30 w-72 rounded-2xl border border-white/10 bg-[rgba(18,14,25,.98)] p-3 shadow-2xl backdrop-blur-2xl"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-white/70">{isFa ? "مشکل پاسخ چه بود؟" : "What was wrong with the answer?"}</p><button onClick={() => setOpen(false)} className="grid size-6 place-items-center rounded-md text-white/30 hover:bg-white/5"><X size={12} /></button></div><div className="mt-2 space-y-1">{reasons.map(([value, label]) => <button key={value} onClick={() => setReason(value)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-[10px] ${reason === value ? "bg-[#32127A]/35 text-white/75" : "text-white/40 hover:bg-white/[.04]"}`}><span className={`size-2 rounded-full border ${reason === value ? "border-[#a995eb] bg-[#a995eb]" : "border-white/20"}`} />{label}</button>)}</div>{reason === "other" && <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2} placeholder={isFa ? "توضیح اختیاری..." : "Optional details..."} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-2.5 text-[10px] outline-none placeholder:text-white/20 focus:border-[#8f78d8]/40" />}<button disabled={!reason || saving} onClick={() => void negative()} className="mt-3 h-9 w-full rounded-xl bg-[#32127A] text-[10px] font-semibold disabled:opacity-40">{saving ? "…" : isFa ? "ثبت بازخورد" : "Submit feedback"}</button></div>}
  </div>;
}

function CitedText({ content, sources, onOpen }: { content: string; sources: Source[]; onOpen: (source: Source) => void }) {
  const parts = content.split(/(\[\d+\])/g);
  return <>{parts.map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/); const source = match ? sources.find((item) => item.citationId === Number(match[1])) : undefined;
    return source ? <button key={index} onClick={() => onOpen(source)} title={source.title} className="mx-0.5 inline-grid min-w-5 place-items-center rounded-md border border-[#8f78d8]/25 bg-[#32127A]/35 px-1 text-[10px] font-bold leading-5 text-[#c5b8f4] align-text-top transition hover:border-[#a995eb]/50 hover:bg-[#32127A]/60">{source.citationId}</button> : <span key={index}>{part}</span>;
  })}</>;
}

function EvidenceDrawer({ source, isFa, onClose }: { source: Source; isFa: boolean; onClose: () => void }) {
  const relevance = source.score == null ? null : Math.max(0, Math.min(100, Math.round(source.score * 100)));
  return <div className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[rgba(12,9,18,.96)] shadow-2xl backdrop-blur-2xl">
    <header className="flex shrink-0 items-center justify-between border-b border-white/[.07] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#b6a7ef]"><Quote size={15} /></span><div><p className="text-xs font-semibold">{isFa ? `شاهد شماره ${source.citationId}` : `Evidence ${source.citationId}`}</p><p className="mt-0.5 text-[10px] text-white/30">{isFa ? "متن بازیابی‌شده از منبع" : "Retrieved source passage"}</p></div></div><button onClick={onClose} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/40"><X size={15} /></button></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="rounded-2xl border border-white/[.07] bg-white/[.03] p-4"><div className="flex items-start gap-3"><FileText size={16} className="mt-0.5 shrink-0 text-[#a995eb]" /><div className="min-w-0"><p className="break-words text-xs font-semibold text-white/75">{source.title}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/30">{source.page ? <span>{isFa ? "صفحه" : "Page"} {source.page}</span> : <span>{isFa ? "بخش" : "Chunk"} {(source.chunkIndex ?? 0) + 1}</span>}{source.section && <span>· {source.section}</span>}</div></div></div></div><blockquote className="mt-4 whitespace-pre-wrap rounded-2xl border-s-2 border-[#8f78d8]/45 bg-[#32127A]/10 p-4 text-xs leading-6 text-white/60">{source.excerpt}</blockquote>{relevance !== null && <div className="mt-4"><div className="mb-2 flex justify-between text-[10px] text-white/30"><span>{isFa ? "ارتباط بازیابی" : "Retrieval relevance"}</span><span>{relevance}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#32127A] to-[#a995eb]" style={{ width: `${relevance}%` }} /></div><p className="mt-2 text-[9px] leading-4 text-white/20">{isFa ? "این مقدار امتیاز بازیابی است و میزان صحت پاسخ محسوب نمی‌شود." : "This is a retrieval score, not an answer-confidence score."}</p></div>}</div>
  </div>;
}
