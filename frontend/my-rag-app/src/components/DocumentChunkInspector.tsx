import { useEffect, useMemo, useState } from "react";
import { Boxes, ChevronDown, FileText, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { knowledgeService, type DocumentDetail } from "../services/knowledgeService";

type Props = { documentId: string; isFa: boolean; onClose: () => void };

export default function DocumentChunkInspector({ documentId, isFa, onClose }: Props) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedParent, setSelectedParent] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    knowledgeService.getDocument(documentId).then((result) => { if (active) setDocument(result); }).catch((error) => toast.error((error as Error).message)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId]);

  const parents = useMemo(() => {
    if (!document) return [];
    const normalized = query.trim().toLocaleLowerCase();
    const groups = new Map<number, { parent_index: number; parent_content: string; children: DocumentDetail["chunks"] }>();
    for (const chunk of document.chunks) {
      if (normalized && !chunk.content.toLocaleLowerCase().includes(normalized) && !chunk.parent_content.toLocaleLowerCase().includes(normalized)) continue;
      const group = groups.get(chunk.parent_index) || { parent_index: chunk.parent_index, parent_content: chunk.parent_content, children: [] };
      group.children.push(chunk); groups.set(chunk.parent_index, group);
    }
    return [...groups.values()].sort((a, b) => a.parent_index - b.parent_index);
  }, [document, query]);

  useEffect(() => { if (parents.length && selectedParent === null) setSelectedParent(parents[0].parent_index); }, [parents, selectedParent]);
  const activeParent = parents.find((item) => item.parent_index === selectedParent) || parents[0];
  const tokenTotal = document?.chunks.reduce((total, chunk) => total + (chunk.token_count || 0), 0) || 0;

  return <div className="fixed inset-0 z-[96] flex justify-end bg-black/70 backdrop-blur-sm" onMouseDown={onClose}>
    <aside onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-4xl flex-col border-s border-white/10 bg-[rgba(9,7,13,.98)] shadow-2xl">
      <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[.08] px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#32127A]/30 text-[#b6a7ef]"><Boxes size={18} /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{isFa ? "بازرس سند و قطعه‌ها" : "Document / Chunk Inspector"}</h2><p className="mt-1 truncate text-[10px] text-white/30">{document?.filename || (isFa ? "در حال بارگذاری…" : "Loading…")}</p></div></div><button onClick={onClose} className="app-icon-button grid size-9 shrink-0 place-items-center rounded-xl"><X size={16} /></button></header>
      {loading ? <div className="grid flex-1 place-items-center"><span className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-[#a995eb]" /></div> : document && <>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-white/[.07] p-4 sm:grid-cols-4">{[[isFa ? "Parentها" : "Parents", parents.length], [isFa ? "Childها" : "Children", document.chunks.length], [isFa ? "توکن‌ها" : "Tokens", tokenTotal || "—"], [isFa ? "وضعیت" : "Status", document.status]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.025] p-3"><p className="text-[9px] text-white/25">{label}</p><p className="mt-1 text-xs font-semibold text-white/65">{value}</p></div>)}</div>
        <div className="relative shrink-0 border-b border-white/[.07] p-4"><Search size={14} className="absolute start-7 top-1/2 -translate-y-1/2 text-white/25" /><input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedParent(null); }} placeholder={isFa ? "جست‌وجو در متن قطعه‌ها…" : "Search inside chunks…"} className="h-10 w-full rounded-xl border border-white/[.08] bg-white/[.035] ps-9 pe-3 text-xs outline-none focus:border-[#8f78d8]/40" /></div>
        <div className="grid min-h-0 flex-1 md:grid-cols-[260px_1fr]">
          <nav className="min-h-0 overflow-y-auto border-e border-white/[.07] p-3">{parents.map((parent) => <button key={parent.parent_index} onClick={() => setSelectedParent(parent.parent_index)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-start transition ${activeParent?.parent_index === parent.parent_index ? "bg-[#32127A]/25 text-white/75" : "text-white/35 hover:bg-white/[.035]"}`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/20 text-[10px] font-semibold">P{parent.parent_index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{isFa ? "بخش والد" : "Parent block"} {parent.parent_index + 1}</span><span className="mt-1 block text-[9px] text-white/25">{parent.children.length} child · {parent.parent_content.length} chars</span></span><ChevronDown size={12} className="-rotate-90" /></button>)}{!parents.length && <div className="grid min-h-32 place-items-center text-center text-[10px] text-white/25">{isFa ? "قطعه‌ای پیدا نشد" : "No chunks found"}</div>}</nav>
          <section className="min-h-0 overflow-y-auto p-4">{activeParent && <><div className="rounded-2xl border border-[#8f78d8]/15 bg-[#32127A]/10 p-4"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold text-[#b6a7ef]">PARENT {activeParent.parent_index + 1}</span><span className="text-[9px] text-white/25">{activeParent.parent_content.length} characters</span></div><p className="whitespace-pre-wrap text-xs leading-6 text-white/55">{activeParent.parent_content}</p></div><div className="my-4 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/25"><span className="h-px flex-1 bg-white/[.06]" />{isFa ? "قطعه‌های فرزند" : "Child chunks"}<span className="h-px flex-1 bg-white/[.06]" /></div><div className="space-y-3">{activeParent.children.map((chunk) => <article key={chunk.id} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><FileText size={13} className="text-[#a995eb]" /><span className="text-[10px] font-semibold text-white/55">CHILD {chunk.chunk_index + 1}</span></div><span className="text-[9px] text-white/25">{chunk.token_count ? `${chunk.token_count} tokens · ` : ""}{chunk.content.length} chars</span></div><p className="whitespace-pre-wrap text-xs leading-6 text-white/45">{chunk.content}</p><p className="mt-3 truncate border-t border-white/[.05] pt-2 font-mono text-[8px] text-white/15">{chunk.id}</p></article>)}</div></>}</section>
        </div>
      </>}
    </aside>
  </div>;
}
