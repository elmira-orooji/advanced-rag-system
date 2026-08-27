import { confirmAction } from "../services/confirmation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  BookOpen, Building2, Check, ChevronDown, Cloud, Database, FileText, FolderKanban, GitBranch as Github, Globe2, Link2, MessageSquareText, MoreHorizontal,
  FlaskConical, PanelRightClose, Pencil, Plus, RefreshCw, ScanSearch, Search, Settings2, SlidersHorizontal, Sparkles, Telescope, Trash2, UploadCloud, Zap, X, Filter,
} from "lucide-react";
import "../styles/knowledge.css";
import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import RetrievalPlayground from "../components/RetrievalPlayground";
import DocumentChunkInspector from "../components/DocumentChunkInspector";
import { authService } from "../services/authService";
import { knowledgeService, type DocumentSet, type KnowledgeDocument, type MetadataFilters, type ResearchResponse } from "../services/knowledgeService";
import type { ChatMessage } from "../types/chat";
import { connectorService, type Connector, type ConnectorType } from "../services/connectorService";

export default function UploadFilesPage() {
  const { i18n } = useTranslation();
  const reducedMotion = useReducedMotion();
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
  const [chunkingOpen, setChunkingOpen] = useState(false);

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
    onDropRejected: () => toast(isFa ? "فایل PDF یا TXT با حجم حداکثر ۱۰ مگابایت انتخاب کنید." : "Choose a PDF or TXT file up to 10 MB.", { className: "nexora-toast--warning" }),
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
    if (!selectedSet || !await confirmAction(isFa ? `مجموعه «${selectedSet.name}» حذف شود؟ اسناد حذف نمی‌شوند.` : `Delete “${selectedSet.name}”? Documents will be kept.`)) return;
    try { await knowledgeService.deleteSet(selectedSet.id); setMenuOpen(false); toast.success(isFa ? "مجموعه حذف شد" : "Set deleted"); await loadSets(); }
    catch (error) { toast.error((error as Error).message); }
  };

  return <motion.div initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }} dir={isFa ? "rtl" : "ltr"} className="kb-page relative flex h-full overflow-hidden">
    <main className="kb-main min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <div className="kb-content mx-auto flex w-full max-w-[980px] flex-col gap-5">
        <header className="kb-header flex shrink-0 items-end justify-between gap-4">
          <div><div className="kb-eyebrow">{copy.eyebrow}</div><h1 className="text-2xl font-semibold tracking-[-.025em]">{copy.title}</h1><p className="mt-2 max-w-2xl text-xs leading-6 kb-muted">{copy.subtitle}</p></div>
          <div className="flex items-center gap-2">{selectedSet && (isAdmin || selectedSet.access_level === "manage") && <button onClick={() => setChunkingOpen(true)} title={isFa ? "تنظیمات Chunking" : "Chunking settings"} className="app-icon-button grid size-11 place-items-center rounded-xl kb-muted hover:text-[#d9a6ff]"><Settings2 size={16} /></button>}{selectedSetId && <button onClick={() => setPlaygroundOpen(true)} className="app-icon-button flex h-11 items-center gap-2 rounded-xl px-3 text-xs kb-accent sm:px-4"><FlaskConical size={16} /><span className="hidden sm:inline">{isFa ? "آزمایش بازیابی" : "Playground"}</span></button>}{!chatOpen && <button onClick={() => setChatOpen(true)} className="app-icon-button flex h-11 items-center gap-2 rounded-xl px-4 text-sm kb-text sm:flex"><MessageSquareText size={17} />{copy.chatTitle}</button>}</div>
        </header>

        <section className="kb-sets shrink-0">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[.14em] kb-muted">{copy.sets}</h2>{isAdmin && <button onClick={() => setDialog("create")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold kb-accent hover:bg-[#7c27ff]/20"><Plus size={14} />{copy.newSet}</button>}</div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10">
            {sets.map((item) => <button key={item.id} onClick={() => setSelectedSetId(item.id)} aria-pressed={selectedSetId === item.id} className={`kb-set-card ${selectedSetId === item.id ? "is-active" : ""}`}><div className="flex items-start justify-between"><span className="kb-set-icon"><FolderKanban size={17} /></span>{selectedSetId === item.id && <span className="kb-selected-dot" />}</div><p className="mt-3 truncate text-sm font-semibold kb-text">{item.name}</p><p className="mt-1 line-clamp-1 text-[11px] kb-muted">{item.description || (isFa ? "بدون توضیحات" : "No description")}</p><p className="mt-3 text-[10px] kb-muted">{item.document_count} {copy.documents} · {item.indexed_document_count} {copy.indexed}</p></button>)}
            {!loading && !sets.length && <button onClick={() => isAdmin && setDialog("create")} className="grid min-h-[132px] min-w-[230px] place-items-center rounded-2xl border border-dashed border-white/10 text-xs kb-muted"><span className="flex flex-col items-center gap-2"><BookOpen size={20} />{isAdmin ? copy.newSet : (isFa ? "مجموعه‌ای وجود ندارد" : "No knowledge sets")}</span></button>}
          </div>
        </section>

        <div className="kb-set-content flex min-h-0 flex-1 flex-col gap-4">
          {selectedSet && <div className="flex shrink-0 items-center justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-lg font-semibold">{selectedSet.name}</h2><p className="mt-1 truncate text-xs kb-muted">{selectedSet.description}</p></div><div className="flex items-center gap-2">{(isAdmin || selectedSet.access_level === "edit" || selectedSet.access_level === "manage") && <button onClick={() => setConnectorDialog(true)} className="kb-connect flex h-9 items-center gap-1.5 px-3 text-[11px] font-medium"><Link2 size={13} />{copy.connect}</button>}{(isAdmin || selectedSet.access_level === "manage") && <div className="relative"><button aria-label={isFa ? "گزینه‌های مجموعه" : "Set options"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="app-icon-button grid size-9 place-items-center rounded-xl kb-muted"><MoreHorizontal size={17} /></button>{menuOpen && <div className="nexora-dropdown absolute end-0 top-11 z-30 w-40 rounded-xl border border-white/10 bg-[#15121c] p-1.5 shadow-2xl"><button onClick={() => { setDialog("edit"); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs kb-text hover:bg-white/5"><Pencil size={13} />{copy.edit}</button><button onClick={deleteSet} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300/75 hover:bg-rose-400/5"><Trash2 size={13} />{copy.delete}</button></div>}</div>}</div></div>}
          {connectors.length > 0 && <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">{connectors.map((connector) => <div key={connector.id} className="flex h-10 min-w-0 shrink-0 items-center gap-2 rounded-xl border border-white/[.07] bg-white/[.025] ps-3 pe-1.5"><span className="kb-accent">{connector.connector_type === "github" ? <Github size={13} /> : <Globe2 size={13} />}</span><span className="max-w-36 truncate text-[10px] kb-muted">{connector.name}</span><span className={`size-1.5 rounded-full ${connector.status === "ready" ? "bg-emerald-300" : connector.status === "failed" ? "bg-rose-300" : "bg-amber-300"}`} /><button title="Sync" disabled={syncingId === connector.id} onClick={async () => { setSyncingId(connector.id); try { const result = await connectorService.sync(selectedSetId, connector.id); toast.success(`${result.created} created · ${result.updated} updated`); setDocuments(await knowledgeService.listDocuments(selectedSetId)); setConnectors(await connectorService.list(selectedSetId)); await loadSets(); } catch (e) { toast.error((e as Error).message); } finally { setSyncingId(null); } }} className="grid size-7 place-items-center rounded-lg kb-muted hover:bg-white/5 hover:text-white"><RefreshCw size={12} className={syncingId === connector.id ? "animate-spin" : ""} /></button></div>)}</div>}
          {(isAdmin || selectedSet?.access_level === "edit" || selectedSet?.access_level === "manage") && selectedSet && <div {...getRootProps()} onClick={open} className={`knowledge-dropzone flex min-h-28 shrink-0 cursor-pointer items-center justify-center gap-4 rounded-[22px] p-4 transition ${isDragActive ? "is-active" : ""}`}><input {...getInputProps()} /><span className="kb-upload-icon">{uploading ? <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-[#d9a6ff]" /> : <UploadCloud size={20} />}</span><div className="text-start"><p className="text-sm font-semibold kb-text">{copy.drop}</p><p className="mt-1 text-[11px] kb-muted">{copy.browse} · {copy.formats}</p></div></div>}
          <section className="kb-library app-glass-panel flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="kb-library-toolbar flex shrink-0 flex-col gap-3 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-sm font-semibold">{copy.library}</h2><div className="flex gap-2"><label className="relative flex-1 sm:w-56"><Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 kb-muted" /><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label={copy.search} placeholder={copy.search} className="h-9 w-full rounded-xl border border-white/[.09] bg-white/[.035] ps-9 pe-3 text-xs outline-none placeholder:text-white/20" /></label><label className="relative"><select aria-label={copy.allStatuses} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 appearance-none rounded-xl border border-white/[.09] bg-[#0a1530] ps-3 pe-8 text-xs kb-muted"><option value="all">{copy.allStatuses}</option><option value="indexed">Indexed</option><option value="failed">Failed</option></select><ChevronDown size={13} className="absolute end-2.5 top-1/2 -translate-y-1/2 kb-muted" /></label></div></div>
            <div className="kb-document-list min-h-0 flex-1 divide-y divide-white/[.055] overflow-y-auto" tabIndex={0} role="region" aria-label={copy.library}>
              {loading ? <div className="grid h-full place-items-center"><span className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-[#c43cff]" /></div> : filtered.length ? filtered.map((doc) => <DocumentRow key={doc.id} document={doc} isAdmin={isAdmin || selectedSet?.access_level === "edit" || selectedSet?.access_level === "manage"} isFa={isFa} onRemove={async () => { if (!selectedSetId || !await confirmAction(isFa ? `سند «${doc.filename}» از مجموعه خارج شود؟` : `Remove “${doc.filename}” from this set?`)) return; try { await knowledgeService.removeDocumentFromSet(selectedSetId, doc.id); setDocuments((items) => items.filter((item) => item.id !== doc.id)); await loadSets(); toast.success(isFa ? "سند از مجموعه خارج شد" : "Document removed from set"); } catch (error) { toast.error((error as Error).message); } }} />) : <div className="grid h-full min-h-28 place-items-center text-xs kb-muted">{selectedSet ? copy.empty : (isFa ? "یک مجموعه انتخاب کنید" : "Select a knowledge set")}</div>}
            </div>
          </section>
        </div>
      </div>
    </main>

    {chatOpen && <button aria-label={isFa ? "بستن دستیار" : "Close assistant"} onClick={() => setChatOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/65 backdrop-blur-sm xl:hidden" />}
    <aside className={`knowledge-chat-panel fixed bottom-0 right-0 top-16 z-50 flex w-[min(100%,400px)] flex-col border-s border-white/[.09] transition duration-300 xl:relative xl:inset-auto xl:z-20 ${chatOpen ? "visible translate-x-0 xl:w-[360px]" : "invisible translate-x-full xl:w-0 xl:translate-x-0 xl:overflow-hidden"}`}>
      <div className="flex h-full w-[min(100vw,400px)] flex-col xl:w-[360px]">
        <header className="knowledge-assistant-header flex h-[74px] shrink-0 items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="knowledge-assistant-logo grid size-10 shrink-0 place-items-center rounded-xl"><MessageSquareText size={18} /></span>
            <div className="min-w-0"><h2 className="truncate text-[13px] font-semibold tracking-[-.01em]">{copy.chatTitle}</h2><p className="mt-1 truncate text-[10px]">{selectedSet?.name || copy.chatSub}</p></div>
          </div>
          <button aria-label={isFa ? "بستن دستیار" : "Close assistant"} onClick={() => setChatOpen(false)} className="knowledge-assistant-close app-icon-button grid size-9 shrink-0 place-items-center rounded-xl"><PanelRightClose size={17} className="hidden xl:block" /><X size={17} className="xl:hidden" /></button>
        </header>
        <div className="relative min-h-0 flex-1 p-4">{chatMessages.length ? <ChatWindow messages={chatMessages} isThinking={isThinking} /> : <div className="knowledge-assistant-empty flex h-full flex-col items-center justify-center px-7 text-center"><span className="knowledge-assistant-empty-icon grid size-14 place-items-center rounded-2xl"><Sparkles size={22} /></span><h3 className="mt-5 text-sm font-semibold">{copy.chatEmpty}</h3><p className="mt-2 max-w-[255px] text-xs leading-5">{copy.chatHint}</p><span className="knowledge-assistant-context mt-5 max-w-[250px] truncate rounded-full px-3 py-1.5 text-[9px] font-medium">{selectedSet?.name || (isFa ? "مجموعه‌ای انتخاب نشده" : "No set selected")}</span></div>}</div>
        <div className="knowledge-assistant-dock relative shrink-0 p-3.5">
          <div className="knowledge-assistant-tools mb-3 grid grid-cols-2 gap-2">
            <MetadataFilterBar documents={documents} filters={metadataFilters} onChange={setMetadataFilters} isFa={isFa} />
            <ScopeSelector documents={documents.filter((item) => item.status === "indexed")} selectedIds={selectedDocumentIds} open={scopeOpen} copy={copy} isFa={isFa} onToggle={() => setScopeOpen((value) => !value)} onChange={setSelectedDocumentIds} onClose={() => setScopeOpen(false)} />
          </div>
          <div className="knowledge-answer-mode mb-3 grid grid-cols-2 gap-1 p-1" role="group" aria-label={isFa ? "حالت پاسخ" : "Answer mode"}>
            <button onClick={() => setAnswerMode("quick")} aria-pressed={answerMode === "quick"} className={answerMode === "quick" ? "is-active" : ""}><Zap size={13} /><span>{isFa ? "پاسخ سریع" : "Quick answer"}</span></button>
            <button onClick={() => setAnswerMode("research")} aria-pressed={answerMode === "research"} className={answerMode === "research" ? "is-active" : ""}><Telescope size={13} /><span>{isFa ? "پژوهش عمیق" : "Deep research"}</span></button>
          </div>
          <ChatInput disabled={isThinking || !selectedSetId} onSend={handleChatMessage} />
        </div>
      </div>
    </aside>
    {dialog && <SetDialog mode={dialog} item={dialog === "edit" ? selectedSet : undefined} isFa={isFa} copy={copy} onClose={() => setDialog(null)} onSaved={async () => { setDialog(null); await loadSets(); }} />}
    {connectorDialog && selectedSetId && <CloudConnectorDialog setId={selectedSetId} isFa={isFa} onClose={() => setConnectorDialog(false)} onSaved={async () => { setConnectorDialog(false); setConnectors(await connectorService.list(selectedSetId)); setDocuments(await knowledgeService.listDocuments(selectedSetId)); await loadSets(); }} />}
    {playgroundOpen && selectedSetId && <RetrievalPlayground setId={selectedSetId} documentIds={selectedDocumentIds} filters={metadataFilters} isFa={isFa} canManage={Boolean(selectedSet && (isAdmin || selectedSet.access_level === "manage"))} onClose={() => setPlaygroundOpen(false)} />}
    {chunkingOpen && selectedSet && <ChunkingSettingsDialog item={selectedSet} isFa={isFa} onClose={() => setChunkingOpen(false)} onSaved={async () => { setChunkingOpen(false); await loadSets(); }} />}
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
  return <div className="mb-2"><button type="button" onClick={() => setOpen(!open)} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold ${count ? "border-[#18c7f4]/30 bg-[#7c27ff]/25 kb-accent" : "border-white/[.08] bg-white/[.035] kb-muted"}`}><Filter size={12} />{isFa ? "فیلتر اطلاعات سند" : "Metadata filters"}{count > 0 && <span className="grid size-4 place-items-center rounded-full bg-[#7c27ff] text-[8px]">{count}</span>}<ChevronDown size={11} className={open ? "rotate-180" : ""} /></button>{open && <div className="nexora-dropdown mt-2 rounded-xl border border-white/[.08] bg-black/20 p-3"><FilterGroup title={isFa ? "زبان" : "Language"} values={languages} selected={filters.languages || []} onToggle={(value) => toggle("languages", value)} /><FilterGroup title={isFa ? "نوع منبع" : "Source type"} values={types} selected={filters.source_types || []} onToggle={(value) => toggle("source_types", value)} /><FilterGroup title={isFa ? "برچسب" : "Tags"} values={tags} selected={filters.tags || []} onToggle={(value) => toggle("tags", value)} /><div className="mt-2 grid grid-cols-2 gap-2"><input type="date" value={filters.date_from || ""} onChange={(event) => onChange({ ...filters, date_from: event.target.value || undefined })} className="h-8 rounded-lg border border-white/[.08] bg-[#0a1530] px-2 text-[9px] kb-muted" /><input type="date" value={filters.date_to || ""} onChange={(event) => onChange({ ...filters, date_to: event.target.value || undefined })} className="h-8 rounded-lg border border-white/[.08] bg-[#0a1530] px-2 text-[9px] kb-muted" /></div>{count > 0 && <button onClick={() => onChange({})} className="mt-3 text-[9px] kb-accent">{isFa ? "پاک‌کردن فیلترها" : "Clear filters"}</button>}</div>}</div>;
}

function FilterGroup({ title, values, selected, onToggle }: { title: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  if (!values.length) return null;
  return <div className="mb-2"><p className="mb-1.5 text-[9px] font-semibold kb-muted">{title}</p><div className="flex flex-wrap gap-1">{values.map((value) => <button type="button" key={value} aria-pressed={selected.includes(value)} onClick={() => onToggle(value)} className={`rounded-md border px-2 py-1 text-[9px] ${selected.includes(value) ? "border-[#18c7f4]/30 bg-[#7c27ff]/30 kb-accent" : "border-white/[.07] kb-muted"}`}>{value}</button>)}</div></div>;
}

function ScopeSelector({ documents, selectedIds, open, copy, isFa, onToggle, onChange, onClose }: { documents: KnowledgeDocument[]; selectedIds: string[]; open: boolean; copy: Record<string, string>; isFa: boolean; onToggle: () => void; onChange: (ids: string[]) => void; onClose: () => void }) {
  const selectedDocuments = documents.filter((item) => selectedIds.includes(item.id));
  const toggle = (id: string) => onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  return <div className="mb-3">
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button type="button" onClick={onToggle} aria-expanded={open} className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold transition ${selectedIds.length ? "border-[#18c7f4]/30 bg-[#7c27ff]/25 kb-accent" : "border-white/[.08] bg-white/[.035] kb-muted hover:text-white/65"}`}><SlidersHorizontal size={12} />{selectedIds.length ? `${selectedIds.length} ${copy.selectedSources}` : copy.allSources}<ChevronDown size={11} className={`transition ${open ? "rotate-180" : ""}`} /></button>
      {selectedDocuments.map((document) => <span key={document.id} className="flex h-8 max-w-36 shrink-0 items-center gap-1 rounded-lg border border-white/[.07] bg-black/15 ps-2.5 pe-1 text-[10px] kb-muted"><FileText size={11} /><span className="truncate">{document.filename}</span><button type="button" onClick={() => toggle(document.id)} className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-white/[.06] hover:text-white"><X size={11} /></button></span>)}
    </div>
    {open && <><button type="button" aria-label="Close source selector" onClick={onClose} className="fixed inset-0 z-[59] cursor-default" /><div className="nexora-dropdown absolute bottom-[calc(100%-12px)] inset-x-4 z-[60] overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,14,25,.98)] shadow-[0_-20px_60px_rgba(0,0,0,.4)] backdrop-blur-2xl"><div className="flex items-center justify-between border-b border-white/[.07] px-4 py-3"><div><p className="text-xs font-semibold kb-text">{copy.chooseSources}</p><p className="mt-1 text-[9px] kb-muted">{isFa ? "فقط اسناد آماده قابل انتخاب هستند" : "Only ready documents can be selected"}</p></div>{selectedIds.length > 0 && <button type="button" onClick={() => onChange([])} className="text-[10px] kb-accent hover:text-white">{copy.clearSelection}</button>}</div><div className="max-h-52 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">{documents.length ? documents.map((document) => { const selected = selectedIds.includes(document.id); return <button type="button" key={document.id} aria-pressed={selected} onClick={() => toggle(document.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${selected ? "bg-[#7c27ff]/25" : "hover:bg-white/[.035]"}`}><span className={`grid size-7 shrink-0 place-items-center rounded-lg border ${selected ? "border-[#18c7f4]/35 bg-[#7c27ff]/40 kb-accent" : "border-white/[.08] kb-muted"}`}>{selected ? <Check size={13} /> : <FileText size={13} />}</span><span className="min-w-0 flex-1 truncate text-[11px] kb-text">{document.filename}</span></button>; }) : <div className="grid min-h-20 place-items-center text-[10px] kb-muted">{isFa ? "سند آماده‌ای وجود ندارد" : "No ready documents"}</div>}</div></div></>}
  </div>;
}

function DocumentRow({ document, isAdmin, isFa, onRemove }: { document: KnowledgeDocument; isAdmin: boolean; isFa: boolean; onRemove: () => Promise<void> }) {
  const ready = document.status === "indexed";
  const active = ["queued", "processing"].includes(document.status);
  if (ready) return <IndexedDocumentRow document={document} isAdmin={isAdmin} isFa={isFa} onRemove={onRemove} />;
  if (active) return <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] kb-accent"><RefreshCw size={16} className="animate-spin" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold kb-text">{document.filename}</p><div className="mt-2 max-w-sm"><div className="mb-1 flex justify-between text-[9px] kb-muted"><span className="capitalize">{document.processing_stage}</span><span>{document.processing_progress}%</span></div><div className="h-1 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#7c27ff] to-[#c43cff] transition-all duration-500" style={{ width: `${document.processing_progress}%` }} /></div></div></div><span className="rounded-full border border-amber-300/10 bg-amber-300/[.055] px-2.5 py-1 text-[10px] text-amber-200/60">{document.processing_progress}%</span>{isAdmin && <button onClick={() => void onRemove()} className="app-icon-button grid size-8 place-items-center rounded-lg kb-muted hover:text-rose-300"><X size={14} /></button>}</div>;
  if (document.status === "failed") return <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-rose-300/10 bg-rose-300/[.04] text-rose-200/60"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold kb-text">{document.filename}</p><p className="mt-1 truncate text-[10px] text-rose-200/40">{document.processing_error || "Processing failed"}</p></div>{isAdmin && <button onClick={async () => { try { await knowledgeService.retryDocument(document.id); toast.success(isFa ? "پردازش مجدد آغاز شد" : "Processing restarted"); } catch (error) { toast.error((error as Error).message); } }} title="Retry processing" className="app-icon-button grid size-8 place-items-center rounded-lg text-amber-200/50 hover:text-amber-200"><RefreshCw size={13} /></button>}{isAdmin && <button onClick={() => void onRemove()} className="app-icon-button grid size-8 place-items-center rounded-lg kb-muted hover:text-rose-300"><X size={14} /></button>}</div>;
  return <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] kb-accent"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold kb-text">{document.filename}</p><p className="mt-1 text-[10px] kb-muted">{new Intl.DateTimeFormat(isFa ? "fa-IR" : "en", { dateStyle: "medium" }).format(new Date(document.created_at))}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] ${ready ? "border-emerald-300/10 bg-emerald-300/[.055] text-emerald-200/60" : document.status === "failed" ? "border-rose-300/10 bg-rose-300/[.055] text-rose-200/60" : "border-amber-300/10 bg-amber-300/[.055] text-amber-200/60"}`}>{document.status}</span>{isAdmin && <button onClick={() => void onRemove()} title={isFa ? "خارج کردن از مجموعه" : "Remove from set"} className="app-icon-button grid size-8 place-items-center rounded-lg kb-muted opacity-100 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"><X size={14} /></button>}</div>;
}

function IndexedDocumentRow({ document, isAdmin, isFa, onRemove }: { document: KnowledgeDocument; isAdmin: boolean; isFa: boolean; onRemove: () => Promise<void> }) {
  const [inspecting, setInspecting] = useState(false);
  return <><div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-white/[.025]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] kb-accent"><FileText size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold kb-text">{document.filename}</p><p className="mt-1 text-[10px] kb-muted">{new Intl.DateTimeFormat(isFa ? "fa-IR" : "en", { dateStyle: "medium" }).format(new Date(document.created_at))}</p></div><span className="rounded-full border border-emerald-300/10 bg-emerald-300/[.055] px-2.5 py-1 text-[10px] text-emerald-200/60">{document.status}</span><button onClick={() => setInspecting(true)} title={isFa ? "بازرسی سند و قطعه‌ها" : "Inspect document chunks"} className="app-icon-button grid size-8 place-items-center rounded-lg kb-muted hover:text-[#d9a6ff]"><ScanSearch size={14} /></button>{isAdmin && <button onClick={() => void onRemove()} title={isFa ? "خارج کردن از مجموعه" : "Remove from set"} className="app-icon-button grid size-8 place-items-center rounded-lg kb-muted opacity-100 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"><X size={14} /></button>}</div>{inspecting && <DocumentChunkInspector documentId={document.id} isAdmin={isAdmin} isFa={isFa} onClose={() => setInspecting(false)} />}</>;
}

function CloudConnectorDialog(props: { setId: string; isFa: boolean; onClose: () => void; onSaved: () => void }) {
  const { setId, isFa, onClose, onSaved } = props;
  const [type, setType] = useState<ConnectorType>("google_drive");
  const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [saving, setSaving] = useState(false); const [webhookInfo, setWebhookInfo] = useState<{ endpoint: string; secret: string } | null>(null);
  if (!setId) return <ConnectorDialog {...props} />;
  const options: { type: ConnectorType; label: string; icon: React.ReactNode }[] = [
    { type: "google_drive", label: "Google Drive", icon: <Cloud size={15} /> },
    { type: "s3", label: "Amazon S3", icon: <Database size={15} /> },
    { type: "sharepoint", label: "SharePoint", icon: <Building2 size={15} /> },
    { type: "webhook", label: "Webhook", icon: <Zap size={15} /> },
    { type: "website", label: "Website", icon: <Globe2 size={15} /> },
    { type: "github", label: "GitHub", icon: <Github size={15} /> },
  ];
  const placeholders: Record<ConnectorType, string> = {
    google_drive: "https://drive.google.com/drive/folders/FOLDER_ID",
    s3: "https://bucket.s3.eu-central-1.amazonaws.com/prefix",
    sharepoint: "https://graph.microsoft.com/v1.0/drives/DRIVE_ID/items/FOLDER_ID/children",
    website: "https://example.com/docs", github: "https://github.com/owner/repository", webhook: "Generated automatically",
  };
  const valid = name.trim().length >= 2 && (type === "webhook" || /^https:\/\//i.test(url.trim()));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!valid) return; setSaving(true); try { if (type === "webhook") { const created = await connectorService.createWebhook(setId, name.trim()); setWebhookInfo({ endpoint: created.endpoint, secret: created.secret }); return; } const connector = await connectorService.create(setId, { connector_type: type, name: name.trim(), source_url: url.trim() }); const result = await connectorService.sync(setId, connector.id); toast.success(isFa ? `${result.created} سند وارد شد` : `${result.created} documents imported`); onSaved(); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  if (webhookInfo) return <div className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-4 backdrop-blur-md"><div className="app-glass-panel w-full max-w-xl rounded-[24px] border border-white/10 p-6"><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/30 kb-accent"><Zap size={18} /></span><h2 className="mt-4 text-xl font-semibold">{isFa ? "Webhook آماده است" : "Webhook is ready"}</h2><p className="mt-2 text-xs leading-5 text-amber-100/45">{isFa ? "Secret فقط همین یک‌بار نمایش داده می‌شود؛ اکنون آن را ذخیره کنید." : "The secret is shown only once. Store it securely now."}</p>{([['Endpoint', webhookInfo.endpoint], ['X-Webhook-Secret', webhookInfo.secret]] as const).map(([label, value]) => <div key={label} className="mt-4"><p className="mb-2 text-[10px] font-semibold kb-muted">{label}</p><div className="flex items-center gap-2 rounded-xl border border-white/[.08] bg-black/25 p-2"><code className="min-w-0 flex-1 overflow-x-auto px-2 text-[10px] kb-text">{value}</code><button type="button" onClick={() => { void navigator.clipboard.writeText(value); toast.success("Copied"); }} className="rounded-lg bg-white/[.06] px-3 py-2 text-[10px] kb-muted">Copy</button></div></div>)}<button type="button" onClick={onSaved} className="mt-6 w-full rounded-xl bg-[#7c27ff] px-5 py-3 text-xs font-semibold">{isFa ? "انجام شد" : "Done"}</button></div></div>;
  return <div className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={onClose}><motion.form initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="app-glass-panel max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-[24px] border border-white/10 p-6"><div className="flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/30 kb-accent"><Link2 size={18} /></span><h2 className="mt-4 text-xl font-semibold">{isFa ? "اتصال منبع جدید" : "Connect a new source"}</h2><p className="mt-2 text-xs kb-muted">{isFa ? "منبع ابری یا عمومی را به این پایگاه دانش متصل کنید." : "Connect a cloud or public source to this knowledge base."}</p></div><button type="button" onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl kb-muted"><X size={16} /></button></div><div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">{options.map((option) => <button type="button" key={option.type} onClick={() => { setType(option.type); setUrl(""); }} className={`flex items-center gap-2 rounded-xl border p-3 text-xs transition ${type === option.type ? "border-[#18c7f4]/35 bg-[#7c27ff]/25 kb-text" : "border-white/[.08] kb-muted hover:bg-white/[.035]"}`}>{option.icon}{option.label}</button>)}</div><label className="mt-5 block text-xs font-semibold kb-muted">{isFa ? "نام اتصال" : "Connection name"}<input value={name} onChange={(event) => setName(event.target.value)} placeholder={options.find((option) => option.type === type)?.label} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none placeholder:text-white/20 focus:border-[#18c7f4]/50" /></label><label className="mt-4 block text-xs font-semibold kb-muted">URL<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder={placeholders[type]} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none placeholder:text-white/20 focus:border-[#18c7f4]/50" /></label><div className="mt-4 rounded-xl border border-white/[.07] bg-black/20 p-3 text-[10px] leading-5 kb-muted">{type === "google_drive" ? "Google OAuth credentials and a folder URL are required." : type === "s3" ? "Use an AWS S3 HTTPS bucket/prefix URL; credentials stay on the server." : type === "sharepoint" ? "Use the Microsoft Graph /children URL for the target drive folder." : "Only public HTTPS sources are supported."}</div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs kb-muted">{isFa ? "انصراف" : "Cancel"}</button><button disabled={!valid || saving} className="rounded-xl bg-[#7c27ff] px-5 py-2.5 text-xs font-semibold disabled:opacity-40">{saving ? (isFa ? "در حال همگام‌سازی…" : "Syncing…") : isFa ? "اتصال و همگام‌سازی" : "Connect and sync"}</button></div></motion.form></div>;
}

function ConnectorDialog({ setId, isFa, onClose, onSaved }: { setId: string; isFa: boolean; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"website" | "github">("website"); const [name, setName] = useState(""); const [url, setUrl] = useState(""); const [saving, setSaving] = useState(false);
  const valid = name.trim().length >= 2 && /^https:\/\//i.test(url.trim());
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (!valid) return; setSaving(true); try { const connector = await connectorService.create(setId, { connector_type: type, name: name.trim(), source_url: url.trim() }); const result = await connectorService.sync(setId, connector.id); toast.success(isFa ? `${result.created} سند وارد شد` : `${result.created} documents imported`); onSaved(); } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[85] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={onClose}><motion.form initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="app-glass-panel w-full max-w-md rounded-[24px] border border-white/10 p-6"><div className="flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/30 kb-accent"><Link2 size={18} /></span><h2 className="mt-4 text-xl font-semibold">{isFa ? "اتصال منبع جدید" : "Connect a new source"}</h2><p className="mt-2 text-xs leading-5 kb-muted">{isFa ? "محتوای عمومی وب یا مخزن GitHub را به این مجموعه اضافه کنید." : "Import public web content or a GitHub repository into this set."}</p></div><button type="button" onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl kb-muted"><X size={16} /></button></div><div className="mt-6 grid grid-cols-2 gap-2">{(["website", "github"] as const).map((value) => <button type="button" key={value} onClick={() => setType(value)} className={`flex items-center gap-2 rounded-xl border p-3 text-xs ${type === value ? "border-[#18c7f4]/35 bg-[#7c27ff]/25 kb-text" : "border-white/[.08] kb-muted"}`}>{value === "website" ? <Globe2 size={15} /> : <Github size={15} />}{value === "website" ? "Website URL" : "GitHub"}</button>)}</div><label className="mt-5 block text-xs font-semibold kb-muted">{isFa ? "نام اتصال" : "Connection name"}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "github" ? "Product repository" : "Documentation website"} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none placeholder:text-white/20 focus:border-[#18c7f4]/50" /></label><label className="mt-4 block text-xs font-semibold kb-muted">URL<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={type === "github" ? "https://github.com/owner/repository" : "https://example.com/docs"} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none placeholder:text-white/20 focus:border-[#18c7f4]/50" /></label><div className="mt-4 rounded-xl border border-amber-300/10 bg-amber-300/[.04] p-3 text-[9px] leading-4 kb-muted">{isFa ? "فقط منابع عمومی HTTPS پشتیبانی می‌شوند. وب‌سایت یک صفحه و GitHub حداکثر ۴۰ فایل متنی را همگام می‌کند." : "Only public HTTPS sources are supported. Website sync imports one page; GitHub sync imports up to 40 supported text files."}</div><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs kb-muted">{isFa ? "انصراف" : "Cancel"}</button><button disabled={!valid || saving} className="rounded-xl bg-[#7c27ff] px-5 py-2.5 text-xs font-semibold disabled:opacity-40">{saving ? (isFa ? "در حال همگام‌سازی…" : "Syncing…") : isFa ? "اتصال و همگام‌سازی" : "Connect and sync"}</button></div></motion.form></div>;
}

function ChunkingSettingsDialog({ item, isFa, onClose, onSaved }: { item: DocumentSet; isFa: boolean; onClose: () => void; onSaved: () => void }) {
  const [child, setChild] = useState(item.child_chunk_size);
  const [overlap, setOverlap] = useState(item.chunk_overlap);
  const [parent, setParent] = useState(item.parent_chunk_size);
  const [saving, setSaving] = useState(false);
  const valid = child >= 200 && child <= 2000 && overlap >= 0 && overlap < child && parent >= child && parent <= 8000;
  const presets = [
    { key: "precise", label: isFa ? "دقیق" : "Precise", values: [500, 80, 1800] },
    { key: "balanced", label: isFa ? "متعادل" : "Balanced", values: [800, 120, 2400] },
    { key: "context", label: isFa ? "متن گسترده" : "Broad context", values: [1200, 180, 3600] },
  ];
  const save = async () => { if (!valid) return; setSaving(true); try { await knowledgeService.updateSet(item.id, { child_chunk_size: child, chunk_overlap: overlap, parent_chunk_size: parent }); toast.success(isFa ? "تنظیمات Chunking ذخیره شد" : "Chunking settings saved"); onSaved(); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={onClose}><motion.div initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} onMouseDown={(event) => event.stopPropagation()} className="app-glass-panel w-full max-w-lg rounded-[26px] border border-white/10 p-6"><div className="flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/30 kb-accent"><Settings2 size={18} /></span><h2 className="mt-4 text-xl font-semibold">{isFa ? "تنظیمات Chunking" : "Chunking settings"}</h2><p className="mt-2 text-xs leading-5 kb-muted">{isFa ? `تنظیمات اختصاصی «${item.name}» برای اسناد جدید و پردازش مجدد.` : `Per-knowledge-base settings for new and reprocessed documents in “${item.name}”.`}</p></div><button onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl kb-muted"><X size={16} /></button></div><div className="mt-6 grid grid-cols-3 gap-2">{presets.map((preset) => <button key={preset.key} onClick={() => { setChild(preset.values[0]); setOverlap(preset.values[1]); setParent(preset.values[2]); }} className={`rounded-xl border p-3 text-[10px] font-semibold ${child === preset.values[0] && overlap === preset.values[1] && parent === preset.values[2] ? "border-[#18c7f4]/40 bg-[#7c27ff]/25 kb-accent" : "border-white/[.08] kb-muted"}`}>{preset.label}</button>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-3"><ChunkNumber label={isFa ? "اندازه Child" : "Child size"} value={child} min={200} max={2000} onChange={setChild} /><ChunkNumber label={isFa ? "هم‌پوشانی" : "Overlap"} value={overlap} min={0} max={500} onChange={setOverlap} /><ChunkNumber label={isFa ? "اندازه Parent" : "Parent size"} value={parent} min={600} max={8000} onChange={setParent} /></div><div className="mt-5 rounded-xl border border-white/[.07] bg-black/20 p-3 text-[9px] leading-5 kb-muted">{isFa ? "Child کوچک‌تر بازیابی دقیق‌تری ایجاد می‌کند؛ Parent بزرگ‌تر زمینهٔ بیشتری به مدل می‌دهد. Overlap باید از Child کوچک‌تر باشد." : "Smaller children improve retrieval precision; larger parents provide more answer context. Overlap must remain smaller than the child size."}</div>{!valid && <p className="mt-3 text-[10px] text-rose-300/65">{isFa ? "مقادیر معتبر نیستند؛ Parent باید حداقل برابر Child و Overlap کمتر از Child باشد." : "Invalid values: parent must be at least child size and overlap must be smaller than child size."}</p>}<div className="mt-6 flex justify-end gap-2"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs kb-muted">{isFa ? "انصراف" : "Cancel"}</button><button disabled={!valid || saving} onClick={() => void save()} className="rounded-xl bg-[#7c27ff] px-5 py-2.5 text-xs font-semibold disabled:opacity-40">{saving ? "…" : isFa ? "ذخیره تنظیمات" : "Save settings"}</button></div></motion.div></div>;
}

function ChunkNumber({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="text-[10px] font-semibold kb-muted">{label}<input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-white/[.09] bg-black/25 px-3 text-sm kb-text outline-none focus:border-[#18c7f4]/45" /><span className="mt-1 block text-[8px] font-normal kb-muted">{min} – {max} chars</span></label>;
}

function SetDialog({ mode, item, isFa, copy, onClose, onSaved }: { mode: "create" | "edit"; item?: DocumentSet; isFa: boolean; copy: Record<string, string>; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(item?.name || ""); const [description, setDescription] = useState(item?.description || ""); const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (name.trim().length < 2) return; setSaving(true); try { if (mode === "create") await knowledgeService.createSet({ name: name.trim(), description: description.trim() }); else if (item) await knowledgeService.updateSet(item.id, { name: name.trim(), description: description.trim() || null }); toast.success(isFa ? "مجموعه ذخیره شد" : "Knowledge set saved"); onSaved(); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-md" onMouseDown={onClose}><motion.form initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="app-glass-panel w-full max-w-md rounded-[24px] border border-white/10 p-6 shadow-2xl"><div className="flex items-start justify-between"><div><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/30 kb-accent"><FolderKanban size={18} /></span><h2 className="mt-4 text-xl font-semibold">{mode === "create" ? copy.createTitle : copy.editTitle}</h2></div><button type="button" onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl kb-muted"><X size={16} /></button></div><label className="mt-6 block text-xs font-semibold kb-muted">{copy.name}<input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-[#18c7f4]/50" /></label><label className="mt-4 block text-xs font-semibold kb-muted">{copy.description}<textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-[#18c7f4]/50" /></label><div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs kb-muted hover:bg-white/5">{copy.cancel}</button><button disabled={saving || name.trim().length < 2} className="rounded-xl bg-[#7c27ff] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(124,39,255,.35)] disabled:opacity-40">{saving ? "…" : mode === "create" ? copy.create : copy.save}</button></div></motion.form></div>;
}
