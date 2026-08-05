import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ChevronDown,
  File,
  FileText,
  MessageSquareText,
  PanelRightClose,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import type { ChatMessage } from "../types/chat";

type DocumentStatus = "indexed" | "processing" | "queued";

interface KnowledgeDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  added: string;
  status: DocumentStatus;
  chunks?: number;
}

const initialDocuments: KnowledgeDocument[] = [
  { id: "1", name: "Product_Specifications.pdf", type: "PDF", size: "2.4 MB", added: "Today, 09:42", status: "indexed", chunks: 86 },
  { id: "2", name: "Employee_Handbook.docx", type: "DOCX", size: "1.1 MB", added: "Yesterday", status: "indexed", chunks: 42 },
  { id: "3", name: "Research_Notes.txt", type: "TXT", size: "184 KB", added: "Yesterday", status: "processing" },
  { id: "4", name: "Q2_Strategy.pdf", type: "PDF", size: "3.7 MB", added: "Aug 03", status: "indexed", chunks: 128 },
];

export default function UploadFilesPage() {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DocumentStatus>("all");
  const [chatOpen, setChatOpen] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const copy = isFa ? {
    eyebrow: "مدیریت منابع", title: "پایگاه دانش", subtitle: "اسناد مورد استفاده برای پاسخ‌های هوشمند را مدیریت و سازمان‌دهی کنید.",
    add: "افزودن سند", drop: "فایل‌ها را اینجا رها کنید", browse: "یا برای انتخاب فایل کلیک کنید", formats: "PDF، DOCX و TXT تا حداکثر ۱۰ مگابایت",
    total: "کل اسناد", indexed: "ایندکس‌شده", processing: "در حال پردازش", chunks: "بخش‌های دانش", library: "کتابخانه اسناد", librarySub: "منابع قابل جست‌وجوی فضای کاری شما",
    search: "جست‌وجوی اسناد...", all: "همه وضعیت‌ها", file: "سند", status: "وضعیت", added: "افزوده‌شده", size: "حجم", empty: "سندی پیدا نشد",
    health: "سلامت پایگاه دانش", healthy: "آماده و همگام", coverage: "پوشش ایندکس", security: "فضای کاری خصوصی", securitySub: "اسناد فقط برای اعضای مجاز قابل دسترسی هستند.",
  } : {
    eyebrow: "Source management", title: "Knowledge base", subtitle: "Manage and organize the documents that ground your AI answers.",
    add: "Add documents", drop: "Drop your files here", browse: "or click to browse from your device", formats: "PDF, DOCX and TXT up to 10 MB",
    total: "Total documents", indexed: "Indexed", processing: "Processing", chunks: "Knowledge chunks", library: "Document library", librarySub: "Searchable sources in your workspace",
    search: "Search documents...", all: "All statuses", file: "Document", status: "Status", added: "Added", size: "Size", empty: "No documents found",
    health: "Knowledge health", healthy: "Ready and synchronized", coverage: "Index coverage", security: "Private workspace", securitySub: "Documents are only accessible to authorized members.",
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const additions = acceptedFiles.map<KnowledgeDocument>((file) => ({
      id: crypto.randomUUID(), name: file.name, type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
      size: file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`,
      added: isFa ? "همین حالا" : "Just now", status: "queued",
    }));
    setDocuments((current) => [...additions, ...current]);
    if (additions.length) toast.success(isFa ? `${additions.length} سند به صف پردازش اضافه شد` : `${additions.length} document${additions.length > 1 ? "s" : ""} added to the queue`);
  }, [isFa]);

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    onDrop, noClick: true, maxSize: 10 * 1024 * 1024,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    onDropRejected: () => toast.error(isFa ? "نوع یا حجم فایل مجاز نیست" : "Unsupported file type or size"),
  });

  const filteredDocuments = useMemo(() => documents.filter((document) => {
    const matchesQuery = document.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || document.status === statusFilter;
    return matchesQuery && matchesStatus;
  }), [documents, query, statusFilter]);

  const chatCopy = isFa
    ? { title: "دستیار دانش", subtitle: "از اسناد خود سؤال بپرسید", empty: "پاسخ‌های مبتنی بر منبع", hint: "درباره اسناد این کتابخانه سؤال بپرسید تا پاسخی همراه با منابع دریافت کنید." }
    : { title: "Knowledge assistant", subtitle: "Ask questions across your documents", empty: "Source-grounded answers", hint: "Ask about the documents in this library to receive an answer with traceable sources." };

  const handleChatMessage = (content: string) => {
    setChatMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() }]);
    setIsThinking(true);
    window.setTimeout(() => {
      setChatMessages((current) => [...current, {
        id: crypto.randomUUID(), role: "assistant",
        content: isFa ? "این پاسخ بر اساس اسناد پایگاه دانش تولید شده است. پس از اتصال endpoint چت، پاسخ واقعی جایگزین این پیش‌نمایش می‌شود." : "This answer is grounded in the documents in this knowledge base. The live response will replace this preview when the chat endpoint is connected.",
        createdAt: new Date().toISOString(),
        sources: documents.filter((item) => item.status === "indexed").slice(0, 2).map((item) => ({ id: item.id, title: item.name })),
      }]);
      setIsThinking(false);
    }, 1000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} className="relative flex h-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
      <div className="mx-auto flex h-full w-full max-w-[900px] flex-col transition-[max-width] duration-300 ease-[cubic-bezier(.22,1,.36,1)]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#a995eb]"><span className="size-1.5 rounded-full bg-[#8f78d8] shadow-[0_0_12px_#8f78d8]" />{copy.eyebrow}</div>
            <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{copy.title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">{copy.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setChatOpen(true)} aria-expanded={chatOpen} className={`${chatOpen ? "hidden" : "flex"} app-icon-button h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/65 hover:text-white`}><MessageSquareText size={17} />{chatCopy.title}</button>
          </div>
        </header>

        <div className="mt-5 flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
            <div {...getRootProps()} className={`knowledge-dropzone relative flex min-h-36 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[24px] p-5 text-center transition sm:min-h-40 ${isDragActive ? "is-active" : ""}`} onClick={open}>
              <input {...getInputProps()} />
              <span className="grid size-12 place-items-center rounded-2xl border border-[#8f78d8]/25 bg-[#32127A]/25 text-[#b6a7ef] shadow-[0_0_34px_rgba(50,18,122,.22)]"><UploadCloud size={22} /></span>
              <p className="mt-4 text-sm font-semibold text-white/85">{copy.drop}</p>
              <p className="mt-1 text-xs text-white/35">{copy.browse}</p>
              <p className="mt-3 rounded-full border border-white/[.07] bg-black/15 px-3 py-1 text-[10px] text-white/25">{copy.formats}</p>
            </div>

            <section className="app-glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
              <div className="flex flex-col gap-4 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div><h2 className="text-sm font-semibold">{copy.library}</h2><p className="mt-1 text-xs text-white/30">{copy.librarySub}</p></div>
                <div className="flex gap-2">
                  <label className="relative min-w-0 flex-1 sm:w-56"><Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/25" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="h-10 w-full rounded-xl border border-white/[.09] bg-white/[.035] ps-9 pe-3 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-[#8f78d8]/45 focus:bg-white/[.055]" /></label>
                  <label className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 appearance-none rounded-xl border border-white/[.09] bg-[#100e15] ps-3 pe-8 text-xs text-white/55 outline-none"><option value="all">{copy.all}</option><option value="indexed">{copy.indexed}</option><option value="processing">{copy.processing}</option><option value="queued">Queued</option></select><ChevronDown size={13} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-white/25" /></label>
                </div>
              </div>

              <div className="hidden grid-cols-[minmax(0,2fr)_120px_130px_80px_42px] gap-3 border-b border-white/[.055] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-white/20 md:grid"><span>{copy.file}</span><span>{copy.status}</span><span>{copy.added}</span><span>{copy.size}</span><span /></div>
              <div className="min-h-0 flex-1 divide-y divide-white/[.055] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {filteredDocuments.length ? filteredDocuments.map((document) => (
                  <DocumentRow key={document.id} document={document} isFa={isFa} onDelete={() => { setDocuments((current) => current.filter((item) => item.id !== document.id)); toast.success(isFa ? "سند حذف شد" : "Document removed"); }} />
                )) : <div className="grid min-h-40 place-items-center text-sm text-white/30">{copy.empty}</div>}
              </div>
            </section>
          </div>

        </div>
      </div>
      </div>

      {chatOpen && <button type="button" aria-label="Close chat" onClick={() => setChatOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/65 backdrop-blur-sm xl:hidden" />}
      <aside className={`knowledge-chat-panel fixed bottom-0 right-0 top-16 z-50 flex w-[min(100%,390px)] flex-col border-s border-white/[.09] transition duration-300 xl:relative xl:inset-auto xl:z-20 xl:shrink-0 ${chatOpen ? "translate-x-0 xl:w-[370px]" : "translate-x-full xl:w-0 xl:translate-x-0 xl:overflow-hidden"}`}>
        <div className="flex h-full w-[min(100vw,390px)] flex-col xl:w-[370px]">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[.07] px-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]"><MessageSquareText size={18} /></span>
              <div><h2 className="text-sm font-semibold">{chatCopy.title}</h2><p className="mt-1 text-[10px] text-white/30">{chatCopy.subtitle}</p></div>
            </div>
            <button type="button" onClick={() => setChatOpen(false)} aria-label="Collapse chat" className="app-icon-button grid size-9 place-items-center rounded-xl text-white/40 hover:text-white"><PanelRightClose size={17} className="hidden xl:block" /><X size={17} className="xl:hidden" /></button>
          </header>
          <div className="min-h-0 flex-1 p-4">
            {chatMessages.length ? <ChatWindow messages={chatMessages} isThinking={isThinking} /> : (
              <div className="flex h-full flex-col items-center justify-center px-5 text-center"><span className="grid size-12 place-items-center rounded-2xl border border-[#8f78d8]/20 bg-[#32127A]/20 text-[#a995eb]"><Sparkles size={21} /></span><h3 className="mt-4 text-sm font-semibold">{chatCopy.empty}</h3><p className="mt-2 max-w-60 text-xs leading-5 text-white/30">{chatCopy.hint}</p></div>
            )}
          </div>
          <div className="shrink-0 border-t border-white/[.07] p-4"><ChatInput disabled={isThinking} onSend={handleChatMessage} /></div>
        </div>
      </aside>
    </motion.div>
  );
}

function DocumentRow({ document, isFa, onDelete }: { document: KnowledgeDocument; isFa: boolean; onDelete: () => void }) {
  const status = document.status === "indexed" ? (isFa ? "ایندکس‌شده" : "Indexed") : document.status === "processing" ? (isFa ? "در حال پردازش" : "Processing") : (isFa ? "در صف" : "Queued");
  const statusStyle = document.status === "indexed" ? "border-emerald-300/10 bg-emerald-300/[.055] text-emerald-200/60" : document.status === "processing" ? "border-amber-300/10 bg-amber-300/[.055] text-amber-200/60" : "border-[#8f78d8]/15 bg-[#32127A]/15 text-[#a995eb]";
  return <div className="group relative grid gap-3 p-4 transition hover:bg-white/[.025] md:grid-cols-[minmax(0,2fr)_120px_130px_80px_42px] md:items-center md:px-5 md:py-3.5">
    <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/[.07] bg-white/[.035] text-[#a995eb]">{document.type === "PDF" ? <FileText size={17} /> : <File size={17} />}</span><div className="min-w-0"><p className="truncate text-xs font-semibold text-white/75 sm:text-sm">{document.name}</p><p className="mt-1 text-[10px] text-white/25 md:hidden">{document.type} · {document.size} · {document.added}</p></div></div>
    <div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${statusStyle}`}><span className={`size-1.5 rounded-full ${document.status === "indexed" ? "bg-emerald-300" : document.status === "processing" ? "animate-pulse bg-amber-300" : "bg-[#8f78d8]"}`} />{status}</span></div>
    <span className="hidden text-xs text-white/30 md:block">{document.added}</span><span className="hidden text-xs text-white/30 md:block">{document.size}</span>
    <div className="absolute end-4 mt-0 md:relative md:end-auto"><button type="button" aria-label={isFa ? "حذف سند" : "Delete document"} onClick={onDelete} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/25 opacity-100 transition hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14} /></button></div>
  </div>;
}
