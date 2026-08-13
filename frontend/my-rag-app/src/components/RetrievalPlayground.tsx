import { useState } from "react";
import { FlaskConical, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { knowledgeService, type MetadataFilters, type PlaygroundResponse } from "../services/knowledgeService";

type Props = { setId: string; documentIds: string[]; filters: MetadataFilters; isFa: boolean; onClose: () => void };

export default function RetrievalPlayground({ setId, documentIds, filters, isFa, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(5);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PlaygroundResponse | null>(null);
  const run = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    try { setData(await knowledgeService.testRetrieval(query.trim(), setId, limit, documentIds, filters)); }
    catch (error) { toast.error((error as Error).message); }
    finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[95] flex justify-end bg-black/70 backdrop-blur-sm" onMouseDown={onClose}>
    <aside onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-2xl flex-col border-s border-white/10 bg-[rgba(10,8,15,.98)] shadow-2xl">
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[.08] px-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#32127A]/30 text-[#b6a7ef]"><FlaskConical size={18} /></span><div><h2 className="text-sm font-semibold">{isFa ? "محیط آزمایش بازیابی" : "Retrieval Playground"}</h2><p className="mt-1 text-[10px] text-white/30">Hybrid → Reranker → Parent expansion</p></div></div><button onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl"><X size={16} /></button></header>
      <div className="flex shrink-0 gap-2 border-b border-white/[.07] p-4"><div className="relative min-w-0 flex-1"><Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/25" /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void run(); }} placeholder={isFa ? "یک سؤال آزمایشی وارد کنید" : "Enter a test query"} className="h-11 w-full rounded-xl border border-white/10 bg-white/[.04] ps-9 pe-3 text-sm outline-none focus:border-[#8f78d8]/40" /></div><select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="rounded-xl border border-white/10 bg-[#100e15] px-3 text-xs">{[3, 5, 8, 10].map((value) => <option key={value} value={value}>Top {value}</option>)}</select><button disabled={loading || query.trim().length < 2} onClick={() => void run()} className="rounded-xl bg-[#32127A] px-5 text-xs font-semibold disabled:opacity-40">{loading ? "…" : isFa ? "اجرا" : "Run"}</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {!data && <div className="grid min-h-64 place-items-center text-center"><div><FlaskConical className="mx-auto text-white/15" size={30} /><p className="mt-4 text-xs text-white/30">{isFa ? "برای مشاهده مراحل رتبه‌بندی، یک پرس‌وجو اجرا کنید." : "Run a query to inspect every ranking stage."}</p></div></div>}
        {data && <div className="mb-3 flex gap-2 text-[10px] text-white/35"><span>{data.scoped_document_count} {isFa ? "سند" : "documents"}</span><span>·</span><span>{data.result_count} {isFa ? "نتیجه" : "parents returned"}</span></div>}
        {data?.results.map((item, index) => <article key={`${item.chunk_id}-${index}`} className="mb-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-white/70">#{index + 1} · {item.filename}</p><p className="mt-1 text-[9px] text-white/25">Child {item.chunk_index + 1} → Parent {item.parent_index + 1}</p></div><span className="rounded-lg bg-[#32127A]/30 px-2 py-1 text-[10px] text-[#c5b8f4]">{Math.round(item.score * 100)}%</span></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Vector", item.diagnostics.vector_rank ?? "—"], ["BM25", item.diagnostics.bm25_rank ?? "—"], ["Coverage", `${Math.round(item.diagnostics.term_coverage * 100)}%`], ["Phrase", item.diagnostics.phrase_match ? "Yes" : "No"]].map(([label, value]) => <div key={label} className="rounded-lg bg-black/20 p-2"><p className="text-[8px] uppercase tracking-wider text-white/20">{label}</p><p className="mt-1 text-[10px] text-white/55">{value}</p></div>)}</div><details className="mt-3"><summary className="cursor-pointer text-[10px] text-[#b6a7ef]">{isFa ? "نمایش قطعه منطبق" : "Matched child"}</summary><p className="mt-2 whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-[10px] leading-5 text-white/40">{item.matched_child_content}</p></details><details className="mt-2"><summary className="cursor-pointer text-[10px] text-white/35">{isFa ? "نمایش متن والد ارسال‌شده" : "Expanded parent context"}</summary><p className="mt-2 whitespace-pre-wrap rounded-xl bg-black/20 p-3 text-[10px] leading-5 text-white/40">{item.content}</p></details></article>)}
        {data && !data.results.length && <div className="grid min-h-48 place-items-center text-xs text-white/25">{isFa ? "نتیجه‌ای پیدا نشد" : "No results found"}</div>}
      </div>
    </aside>
  </div>;
}
