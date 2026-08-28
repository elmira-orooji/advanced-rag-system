import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUpRight, Play, LoaderCircle, Bot, Database, FlaskConical, GitCompareArrows, ListFilter, Search, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import { knowledgeService, type MetadataFilters, type PipelineTraceResponse } from "../services/knowledgeService";
import "./RetrievalPlayground.css";
import EvaluationDataset from "./EvaluationDataset";
import RetrieverComparison from "./RetrieverComparison";

type Props = { setId: string; documentIds: string[]; filters: MetadataFilters; isFa: boolean; canManage: boolean; onClose: () => void };
const icons = { question: Search, retrieval: ListFilter, rerank: Sparkles, answer: Bot };

export default function RetrievalPlayground({ setId, documentIds, filters, isFa, canManage, onClose }: Props) {
  const panel = useRef<HTMLElement>(null);
  const running = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLInputElement>("#trace-query-input")?.focus();
    return () => { previous?.focus(); };
  }, []);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [trace, setTrace] = useState<PipelineTraceResponse | null>(null);
  const [datasetOpen, setDatasetOpen] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const run = async () => { if (query.trim().length < 2 || running.current) return; running.current = true; setLoading(true); try { setTrace(await knowledgeService.tracePipeline(query.trim(), setId, limit, documentIds, filters)); } catch (error) { toast.error((error as Error).message); } finally { running.current = false; setLoading(false); } };

  const labels = isFa ? { title: "ردیابی کامل RAG", sub: "سؤال ← بازیابی ← بازرتبه‌بندی ← پاسخ", placeholder: "یک سؤال آزمایشی وارد کنید", run: "اجرای کامل", total: "زمان کل", grounded: "پاسخ مستند", ungrounded: "بدون استناد", empty: "یک سؤال اجرا کنید تا مسیر کامل تصمیم‌گیری سیستم نمایش داده شود.", question: "سؤال", retrieval: "بازیابی", rerank: "بازرتبه‌بندی", answer: "پاسخ" } : { title: "Full RAG Trace", sub: "Question → Retrieval → Rerank → Answer", placeholder: "Enter a test question", run: "Run pipeline", total: "Total time", grounded: "Grounded", ungrounded: "Ungrounded", empty: "Run a question to inspect the complete decision path.", question: "Question", retrieval: "Retrieval", rerank: "Rerank", answer: "Answer" };

  const steps = ["question", "retrieval", "rerank", "answer"] as const;
  const descriptions = isFa
    ? ["پرسش و محدودهٔ جست‌وجو", "یافتن بخش‌های مرتبط اسناد", "مرتب‌سازی بر اساس ارتباط", "تولید پاسخ با استناد به منابع"]
    : ["Define your question and scope", "Find relevant document passages", "Rank the strongest matches", "Generate an answer with sources"];

  return createPortal(<div className="app-shell trace-overlay" style={{ background: "#18213380", fontFamily: isFa ? "Vazirmatn, sans-serif" : "Inter, sans-serif" }} onMouseDown={onClose}>
    <aside ref={panel} className="trace-panel" dir={isFa ? "rtl" : "ltr"} role="dialog" aria-modal="true" aria-labelledby="trace-heading" onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => {
        if (datasetOpen || comparisonOpen) return;
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        if (event.key === "Tab") {
          const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]') ?? []).filter((element) => element.getClientRects().length > 0);
          const first = focusable[0]; const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }}>
      <header className="trace-header">
        <div className="trace-heading"><span className="trace-logo"><FlaskConical size={22} /></span><div><p className="trace-eyebrow">{isFa ? "آزمایشگاه بازیابی" : "RETRIEVAL LAB"}</p><h2 id="trace-heading">{labels.title}</h2></div></div>
        <nav className="trace-actions" aria-label={isFa ? "ابزارهای آزمایش" : "Testing tools"}>
          <button onClick={() => setComparisonOpen(true)}><GitCompareArrows size={16} /><span>{isFa ? "مقایسه A/B" : "A/B compare"}</span></button>
          <button onClick={() => setDatasetOpen(true)}><Database size={16} /><span>{isFa ? "مجموعه ارزیابی" : "Dataset"}</span></button>
          <button className="trace-close" onClick={onClose} aria-label={isFa ? "بستن" : "Close trace"}><X size={19} /></button>
        </nav>
      </header>
      <form className="trace-query" onSubmit={(event) => { event.preventDefault(); void run(); }}>
        <div className="trace-query-heading"><label htmlFor="trace-query-input">{isFa ? "پرسش آزمایشی" : "Test question"}</label><span><Database size={12} />{documentIds.length ? (isFa ? `${documentIds.length} سند انتخاب‌شده` : `${documentIds.length} selected documents`) : (isFa ? "پایگاه دانش فعلی" : "Current knowledge base")}</span></div>
        <div className="trace-query-controls"><div className="trace-input"><Search size={18} /><input id="trace-query-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.placeholder} disabled={loading} /></div>
        <label className="trace-limit"><span>{isFa ? "تعداد نتایج" : "Top K"}</span><select aria-label={isFa ? "تعداد نتایج بازیابی" : "Retrieval result limit"} value={limit} disabled={loading} onChange={(event) => setLimit(Number(event.target.value))}>{[3, 5, 8].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <button className="trace-run" type="submit" disabled={loading || query.trim().length < 2}>{loading ? <LoaderCircle size={16} className="trace-spinner" /> : <Play size={15} />} {loading ? (isFa ? "در حال اجرا…" : "Running…") : labels.run}</button></div>
        <p className="trace-query-hint">{isFa ? "بازیابی، رتبه‌بندی و منابع پاسخ را در یک مسیر بررسی کنید." : "Inspect retrieval, ranking, and answer sources in a single run."}</p>
      </form>
      <div className="trace-body" aria-busy={loading}>
        {loading && <div className="trace-progress" role="status"><LoaderCircle size={16} className="trace-spinner" />{isFa ? "در حال بازیابی منابع و ساخت پاسخ…" : "Retrieving sources and generating your answer…"}</div>}
        {!trace ? <div className="trace-empty">
          <span className="trace-empty-icon"><FlaskConical size={30} /></span>
          <p className="trace-eyebrow">{isFa ? "از پرسش تا پاسخ" : "FROM QUESTION TO ANSWER"}</p>
          <h3>{isFa ? "پشت صحنهٔ پاسخ را ببینید" : "See how your answer comes together"}</h3>
          <p className="trace-empty-description">{labels.empty}</p>
          <ol className="trace-path">{steps.map((step, index) => { const Icon = icons[step]; return <li key={step}><div className="trace-path-top"><Icon size={20} /><span>0{index + 1}</span></div><h4>{labels[step]}</h4><p>{descriptions[index]}</p>{index < 3 && <ArrowUpRight className="trace-path-arrow" size={14} />}</li>; })}</ol>
          <p className="trace-empty-note">{isFa ? "برای شروع، پرسشی دربارهٔ اسناد این پایگاه دانش وارد کنید." : "Start with a question about the documents in this knowledge base."}</p>
        </div> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] text-white/25">{labels.total}</p><p className="mt-1 text-lg font-semibold text-white/75">{trace.total_duration_ms.toLocaleString()} ms</p></div><span className={`rounded-full border px-3 py-1.5 text-[10px] ${trace.grounded ? "border-emerald-300/15 bg-emerald-300/[.05] text-emerald-200/65" : "border-amber-300/15 bg-amber-300/[.05] text-amber-200/65"}`}>{trace.grounded ? labels.grounded : labels.ungrounded}</span></div>
      <div className="grid gap-2 sm:grid-cols-4">{trace.stages.map((stage, index) => { const Icon = icons[stage.key]; return <div key={stage.key} className="relative rounded-2xl border border-white/[.08] bg-white/[.025] p-4">{index < trace.stages.length - 1 && <ArrowDown size={12} className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 text-[#18c7f4] sm:-right-3 sm:bottom-auto sm:left-auto sm:top-1/2 sm:-translate-y-1/2 sm:-rotate-90" />}<div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-lg bg-[#7c27ff]/25 text-[#d9a6ff]"><Icon size={14} /></span><span className="text-[9px] text-white/25">{stage.duration_ms} ms</span></div><p className="mt-3 text-[11px] font-semibold text-white/65">{labels[stage.key]}</p><p className="mt-1 text-[9px] text-white/25">{stage.input_count} in → {stage.output_count} out</p></div>; })}</div>
      <section className="mt-5 rounded-2xl border border-white/[.08] bg-white/[.02] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-white/25">01 · {labels.question}</p><p className="mt-3 text-sm leading-6 text-white/70">{trace.question}</p></section>
      <section className="mt-3 rounded-2xl border border-white/[.08] bg-white/[.02] p-4"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-white/25">02–03 · {labels.retrieval} + {labels.rerank}</p><div className="mt-3 space-y-2">{trace.results.map((item, index) => <details key={`${item.chunk_id}-${index}`} className="rounded-xl border border-white/[.06] bg-black/15 p-3"><summary className="flex cursor-pointer list-none items-center justify-between gap-3"><span className="min-w-0 truncate text-[10px] font-semibold text-white/55">#{index + 1} · {item.filename} · Child {item.chunk_index + 1}</span><span className="shrink-0 rounded-lg bg-[#7c27ff]/25 px-2 py-1 text-[9px] text-[#e6c7ff]">{Math.round(item.score * 100)}%</span></summary><div className="mt-3 grid grid-cols-3 gap-2">{[["Vector", item.diagnostics.vector_rank ?? "—"], ["BM25", item.diagnostics.bm25_rank ?? "—"], ["Rerank", item.diagnostics.reranker_score.toFixed(3)]].map(([name, value]) => <div key={name} className="rounded-lg bg-white/[.025] p-2"><p className="text-[8px] text-white/20">{name}</p><p className="mt-1 text-[9px] text-white/50">{value}</p></div>)}</div><p className="mt-3 whitespace-pre-wrap text-[10px] leading-5 text-white/35">{item.matched_child_content}</p></details>)}</div></section>
      <section className="mt-3 rounded-2xl border border-[#18c7f4]/15 bg-[#7c27ff]/10 p-4"><div className="flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#d9a6ff]">04 · {labels.answer}</p><span className="text-[9px] text-white/25">{trace.citations.length} citations</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">{trace.answer}</p>{trace.citations.length > 0 && <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[.07] pt-3">{trace.citations.map((citation) => <span key={citation.id} className="rounded-lg border border-white/[.07] bg-black/15 px-2.5 py-1.5 text-[9px] text-white/40">[{citation.id}] {citation.filename}</span>)}</div>}</section>
      {trace.usage && <section className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/[.07] bg-white/[.02] p-3 sm:grid-cols-5">{[["Model", trace.usage.model], ["LLM latency", `${trace.usage.latency_ms} ms`], ["Input", trace.usage.prompt_tokens], ["Output", trace.usage.completion_tokens], ["Cost", `$${trace.usage.estimated_cost_usd.toFixed(6)}`]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-black/15 p-2"><p className="text-[8px] text-white/20">{label}</p><p className="mt-1 truncate text-[9px] text-white/50">{value}</p></div>)}</section>}
    </>}</div>
    {datasetOpen && <EvaluationDataset setId={setId} documentIds={documentIds} filters={filters} isFa={isFa} canManage={canManage} onClose={() => setDatasetOpen(false)} />}
    {comparisonOpen && <RetrieverComparison setId={setId} query={query} documentIds={documentIds} filters={filters} isFa={isFa} onClose={() => setComparisonOpen(false)} />}
  </aside></div>, document.body);
}
