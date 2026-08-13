import { useEffect, useMemo, useState } from "react";
import { Boxes, ChevronRight, Eye, FileText, Pencil, Power, Search, Sparkles, Tags, X } from "lucide-react";
import toast from "react-hot-toast";
import { knowledgeService, type DocumentChunk, type DocumentDetail } from "../services/knowledgeService";

type Props = { documentId: string; isAdmin: boolean; isFa: boolean; onClose: () => void };

export default function DocumentChunkInspector({ documentId, isAdmin, isFa, onClose }: Props) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [parentIndex, setParentIndex] = useState<number | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    knowledgeService.getDocument(documentId).then((result) => { if (active) setDocument(result); }).catch((error) => toast.error((error as Error).message)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [documentId]);

  useEffect(() => {
    if (document?.content_type !== "application/pdf") return;
    let objectUrl: string | null = null;
    knowledgeService.getDocumentContent(documentId).then((blob) => { objectUrl = URL.createObjectURL(blob); setPreviewUrl(objectUrl); }).catch(() => undefined);
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [document?.content_type, documentId]);

  const parents = useMemo(() => {
    if (!document) return [];
    const needle = query.trim().toLocaleLowerCase();
    const groups = new Map<number, { index: number; content: string; children: DocumentChunk[] }>();
    for (const chunk of document.chunks) {
      if (needle && !chunk.content.toLocaleLowerCase().includes(needle) && !chunk.parent_content.toLocaleLowerCase().includes(needle)) continue;
      const group = groups.get(chunk.parent_index) || { index: chunk.parent_index, content: chunk.parent_content, children: [] };
      group.children.push(chunk); groups.set(chunk.parent_index, group);
    }
    return [...groups.values()].sort((a, b) => a.index - b.index);
  }, [document, query]);

  useEffect(() => { if (parents.length && !parents.some((item) => item.index === parentIndex)) setParentIndex(parents[0].index); }, [parentIndex, parents]);
  const parent = parents.find((item) => item.index === parentIndex) || parents[0];
  const tokens = document?.chunks.reduce((sum, chunk) => sum + (chunk.token_count || 0), 0) || 0;

  const chooseChunk = (chunk: DocumentChunk) => { setSelectedChunk(chunk); if (document?.content_type === "application/pdf") setPreviewOpen(true); };
  const updateSelected = async (data: { content?: string; is_active?: boolean }) => {
    if (!document || !selectedChunk) return;
    setSaving(true);
    try {
      const updated = await knowledgeService.updateChunk(document.id, selectedChunk.id, data);
      const next = { ...document, chunks: document.chunks.map((item) => item.id === updated.id ? updated : item) };
      setDocument(next); setSelectedChunk(updated); setEditing(false);
      toast.success(isFa ? "Chunk به‌روزرسانی شد" : "Chunk updated");
    } catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  };
  const enrichSelected = async () => {
    if (!document || !selectedChunk) return;
    setSaving(true);
    try {
      const updated = await knowledgeService.enrichChunk(document.id, selectedChunk.id);
      setDocument({ ...document, chunks: document.chunks.map((item) => item.id === updated.id ? updated : item) });
      setSelectedChunk(updated); toast.success(isFa ? "Keyword و سؤال‌ها تولید شدند" : "Keywords and questions generated");
    } catch (error) { toast.error((error as Error).message); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[96] flex justify-end bg-black/70 backdrop-blur-sm" onMouseDown={onClose}><aside onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-5xl flex-col border-s border-white/10 bg-[rgba(9,7,13,.98)] shadow-2xl">
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[.08] px-5"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#32127A]/30 text-[#b6a7ef]"><Boxes size={18} /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold">{isFa ? "بازرس سند و قطعه‌ها" : "Document / Chunk Inspector"}</h2><p className="mt-1 truncate text-[10px] text-white/30">{document?.filename || (isFa ? "در حال بارگذاری…" : "Loading…")}</p></div></div><button onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl"><X size={16} /></button></header>
    {loading ? <div className="grid flex-1 place-items-center"><span className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-[#a995eb]" /></div> : document && <>
      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-white/[.07] p-4 sm:grid-cols-4">{[[isFa ? "Parentها" : "Parents", parents.length], [isFa ? "Childها" : "Children", document.chunks.length], [isFa ? "توکن‌ها" : "Tokens", tokens || "—"], [isFa ? "وضعیت" : "Status", document.status]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[.06] bg-white/[.025] p-3"><p className="text-[9px] text-white/25">{label}</p><p className="mt-1 text-xs font-semibold text-white/65">{value}</p></div>)}</div>
      <div className="flex shrink-0 gap-2 border-b border-white/[.07] p-4"><label className="relative min-w-0 flex-1"><Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/25" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isFa ? "جست‌وجو در متن قطعه‌ها…" : "Search inside chunks…"} className="h-10 w-full rounded-xl border border-white/[.08] bg-white/[.035] ps-9 pe-3 text-xs outline-none focus:border-[#8f78d8]/40" /></label>{document.content_type === "application/pdf" && <button disabled={!previewUrl} onClick={() => setPreviewOpen((value) => !value)} className={`flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-[10px] font-semibold ${previewOpen ? "border-[#8f78d8]/35 bg-[#32127A]/30 text-[#c5b8f4]" : "border-white/[.08] text-white/40"}`}><Eye size={14} /><span className="hidden sm:inline">{isFa ? "پیش‌نمایش PDF" : "PDF preview"}</span></button>}</div>
      {previewOpen && previewUrl && <div className="grid h-[44%] min-h-[260px] shrink-0 border-b border-white/[.07] bg-black/20 md:grid-cols-[1fr_310px]"><iframe title={document.filename} src={`${previewUrl}#page=${selectedChunk?.page_number || 1}&view=FitH`} className="h-full w-full bg-white" /><aside className="min-h-0 overflow-y-auto border-s border-white/[.07] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold text-[#b6a7ef]">{isFa ? "منبع انتخاب‌شده" : "Selected source"}</p>{selectedChunk?.page_number && <span className="rounded-lg bg-[#32127A]/30 px-2 py-1 text-[9px] text-[#c5b8f4]">{isFa ? "صفحه" : "Page"} {selectedChunk.page_number}</span>}</div>{selectedChunk ? <HighlightedSource text={selectedChunk.content} query={query} /> : <p className="mt-5 text-[10px] leading-5 text-white/25">{isFa ? "یک Child Chunk را انتخاب کنید تا منبع آن برجسته شود." : "Select a child chunk to highlight its source."}</p>}</aside></div>}
      {selectedChunk && <ChunkEnrichment chunk={selectedChunk} isFa={isFa} isAdmin={isAdmin} saving={saving} onEnrich={() => void enrichSelected()} />}
      {isAdmin && selectedChunk && <div className="shrink-0 border-b border-white/[.07] bg-[#32127A]/[.07] p-3">{editing ? <div><textarea autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} className="max-h-40 min-h-24 w-full resize-y rounded-xl border border-[#8f78d8]/25 bg-black/30 p-3 text-xs leading-5 text-white/65 outline-none focus:border-[#8f78d8]/55" /><div className="mt-2 flex justify-end gap-2"><button onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-[10px] text-white/35">{isFa ? "انصراف" : "Cancel"}</button><button disabled={saving || draft.trim().length < 20} onClick={() => void updateSelected({ content: draft.trim() })} className="rounded-lg bg-[#32127A] px-4 py-2 text-[10px] font-semibold disabled:opacity-40">{isFa ? "ذخیره تغییرات" : "Save changes"}</button></div></div> : <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-[10px] font-semibold text-white/55">CHILD {selectedChunk.chunk_index + 1}</p><p className={`mt-1 text-[9px] ${selectedChunk.is_active ? "text-emerald-300/55" : "text-amber-300/60"}`}>{selectedChunk.is_active ? (isFa ? "فعال در Retrieval" : "Active in retrieval") : (isFa ? "غیرفعال و خارج از Retrieval" : "Disabled from retrieval")}</p></div><div className="flex gap-2"><button onClick={() => { setDraft(selectedChunk.content); setEditing(true); }} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/[.08] px-3 text-[10px] text-white/45"><Pencil size={12} />{isFa ? "ویرایش" : "Edit"}</button><button disabled={saving} onClick={() => void updateSelected({ is_active: !selectedChunk.is_active })} className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[10px] ${selectedChunk.is_active ? "border-amber-300/15 text-amber-200/60" : "border-emerald-300/15 text-emerald-200/60"}`}><Power size={12} />{selectedChunk.is_active ? (isFa ? "غیرفعال‌کردن" : "Disable") : (isFa ? "فعال‌کردن" : "Enable")}</button></div></div>}</div>}
      <div className="grid min-h-0 flex-1 md:grid-cols-[250px_1fr]"><nav className="min-h-0 overflow-y-auto border-e border-white/[.07] p-3">{parents.map((item) => <button key={item.index} onClick={() => setParentIndex(item.index)} className={`mb-1 flex w-full items-center gap-3 rounded-xl p-3 text-start ${parent?.index === item.index ? "bg-[#32127A]/25 text-white/75" : "text-white/35 hover:bg-white/[.035]"}`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-black/20 text-[10px] font-semibold">P{item.index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{isFa ? "بخش والد" : "Parent block"} {item.index + 1}</span><span className="mt-1 block text-[9px] text-white/25">{item.children.length} child · {item.content.length} chars</span></span><ChevronRight size={12} /></button>)}</nav>
        <section className="min-h-0 overflow-y-auto p-4">{parent && <><div className="rounded-2xl border border-[#8f78d8]/15 bg-[#32127A]/10 p-4"><div className="mb-3 flex justify-between"><span className="text-[10px] font-semibold text-[#b6a7ef]">PARENT {parent.index + 1}</span><span className="text-[9px] text-white/25">{parent.content.length} chars</span></div><p className="whitespace-pre-wrap text-xs leading-6 text-white/55">{parent.content}</p></div><p className="my-4 text-[9px] font-semibold uppercase tracking-[.14em] text-white/25">{isFa ? "قطعه‌های فرزند" : "Child chunks"}</p><div className="space-y-3">{parent.children.map((chunk) => <button key={chunk.id} onClick={() => chooseChunk(chunk)} className={`block w-full rounded-2xl border p-4 text-start transition ${selectedChunk?.id === chunk.id ? "border-[#8f78d8]/40 bg-[#32127A]/15" : "border-white/[.07] bg-white/[.025] hover:bg-white/[.04]"}`}><div className="mb-3 flex justify-between gap-2"><span className="flex items-center gap-2 text-[10px] font-semibold text-white/55"><FileText size={13} className="text-[#a995eb]" />CHILD {chunk.chunk_index + 1}</span><span className="text-[9px] text-white/25">{chunk.page_number ? `${isFa ? "صفحه" : "Page"} ${chunk.page_number} · ` : ""}{chunk.content.length} chars</span></div><p className="whitespace-pre-wrap text-xs leading-6 text-white/45">{chunk.content}</p></button>)}</div></>}</section>
      </div>
    </>}
  </aside></div>;
}

function ChunkEnrichment({ chunk, isFa, isAdmin, saving, onEnrich }: { chunk: DocumentChunk; isFa: boolean; isAdmin: boolean; saving: boolean; onEnrich: () => void }) {
  const empty = !chunk.keywords.length && !chunk.suggested_questions.length;
  return <div className="max-h-48 shrink-0 overflow-y-auto border-b border-white/[.07] bg-white/[.012] px-4 py-3"><div className="flex items-center justify-between"><p className="flex items-center gap-2 text-[10px] font-semibold text-white/45"><Sparkles size={12} className="text-[#a995eb]" />{isFa ? "درک معنایی Chunk" : "Chunk intelligence"}</p>{isAdmin && <button disabled={saving} onClick={onEnrich} className="rounded-lg border border-[#8f78d8]/15 px-2.5 py-1.5 text-[9px] text-[#b6a7ef] disabled:opacity-40">{empty ? (isFa ? "تولید" : "Generate") : (isFa ? "تولید مجدد" : "Regenerate")}</button>}</div>{empty ? <p className="mt-3 text-[9px] text-white/20">{isFa ? "برای این Chunk هنوز Keyword یا سؤال پیشنهادی تولید نشده است." : "No keywords or suggested questions have been generated yet."}</p> : <div className="mt-3 grid gap-3 md:grid-cols-2"><div><p className="mb-2 flex items-center gap-1.5 text-[9px] text-white/25"><Tags size={10} />Keywords</p><div className="flex flex-wrap gap-1.5">{chunk.keywords.map((keyword) => <span key={keyword} className="rounded-lg border border-[#8f78d8]/15 bg-[#32127A]/15 px-2 py-1 text-[9px] text-[#c5b8f4]/75">{keyword}</span>)}</div></div><div><p className="mb-2 text-[9px] text-white/25">{isFa ? "سؤال‌های پیشنهادی" : "Suggested questions"}</p><ul className="space-y-1.5">{chunk.suggested_questions.map((question) => <li key={question} className="text-[9px] leading-4 text-white/40">• {question}</li>)}</ul></div></div>}</div>;
}

function HighlightedSource({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <mark className="mt-4 block whitespace-pre-wrap rounded-xl bg-[#32127A]/25 p-3 text-[11px] leading-6 text-white/65">{text}</mark>;
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white/[.025] p-3 text-[11px] leading-6 text-white/55">{parts.map((part, index) => part.toLocaleLowerCase() === needle.toLocaleLowerCase() ? <mark key={index} className="rounded bg-[#6f4bc4]/55 px-0.5 text-white">{part}</mark> : part)}</p>;
}
