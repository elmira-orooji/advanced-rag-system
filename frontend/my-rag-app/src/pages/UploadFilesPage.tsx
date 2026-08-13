import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  BookOpen, Check, ChevronDown, FileText, FolderKanban, GitBranch as Github, Globe2, Link2, MessageSquareText, MoreHorizontal,
  FlaskConical, PanelRightClose, Pencil, Plus, RefreshCw, ScanSearch, Search, SlidersHorizontal, Sparkles, Telescope, Trash2, UploadCloud, Zap, X, Filter,
} from "lucide-react";
import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import RetrievalPlayground from "../components/RetrievalPlayground";
import DocumentChunkInspector from "../components/DocumentChunkInspector";
import { authService } from "../services/authService";
import { knowledgeService, type DocumentSet, type KnowledgeDocument, type MetadataFilters, type ResearchResponse } from "../services/knowledgeService";
import type { ChatMessage } from "../types/chat";
import { connectorService, type Connector } from "../services/connectorService";

export default function UploadFilesPage() {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const isAdmin = authService.getUser()?.role === "admin";
  const [sets, setSets] = useState<DocumentSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [chatOpen, setChatOpen] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [connectorDialog, setConnectorDialog] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [answerMode, setAnswerMode] = useState<"quick" | "research">("quick");
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilters>({});
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  const copy = isFa ? {
    eyebrow: "مدیریت منابع", title: "پایگاه دانش", subtitle: "اسناد را در مجموعه‌های موضوعی سازمان‌دهی کنید و پاسخ‌ها را به همان محدوده محدود کنید.",
    sets: "مجموعه‌های دانش", newSet: "مجموعه جدید", allDocs: "همه اسناد", documents: "سند", indexed: "آماده",
    drop: "فایل را در این مجموعه رها کنید", browse: "یا برای انتخاب کلیک کنید", formats: "PDF و TXT تا ۱۰ مگابایت",
    library: "اسناد مجموعه", search: "جست‌وجوی اسناد...", allStatuses: "همه وضعیت‌ها", empty: "این مجموعه هنوز سندی ندارد.",
    chatTitle: "دستیار دانش", chatSub: "پرسش در محدوده مجموعه انتخاب‌شده", chatEmpty: "پاسخ‌های مبتنی بر مجموعه", chatHint: "یک مجموعه را انتخاب کنید و درباره اسناد آن سؤال بپرسید.", allSources: "همه اسناد مجموعه", selectedSources: "اسناد انتخاب‌شده", chooseSources: "انتخاب محدوده پاسخ", clearSelection: "استفاده از همه",
    createTitle: "ایجاد مجموعه دانش", editTitle: "ویرایش مجموعه", name: "نام مجموعه", description: "توضیحات", cancel: "انصراف", save: "ذخیره", create: "ایجاد مجموعه", edit: "ویرایش", delete: "حذف مجموعه",
    connect: "اتصال منبع", connected: "منابع متصل",
  } : {
    eyebrow: "Source management", title: "Knowledge base", subtitle: "Organize documents into focused collections and keep every answer within the right scope.",
    sets: "Knowledge sets", newSet: "New set", allDocs: "All documents", documents: "documents", indexed: "ready",
    drop: "Drop files into this set", browse: "or click to browse", formats: "PDF and TXT up to 10 MB",
    library: "Set documents", search: "Search documents...", allStatuses: "All statuses", empty: "This set has no documents yet.",
    chatTitle: "Knowledge assistant", chatSub: "Search within the selected set", chatEmpty: "Set-grounded answers", chatHint: "Select a knowledge set, then ask questions across its documents.", allSources: "All documents in set", selectedSources: "Selected documents", chooseSources: "Choose answer scope", clearSelection: "Use all documents",
    createTitle: "Create knowledge set", editTitle: "Edit knowledge set", name: "Set name", description: "Description", cancel: "Cancel", save: "Save changes", create: "Create set", edit: "Edit", delete: "Delete set",
    connect: "Connect source", connected: "Connected sources",
  };

  const selectedSet = sets.find((item) => item.id === selectedSetId);

  const loadSets = useCallback(async () => {
    try {
      const result = await knowledgeService.listSets();
      setSets(result);
      setSelectedSetId((current) => current && result.some((item) => item.id === current) ? current : result[0]?.id || "");
    } catch (error) { toast.error((error as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSets(); }, [loadSets]);
  useEffect(() => {
    if (!selectedSetId) { setDocuments([]); return; }
    setLoading(true);
    knowledgeService.listDocuments(selectedSetId)
      .then(setDocuments)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
    connectorService.list(selectedSetId).then(setConnectors).catch(() => setConnectors([]));
    setChatMessages([]);
    setSelectedDocumentIds([]);
    setScopeOpen(false);
  }, [selectedSetId]);
  useEffect(() => {
    const availableIds = new Set(documents.filter((item) => item.status === "indexed").map((item) => item.id));
    setSelectedDocumentIds((current) => current.filter((id) => availableIds.has(id)));
  }, [documents]);
  useEffect(() => {
    if (!selectedSetId || !documents.some((item) => ["queued", "processing"].includes(item.status))) return;
    const timer = window.setInterval(() => {
      knowledgeService.listDocuments(selectedSetId).then(setDocuments).catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [documents, selectedSetId]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!selectedSetId || !files.length) return;
    setUploading(true);
    try {
      for (const file of files) await knowledgeService.uploadDocument(file, selectedSetId);
      toast.success(isFa ? "اسناد پردازش و به مجموعه اضافه شدند" : "Documents processed and added to the set");
      setDocuments(await knowledgeService.listDocuments(selectedSetId));
      await loadSets();
    } catch (error) { toast.error((error as Error).message); }
    finally { setUploading(false); }
  }, [isFa, loadSets, selectedSetId]);

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    onDrop, noClick: true, disabled: !selectedSetId || uploading, maxSize: 10 * 1024 * 1024,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    onDropRejected: () => toast.error(isFa ? "نوع یا حجم فایل مجاز نیست" : "Unsupported file type or size"),
  });

  const filtered = useMemo(() => documents.filter((item) =>
    item.filename.toLowerCase().includes(query.toLowerCase()) && (statusFilter === "all" || item.status === statusFilter)
  ), [documents, query, statusFilter]);

  const handleChatMessage = async (content: string) => {
    if (!selectedSetId) return toast.error(isFa ? "ابتدا یک مجموعه انتخاب کنید" : "Select a knowledge set first");
    setChatMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() }]);
    setIsThinking(true);
    try {
      const isResearch = answerMode === "research";
      const result = isResearch ? await knowledgeService.research(content, selectedSetId, selectedDocumentIds, metadataFilters) : await knowledgeService.ask(content, selectedSetId, selectedDocumentIds, metadataFilters);
      setChatMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant", content: result.answer, responseId: result.response_id, createdAt: new Date().toISOString(),
        grounded: result.grounded,
        research: isResearch ? { steps: (result as ResearchResponse).steps, evidenceReviewed: (result as ResearchResponse).evidence_reviewed } : undefined,
        sources: result.citations.map((citation) => ({
          id: citation.chunk_id,
          citationId: citation.id,
          documentId: citation.document_id,
          title: citation.filename,
          chunkIndex: citation.chunk_index,
          excerpt: citation.excerpt,
          score: citation.score,
          page: citation.page,
          section: citation.section,
        })),
      }]);
    } catch (error) { toast.error((error as Error).message); }
    finally { setIsThinking(false); }
  };

  const deleteSet = async () => {
    if (!selectedSet || !confirm(isFa ? `مجموعه «${selectedSet.name}» حذف شود؟ اسناد حذف نمی‌شوند.` : `Delete “${selectedSet.name}”? Documents will be kept.`)) return;
    try { await knowledgeService.deleteSet(selectedSet.id); setMenuOpen(false); toast.success(isFa ? "مجموعه حذف شد" : "Set deleted"); await loadSets(); }
    catch (error) { toast.error((error as Error).message); }
  };

  return <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative flex h-full overflow-hidden">
    <main className="min-w-0 flex-1 overflow-hidden px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full w-full max-w-[980px] flex-col gap-5">
        <header className="flex shrink-0 items-end justify-between gap-4">
          <div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#a995eb]"><span className="size-1.5 rounded-full bg-[#8f78d8]" />{copy.eyebrow}</div><h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">{copy.subtitle}</p></div>
          <div className="flex items-center gap-2">{selectedSetId && <button onClick={() => setPlaygroundOpen(true)} className="app-icon-button flex h-11 items-center gap-2 rounded-xl px-3 text-xs text-[#b6a7ef] sm:px-4"><FlaskConical size={16} /><span className="hidden sm:inline">{isFa ? "آزمایش بازیابی" : "Playground"}</span></button>}{!chatOpen && <button onClick={() => setChatOpen(true)} className="app-icon-button hidden h-11 items-center gap-2 rounded-xl px-4 text-sm text-white/65 sm:flex"><MessageSquareText size={17} />{copy.chatTitle}</button>}</div>
        </header>

        <section className="shrink-0">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.14em] text-white/35">{copy.sets}</h2>{isAdmin && <button onClick={() => setDialog("create")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#b6a7ef] hover:bg-[#32127A]/20"><Plus size={14} />{copy.newSet}</button>}</div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
            {sets.map((item) => <button key={item.id} onClick={() => setSelectedSetId(item.id)} className={`min-w-[210px] rounded-2xl border p-4 text-start transition ${selectedSetId === item.id ? "border-[#8f78d8]/45 bg-[#32127A]/25 shadow-[0_12px_35px_rgba(50,18,122,.2)]" : "border-white/[.07] bg-white/[.025] hover:bg-white/[.045]"}`}><div className="flex items-start justify-between"><span className={`grid size-9 place-items-center rounded-xl ${selectedSetId === item.id ? "bg-[#8f78d8]/20 text-[#b6a7ef]" : "bg-white/[.04] text-white/35"}`}><FolderKanban size={17} /></span>{selectedSetId === item.id && <span className="mt-1 size-1.5 rounded-full bg-[#a995eb] shadow-[0_0_10px_#a995eb]" />}</div><p className="mt-3 truncate text-sm font-semibold text-white/80">{item.name}</p><p className="mt-1 line-clamp-1 text-[11px] text-white/30">{item.description || (isFa ? "بدون توضیحات" : "No description")}</p><p className="mt-3 text-[10px] text-white/25">{item.document_count} {copy.documents} · {item.indexed_document_count} {copy.indexed}</p></button>)}
            {!loading && !sets.length && <button onClick={() => isAdmin && setDialog("create")} className="grid min-h-[132px] min-w-[230px] place-items-center rounded-2xl border border-dashed border-white/10 text-xs text-white/30"><span className="flex flex-col items-center gap-2"><BookOpen size={20} />{isAdmin ? copy.newSet : (isFa ? "مجموعه‌ای وجود ندارد" : "No knowledge sets")}</span></button>}
          </div>
        </section>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {selectedSet && <div className="flex shrink-0 items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-lg font-semibold">{selectedSet.name}</h2><p className="mt-1 truncate text-xs text-white/30">{selectedSet.description}</p></div><div className="flex items-center gap-2">{(isAdmin || selectedSet.access_level === "edit" || selectedSet.access_level === "manage") && <button onClick={() => setConnectorDialog(true)} className="flex h-9 items-center gap-1.5 rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/15 px-3 text-[10px] font-semibold text-[#b6a7ef]"><Link2 size={13} />{copy.connect}</button>}{(isAdmin || selectedSet.access_level === "manage") && <div className="relative"><button onClick={() => setMenuOpen(!menuOpen)} className="app-icon-button grid size-9 place-items-center rounded-xl text-white/40"><MoreHorizontal size={17} /></button>{menuOpen && <div className="absolute end-0 top-11 z-30 w-40 rounded-xl border border-white/10 bg-[#15121c] p-1.5 shadow-2xl"><button onClick={() => { setDialog("edit"); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/65 hover:bg-white/5"><Pencil size={13} />{copy.edit}</button><button onClick={deleteSet} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300/75 hover:bg-rose-400/5"><Trash2 size={13} />{copy.delete}</button></div>}</div>}</div></div>}
          {connectors.length > 0 && <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">{connectors.map((connector) => <div key={connector.id} className="flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] ps-3 pe-1.5"><span className="text-[#a995eb]">{connector.connector_type === "github" ? <Github size={13} /> : <Globe2 size={13} />}</span><span className="max-w-36 truncate text-[10px] text-white/50">{connector.name}</span><span className={`size-1.5 rounded-full ${connector.status === "ready" ? "bg-emerald-300" : connector.status === "failed" ? "bg-rose-300" : "bg-amber-300"}`} /><button title="Sync" disabled={syncingId === connector.id} onClick={async () => { setSyncingId(connector.id); try { const result = await connectorService.sync(selectedSetId, connector.id); toast.success(`${result.created} created · ${result.updated} updated`); setDocuments(await knowledgeService.listDocuments(selectedSetId)); setConnectors(await connectorService.list(selectedSetId)); await loadSets(); } catch (e) { toast.error((e as Error).message); } finally { setSyncingId(null); } }} className="grid size-7 place-items-center rounded-lg text-white/25 hover:bg-white/5 hover:text-white"><RefreshCw size={12} className={syncingId === connector.id ? "animate-spin" : ""} /></button></div>)}</div>}
          {(isAdmin || selectedSet?.access_level === "edit" || selectedSet?.access_level === "manage") && selectedSet && <div {...getRootProps()} onClick={open} className={`knowledge-dropzone flex min-h-28 shrink-0 cursor-pointer items-center justify-center gap-4 rounded-[22px] p-4 transition ${isDragActive ? "is-active" : ""}`}><input {...getInputProps()} /><span className="grid size-11 place-items-center rounded-2xl border border-[#8f78d8]/25 bg-[#32127A]/25 text-[#b6a7ef]">{uploading ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-[#b6a7ef]" /> : <UploadCloud size={20} />}</span><div className="text-start"><p className="text-sm font-semibold text-white/75">{copy.drop}</p><p className="mt-1 text-[11px] text-white/30">{copy.browse} · {copy.formats}</p></div></div>}
          <section className="app-glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px]">
            <div className="flex shrink-0 flex-col gap-3 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-semibold">{copy.library}</h2><div className="flex gap-2"><label className="relative flex-1 sm:w-56"><Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/25" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.search} className="h-9 w-full rounded-xl border border-white/[.09] bg-white/[.035] ps-9 pe-3 text-xs outline-none placeholder:text-white/20" /></label><label className="relative"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 appearance-none rounded-xl border border-white/[.09] bg-[#100e15] ps-3 pe-8 text-xs text-white/55"><option value="all">{copy.allStatuses}</option><option value="indexed">Indexed</option><option value="failed">Failed</option></select><ChevronDown size={13} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-white/25" /></label></div></div>
            <div className="min-h-0 flex-1 divide-y divide-white/[.055] overflow-y-auto">
              {loading ? <div className="grid h-full place-items-center"><span className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-[#a995eb]" /></div> : filtered.length ? filtered.map((doc) => <DocumentRow key={doc.id} document={doc} isAdmin={isAdmin || selectedSet?.access_level === "edit" || selectedSet?.access_level === "manage"} isFa={isFa} onRemove={async () => { if (!selectedSetId) return; await knowledgeService.removeDocumentFromSet(selectedSetId, doc.id); setDocuments((items) => items.filter((item) => item.id !== doc.id)); await loadSets(); toast.success(isFa ? "سند از مجموعه خارج شد" : "Document removed from set"); }} />) : <div className="grid h-full min-h-28 place-items-center text-xs text-white/30">{selectedSet ? copy.empty : (isFa ? "یک مجموعه انتخاب کنید" : "Select a knowledge set")}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>

    {chatOpen && <button onClick={() => setChatOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/65 backdrop-blur-sm xl:hidden" />}
    {chatOpen && <div className="fixed bottom-[86px] end-5 z-[56] flex rounded-xl border border-white/[.09] bg-[rgba(16,12,22,.92)] p-1 shadow-xl backdrop-blur-xl xl:absolute"><button onClick={() => setAnswerMode("quick")} title={isFa ? "پاسخ سریع" : "Quick answer"} className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold transition ${answerMode === "quick" ? "bg-[#32127A] text-white" : "text-white/30"}`}><Zap size={11} />{isFa ? "سریع" : "Quick"}</button><button onClick={() => setAnswerMode("research")} title={isFa ? "پژوهش عمیق" : "Deep research"} className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[9px] font-semibold transition ${answerMode === "research" ? "bg-[#32127A] text-white" : "text-white/30"}`}><Telescope size={11} />{isFa ? "پژوهش" : "Research"}</button></div>}
    <aside className={`knowledge-chat-panel fixed bottom-0 right-0 top-16 z-50 flex w-[min(100%,390px)] flex-col border-s border-white/[.09] transition duration-300 xl:relative xl:inset-auto xl:z-20 ${chatOpen ? "translate-x-0 xl:w-[370px]" : "translate-x-full xl:w-0 xl:translate-x-0 xl:overflow-hidden"}`}><div className="flex h-full w-[min(100vw,390px)] flex-col xl:w-[370px]"><header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[.07] px-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]"><MessageSquareText size={18} /></span><div><h2 className="text-sm font-semibold">{copy.chatTitle}</h2><p className="mt-1 max-w-56 truncate text-[10px] text-white/30">{selectedSet?.name || copy.chatSub}</p></div></div><button onClick={() => setChatOpen(false)} className="app-icon-button grid size-9 place-items-center rounded-xl text-white/40"><PanelRightClose size={17} className="hidden xl:block" /><X size={17} className="xl:hidden" /></button></header><div className="relative min-h-0 flex-1 p-4">{chatMessages.length ? <ChatWindow messages={chatMessages} isThinking={isThinking} /> : <div className="flex h-full flex-col items-center justify-center px-5 text-center"><span className="grid size-12 place-items-center rounded-2xl border border-[#8f78d8]/20 bg-[#32127A]/20 text-[#a995eb]"><Sparkles size={21} /></span><h3 className="mt-4 text-sm font-semibold">{copy.chatEmpty}</h3><p className="mt-2 max-w-60 text-xs leading-5 text-white/30">{copy.chatHint}</p></div>}</div><div className="relative shrink-0 border-t border-white/[.07] p-4"><MetadataFilterBar documents={documents} filters={metadataFilters} onChange={setMetadataFilters} isFa={isFa} /><ScopeSelector documents={documents.filter((item) => item.status === "indexed")} selectedIds={selectedDocumentIds} open={scopeOpen} copy={copy} isFa={isFa} onToggle={() => setScopeOpen((value) => !value)} onChange={setSelectedDocumentIds} onClose={() => setScopeOpen(false)} /><ChatInput disabled={isThinking || !selectedSetId} onSend={handleChatMessage} /></div></div></aside>
    {dialog && <SetDialog mode={dialog} item={dialog === "edit" ? selectedSet : undefined} isFa={isFa} copy={copy} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await loadSets(); }} />}
    {connectorDialog && selectedSetId && <ConnectorDialog setId={selectedSetId} isFa={isFa} onClose={() => setConnectorDialog(false)} onSaved={async () => { setConnectorDialog(false); setConnectors(await connectorService.list(selectedSetId)); setDocuments(await knowledgeService.listDocuments(selectedSetId)); await loadSets(); }} />}
    {playgroundOpen && selectedSetId && <RetrievalPlayground setId={selectedSetId} documentIds={selectedDocumentIds} filters={metadataFilters} isFa={isFa} onClose={() => setPlaygroundOpen(false)} />}
  </motion.div>;
}

function MetadataFilterBar({ documents, filters, onChange, isFa }: { documents: KnowledgeDocument[]; filters: MetadataFilters; onChange: (value: MetadataFilters) => void; isFa: boolean }) {
  const [open, setOpen] = useState(false);
  const languages = [...new Set(documents.map((item) => item.language).filter(Boolean))] as string[];
  const types = [...new Set(documents.map((item) => item.source_type).filter(Boolean))] as string[];
  const tags = [...new Set(documents.flatMap((item) => item.tags))];
  const count = Object.values(filters).filter((value) => Array.isArray(value) ? value.length : Boolean(value)).length;
  const toggle = (key: "languages" | "source_types" | "tags", value: string) => {
    const current = filters[key] || [];
    onChange({ ...filters, [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };
  return <div className="mb-2"><button type="button" onClick={() => setOpen(!open)} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold ${count ? "border-[#8f78d8]/30 bg-[#32127A]/25 text-[#c5b8f4]" : "border-white/[.08] bg-white/[.035] text-white/40"}`}><Filter size={12} />{isFa ? "فیلتر اطلاعات سند" : "Metadata filters"}{count > 0 && <span className="grid size-4 place-items-center rounded-full bg-[#32127A] text-[8px]">{count}</span>}<ChevronDown size={11} className={open ? "rotate-180" : ""} /></button>{open && <div className="mt-2 rounded-xl border border-white/[.08] bg-black/20 p-3"><FilterGroup title={isFa ? "زبان" : "Language"} values={languages} selected={filters.languages || []} onToggle={(value) => toggle("languages", value)} /><FilterGroup title={isFa ? "نوع منبع" : "Source type"} values={types} selected={filters.source_types || []} onToggle={(value) => toggle("source_types", value)} /><FilterGroup title={isFa ? "برچسب" : "Tags"} values={tags} selected={filters.tags || []} onToggle={(value) => toggle("tags", value)} /><div className="mt-2 grid grid-cols-2 gap-2"><input type="date" value={filters.date_from || ""} onChange={(event) => onChange({ ...filters, date_from: event.target.value || undefined })} className="h-8 rounded-lg border border-white/[.08] bg-[#100e15] px-2 text-[9px] text-white/55" /><input type="date" value={filters.date_to || ""} onChange={(event) => onChange({ ...filters, date_to: event.target.value || undefined })} className="h-8 rounded-lg border border-white/[.08] bg-[#100e15] px-2 text-[9px] text-white/55" /></div>{count > 0 && <button onClick={() => onChange({})} className="mt-3 text-[9px] text-[#b6a7ef]">{isFa ? "پاک‌کردن فیلترها" : "Clear filters"}</button>}</div>}</div>;
}

function FilterGroup({ title, values, selected, onToggle }: { title: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  if (!values.length) return null;
  return <div className="mb-2"><p className="mb-1.5 text-[9px] font-semibold text-white/30">{title}</p><div className="flex flex-wrap gap-1">{values.map((value) => <button type="button" key={value} onClick={() => onToggle(value)} className={`rounded-md border px-2 py-1 text-[9px] ${selected.includes(value) ? "border-[#8f78d8]/30 bg-[#32127A]/30 text-[#c5b8f4]" : "border-white/[.07] text-white/30"}`}>{value}</button>)}</div></div>;
}

function ScopeSelector({ documents, selectedIds, open, copy, isFa, onToggle, onChange, onClose }: { documents: KnowledgeDocument[]; selectedIds: string[]; open: boolean; copy: Record<string, string>; isFa: boolean; onToggle: () => void; onChange: (ids: string[]) => void; onClose: () => void }) {
  const selectedDocuments = documents.filter((item) => selectedIds.includes(item.id));
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  return <div className="mb-3">
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button type="button" onClick={onToggle} aria-expanded={open} className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold transition ${selectedIds.length ? "border-[#8f78d8]/30 bg-[#32127A]/25 text-[#c5b8f4]" : "border-white/[.08] bg-white/[.035] text-white/40 hover:text-white/65"}`}><SlidersHorizontal size={12} />{selectedIds.length ? `${selectedIds.length} ${copy.selectedSources}` : copy.allSources}<ChevronDown size={11} className={`transition ${open ? "rotate-180" : ""}`} /></button>
      {selectedDocuments.map((document) => <span key={document.id} className="flex h-8 max-w-36 shrink-0 items-center gap-1 rounded-lg border border-white/[.07] bg-black/15 ps-2.5 pe-1 text-[10px] text-white/45"><FileText size={11} /><span className="truncate">{document.filename}</span><button type="button" onClick={() => toggle(document.id)} className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-white/[.06] hover:text-white"><X size={11} /></button></span>)}
    </div>
    {open && <><button type="button" aria-label="Close source selector" onClick={onClose} className="fixed inset-0 z-[59] cursor-default" /><div className="absolute bottom-[calc(100%-12px)] inset-x-4 z-[60] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,14,25,.98)] shadow-[0_-20px_60px_rgba(0,0,0,.4)] backdrop-blur-2xl"><div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3"><div><p className="text-xs font-semibold text-white/75">{copy.chooseSources}</p><p className="mt-1 text-[9px] text-white/25">{isFa ? "فقط اسناد آماده قابل انتخاب هستند" : "Only ready documents can be selected"}</p></div>{selectedIds.length > 0 && <button type="button" onClick={() => onChange([])} className="text-[10px] text-[#b6a7ef] hover:text-white">{copy.clearSelection}</button>}</div><div className="max-h-52 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">{documents.length ? documents.map((document) => { const selected = selectedIds.includes(document.id); return <button type="button" key={document.id} onClick={() => toggle(document.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${selected ? "bg-[#32127A]/25" : "hover:bg-white/[.035]"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-lg border ${selected ? "border-[#8f78d8]/35 bg-[#32127A]/40 text-[#c5b8f4]" : "border-white/[.08] text-white/25"}`}>{selected ? <Check size={13} /> : <FileText size={13} />}</span><span className="min-w-0 flex-1 truncate text-[11px] text-white/65">{document.filename}</span></button>; }) : <div className="grid min-h-20 place-items-center text-[10px] text-white/25">{isFa ? "سند آماده‌ای وجود ندارد" : "No ready documents"}</div>}</div></div></>}
  </div>;
}

function DocumentRow({ document, isAdmin, isFa, onRemove }: { document: KnowledgeDocument; isAdmin: boolean; isFa: boolean; onRemove: () => Promise<void> }) {
  const ready = document.status === "indexed";
  const active = ["queued", "processing"].includes(document.status);
  if (ready) return <IndexedDocumentRow document={document} isAdmin={isAdmin} isFa={isFa} onRemove={onRemove} />;
  if (active) return <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-[#a995eb]"><RefreshCw size={16} className="animate-spin" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white/75">{document.filename}</p><div className="mt-2 max-w-sm"><div className="mb-1 flex justify-between text-[9px] text-white/30"><span className="capitalize">{document.processing_stage}</span><span>{document.processing_progress}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#32127A] to-[#a995eb] transition-all duration-500" style={{ width: `${document.processing_progress}%` }} /></div></div></div><span className="rounded-full border border-amber-300/10 bg-amber-300/[.055] px-2.5 py-1 text-[10px] text-amber-200/60">{document.processing_progress}%</span>{isAdmin && <button onClick={() => void onRemove()} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/20 hover:text-rose-300"><X size={14} /></button>}</div>;
  if (document.status === "failed") return <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300/10 bg-rose-300/[.04] text-rose-200/60"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white/75">{document.filename}</p><p className="mt-1 truncate text-[10px] text-rose-200/40">{document.processing_error || "Processing failed"}</p></div>{isAdmin && <button onClick={async () => { try { await knowledgeService.retryDocument(document.id); toast.success(isFa ? "پردازش مجدد آغاز شد" : "Processing restarted"); } catch (error) { toast.error((error as Error).message); } }} title="Retry processing" className="app-icon-button grid size-8 place-items-center rounded-lg text-amber-200/50 hover:text-amber-200"><RefreshCw size={13} /></button>}{isAdmin && <button onClick={() => void onRemove()} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/20 hover:text-rose-300"><X size={14} /></button>}</div>;
  return <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-[#a995eb]"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white/75">{document.filename}</p><p className="mt-1 text-[10px] text-white/25">{new Intl.DateTimeFormat(isFa ? "fa-IR" : "en", { dateStyle: "medium" }).format(new Date(document.created_at))}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] ${ready ? "border-emerald-300/10 bg-emerald-300/[.055] text-emerald-200/60" : document.status === "failed" ? "border-rose-300/10 bg-rose-300/[.055] text-rose-200/60" : "border-amber-300/10 bg-amber-300/[.055] text-amber-200/60"}`}>{document.status}</span>{isAdmin && <button onClick={() => void onRemove()} title={isFa ? "خارج کردن از مجموعه" : "Remove from set"} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/20 opacity-100 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"><X size={14} /></button>}</div>;
}

function IndexedDocumentRow({ document, isAdmin, isFa, onRemove }: { document: KnowledgeDocument; isAdmin: boolean; isFa: boolean; onRemove: () => Promise<void> }) {
  const [inspecting, setInspecting] = useState(false);
  return <><div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-[#a995eb]"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white/75">{document.filename}</p><p className="mt-1 text-[10px] text-white/25">{new Intl.DateTimeFormat(isFa ? "fa-IR" : "en", { dateStyle: "medium" }).format(new Date(document.created_at))}</p></div><span className="rounded-full border border-emerald-300/10 bg-emerald-300/[.055] px-2.5 py-1 text-[10px] text-emerald-200/60">{document.status}</span><button onClick={() => setInspecting(true)} title={isFa ? "بازرسی سند و قطعه‌ها" : "Inspect document chunks"} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/30 hover:text-[#b6a7ef]"><ScanSearch size={14} /></button>{isAdmin && <button onClick={() => void onRemove()} title={isFa ? "خارج کردن از مجموعه" : "Remove from set"} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/20 opacity-100 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"><X size={14} /></button>}</div>{inspecting && <DocumentChunkInspector documentId={document.id} isAdmin={isAdmin} isFa={isFa} onClose={() => setInspecting(false)} />}</>;
}

function ConnectorDialog({ setId, isFa, onClose, onSaved }: { setId: string; isFa: boolean; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"website" | "github">("website"); const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [saving, setSaving] = useState(false);
  const valid = name.trim().length >= 2 && /^https:\/\//i.test(url.trim());
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!valid) return; setSaving(true); try { const connector = await connectorService.create(setId, { connector_type: type, name: name.trim(), source_url: url.trim() }); const result = await connectorService.sync(setId, connector.id); toast.success(isFa ? `${result.created} سند وارد شد` : `${result.created} documents imported`); onSaved(); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={onClose}><motion.form initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="app-glass-panel w-full max-w-md rounded-[24px] border border-white/10 p-6"><div className="flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-[#32127A]/30 text-[#b6a7ef]"><Link2 size={18} /></span><h2 className="mt-4 text-xl font-semibold">{isFa ? "اتصال منبع جدید" : "Connect a new source"}</h2><p className="mt-2 text-xs leading-5 text-white/30">{isFa ? "محتوای عمومی وب یا مخزن GitHub را به این مجموعه اضافه کنید." : "Import public web content or a GitHub repository into this set."}</p></div><button type="button" onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl text-white/40"><X size={16} /></button></div><div className="mt-6 grid grid-cols-2 gap-2">{(["website", "github"] as const).map((value) => <button type="button" key={value} onClick={() => setType(value)} className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${type === value ? "border-[#8f78d8]/35 bg-[#32127A]/25 text-white/75" : "border-white/[.08] text-white/35"}`}>{value === "website" ? <Globe2 size={15} /> : <Github size={15} />}{value === "website" ? "Website URL" : "GitHub"}</button>)}</div><label className="mt-5 block text-xs font-semibold text-white/50">{isFa ? "نام اتصال" : "Connection name"}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "github" ? "Product repository" : "Documentation website"} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none placeholder:text-white/20 focus:border-[#8f78d8]/50" /></label><label className="mt-4 block text-xs font-semibold text-white/50">URL<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={type === "github" ? "https://github.com/owner/repository" : "https://example.com/docs"} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none placeholder:text-white/20 focus:border-[#8f78d8]/50" /></label><div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.04] p-3 text-[9px] leading-4 text-white/30">{isFa ? "فقط منابع عمومی HTTPS پشتیبانی می‌شوند. وب‌سایت یک صفحه و GitHub حداکثر ۴۰ فایل متنی را همگام می‌کند." : "Only public HTTPS sources are supported. Website sync imports one page; GitHub sync imports up to 40 supported text files."}</div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs text-white/40">{isFa ? "انصراف" : "Cancel"}</button><button disabled={!valid || saving} className="rounded-xl bg-[#32127A] px-5 py-2.5 text-xs font-semibold disabled:opacity-40">{saving ? (isFa ? "در حال همگام‌سازی…" : "Syncing…") : isFa ? "اتصال و همگام‌سازی" : "Connect and sync"}</button></div></motion.form></div>;
}

function SetDialog({ mode, item, isFa, copy, onClose, onSaved }: { mode: "create" | "edit"; item?: DocumentSet; isFa: boolean; copy: Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || ""); const [description, setDescription] = useState(item?.description || ""); const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (name.trim().length < 2) return; setSaving(true); try { if (mode === "create") await knowledgeService.createSet({ name: name.trim(), description: description.trim() }); else if (item) await knowledgeService.updateSet(item.id, { name: name.trim(), description: description.trim() || null }); toast.success(isFa ? "مجموعه ذخیره شد" : "Knowledge set saved"); onSaved(); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md" onMouseDown={onClose}><motion.form initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="app-glass-panel w-full max-w-md rounded-[24px] border border-white/10 p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-[#32127A]/30 text-[#b6a7ef]"><FolderKanban size={18} /></span><h2 className="mt-4 text-xl font-semibold">{mode === "create" ? copy.createTitle : copy.editTitle}</h2></div><button type="button" onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl text-white/40"><X size={16} /></button></div><label className="mt-6 block text-xs font-semibold text-white/55">{copy.name}<input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-[#8f78d8]/50" /></label><label className="mt-4 block text-xs font-semibold text-white/55">{copy.description}<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#8f78d8]/50" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs text-white/45 hover:bg-white/5">{copy.cancel}</button><button disabled={saving || name.trim().length < 2} className="rounded-xl bg-[#32127A] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(50,18,122,.35)] disabled:opacity-40">{saving ? "…" : mode === "create" ? copy.create : copy.save}</button></div></motion.form></div>;
}
