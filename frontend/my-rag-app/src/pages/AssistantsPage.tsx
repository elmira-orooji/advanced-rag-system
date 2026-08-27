import { confirmAction } from "../services/confirmation";
import { useEffect, useRef, useState } from "react";
import { Bot, Check, FileStack, Pencil, Plus, Power, Sparkles, Trash2, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import "../styles/assistants.css";
import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import { authService } from "../services/authService";
import { assistantService, type AssistantPayload, type CustomAssistant } from "../services/assistantService";
import type { DocumentSet } from "../services/knowledgeService";
import type { ChatMessage } from "../types/chat";

export default function AssistantsPage() {
  const { i18n } = useTranslation(); const fa = i18n.language.startsWith("fa"); const admin = authService.getUser()?.role === "admin";
  const reducedMotion = useReducedMotion();
  const [items, setItems] = useState<CustomAssistant[]>([]); const [sets, setSets] = useState<DocumentSet[]>([]); const [selected, setSelected] = useState<CustomAssistant | null>(null); const [editing, setEditing] = useState<CustomAssistant | "new" | null>(null); const [messages, setMessages] = useState<ChatMessage[]>([]); const [thinking, setThinking] = useState(false); const [loading, setLoading] = useState(true); const [mobileChat, setMobileChat] = useState(false);
  const c = fa ? { eyebrow: "دستیارهای تخصصی", title: "دستیارها", subtitle: "دستیارهای هوشمند با دستورالعمل و منابع دانشی اختصاصی.", add: "دستیار جدید", empty: "هنوز دستیاری ساخته نشده است", choose: "یک دستیار را برای شروع گفتگو انتخاب کنید", knowledge: "مجموعه دانش", inactive: "غیرفعال", active: "فعال", edit: "ویرایش", remove: "حذف", noKnowledge: "بدون مجموعه دانش" } : { eyebrow: "Specialized AI", title: "Assistants", subtitle: "Purpose-built assistants with focused instructions and trusted knowledge.", add: "New assistant", empty: "No assistants have been created yet", choose: "Choose an assistant to start a focused conversation", knowledge: "knowledge sets", inactive: "Inactive", active: "Active", edit: "Edit", remove: "Delete", noKnowledge: "No knowledge assigned" };
  const load = async () => { try { const [assistants, knowledgeSets] = await Promise.all([assistantService.list(), assistantService.listSets()]); setItems(assistants); setSets(knowledgeSets); setSelected((current) => assistants.find((x) => x.id === current?.id) || assistants.find((x) => x.is_active) || null); } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const choose = (item: CustomAssistant) => { if (!item.is_active) return; setSelected(item); setMessages([]); setMobileChat(true); };
  const ask = async (content: string) => { if (!selected) return; setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() }]); setThinking(true); try { const result = await assistantService.ask(selected.id, content); setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: result.answer, responseId: result.response_id, grounded: result.grounded, createdAt: new Date().toISOString(), sources: result.citations.map((x) => ({ id: x.chunk_id, citationId: x.id, documentId: x.document_id, title: x.filename, chunkIndex: x.chunk_index, excerpt: x.excerpt, score: x.score, page: x.page, section: x.section })) }]); } catch (e) { toast.error((e as Error).message); } finally { setThinking(false); } };
  const remove = async (item: CustomAssistant) => { if (!await confirmAction(fa ? `دستیار «${item.name}» حذف شود؟` : `Delete “${item.name}”?`)) return; try { await assistantService.remove(item.id); toast.success(fa ? "دستیار حذف شد" : "Assistant deleted"); await load(); } catch (e) { toast.error((e as Error).message); } };
  return <motion.div initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }} dir={fa ? "rtl" : "ltr"} className="assistants-page flex h-full min-h-0 overflow-hidden">
    <section className="flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8"><header className="assistants-header flex shrink-0 items-end justify-between"><div><div className="assistants-eyebrow">{c.eyebrow}</div><h1 className="text-2xl font-semibold tracking-[-.025em]">{c.title}</h1><p className="mt-2 text-xs leading-6 as-muted">{c.subtitle}</p></div>{admin && <button onClick={() => setEditing("new")} className="assistants-create flex h-10 items-center gap-2 px-4 text-xs font-semibold"><Plus size={15} />{c.add}</button>}</header>
      <div className="mt-6 grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto pb-2 sm:grid-cols-2 xl:grid-cols-3">{loading ? <div className="col-span-full grid min-h-48 place-items-center"><span className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-[#c43cff]" /></div> : items.length ? items.map((item) => <article key={item.id} className={`assistant-card ${selected?.id === item.id ? "is-active" : ""}`}><div className="flex items-start justify-between"><span className="assistant-emblem"><Bot size={20} /></span><div className="flex items-center gap-1">{!item.is_active && <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] as-muted">{c.inactive}</span>}{admin && <button aria-label={`${c.edit}: ${item.name}`} onClick={(e) => { e.stopPropagation(); setEditing(item); }} className="app-icon-button grid size-8 place-items-center rounded-lg as-muted hover:text-white"><Pencil size={13} /></button>}{admin && <button aria-label={`${c.remove}: ${item.name}`} onClick={(e) => { e.stopPropagation(); void remove(item); }} className="app-icon-button grid size-8 place-items-center rounded-lg as-muted hover:text-rose-300"><Trash2 size={13} /></button>}</div></div><h2 className="mt-4 text-sm font-semibold"><button type="button" className="assistant-card-select" onClick={() => choose(item)} disabled={!item.is_active} aria-pressed={selected?.id === item.id}>{item.name}</button></h2><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 as-muted">{item.description || item.instructions}</p><div className="mt-4 flex items-center gap-2 border-t border-white/[.06] pt-3 text-[10px] as-muted"><FileStack size={12} /><span className="truncate">{item.document_set_names.length ? `${item.document_set_names.length} ${c.knowledge}` : c.noKnowledge}</span></div></article>) : <div className="assistants-empty col-span-full"><span className="assistants-empty-icon"><Bot size={24} /></span><h2>{c.empty}</h2><p>{fa ? (admin ? "یک دستیار با دستورالعمل و منابع اختصاصی بسازید." : "دستیارهای فعال پس از ایجاد توسط مدیر اینجا نمایش داده می‌شوند.") : (admin ? "Create an assistant with its own instructions and knowledge sources." : "Active assistants will appear here once your administrator creates them.")}</p>{admin && <button type="button" onClick={() => setEditing("new")} className="assistants-create"><Plus size={15} />{c.add}</button>}</div>}</div>
    </section>
    {mobileChat && <button aria-label={fa ? "بستن گفتگو" : "Close conversation"} onClick={() => setMobileChat(false)} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm xl:hidden" />}
    {(selected || items.length > 0) && <aside className={`fixed bottom-0 end-0 top-16 z-50 flex w-[min(100%,390px)] shrink-0 flex-col enterprise-side-panel border-s border-[#213157] transition-transform xl:relative xl:inset-auto xl:z-auto xl:flex ${mobileChat ? "visible translate-x-0" : "invisible translate-x-full xl:visible xl:translate-x-0"}`}>{selected ? <><header className="flex h-20 shrink-0 items-center gap-3 border-b border-white/[.07] px-5"><span className="grid size-10 place-items-center rounded-xl bg-[#7c27ff]/30 as-accent"><Sparkles size={18} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-semibold">{selected.name}</h2><p className="mt-1 truncate text-[10px] as-muted">{selected.document_set_names.join(" · ") || c.noKnowledge}</p></div><button aria-label={fa ? "بستن گفتگو" : "Close conversation"} onClick={() => setMobileChat(false)} className="app-icon-button grid size-9 place-items-center rounded-xl as-muted xl:hidden"><X size={16} /></button></header><div className="min-h-0 flex-1 p-4">{messages.length ? <ChatWindow messages={messages} isThinking={thinking} /> : <div className="flex h-full flex-col items-center justify-center text-center"><span className="grid size-12 place-items-center rounded-2xl border border-[#18c7f4]/20 bg-[#7c27ff]/20 as-accent"><Bot size={21} /></span><p className="mt-4 max-w-64 text-xs leading-5 as-muted">{selected.description || c.choose}</p></div>}</div><div className="shrink-0 border-t border-white/[.07] p-4"><ChatInput disabled={thinking} onSend={ask} /></div></> : <div className="grid h-full place-items-center px-8 text-center text-xs leading-5 as-muted">{c.choose}</div>}</aside>}
    {editing && <AssistantDialog item={editing === "new" ? undefined : editing} sets={sets} fa={fa} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />}
  </motion.div>;
}

function AssistantDialog({ item, sets, fa, onClose, onSaved }: { item?: CustomAssistant; sets: DocumentSet[]; fa: boolean; onClose: () => void; onSaved: () => void }) {
  const modalRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const modal = modalRef.current;
    modal?.showModal();
    return () => modal?.close();
  }, []);
  const [name, setName] = useState(item?.name || ""); const [description, setDescription] = useState(item?.description || ""); const [instructions, setInstructions] = useState(item?.instructions || ""); const [selectedSets, setSelectedSets] = useState<string[]>(item?.document_set_ids || []); const [active, setActive] = useState(item?.is_active ?? true); const [saving, setSaving] = useState(false);
  const valid = name.trim().length >= 2 && instructions.trim().length >= 10;
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!valid) return; setSaving(true); const payload: AssistantPayload = { name: name.trim(), description: description.trim(), instructions: instructions.trim(), document_set_ids: selectedSets, is_active: active }; try { item ? await assistantService.update(item.id, payload) : await assistantService.create(payload); toast.success(fa ? "دستیار ذخیره شد" : "Assistant saved"); onSaved(); } catch (error) { toast.error((error as Error).message); } finally { setSaving(false); } };
  return <dialog ref={modalRef} className="assistant-form-overlay" aria-labelledby="assistant-form-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="assistant-dialog assistant-form" dir={fa ? "rtl" : "ltr"}>
      <header className="assistant-form-header">
        <span className="assistant-emblem"><Bot size={20} /></span>
        <div><h2 id="assistant-form-title">{fa ? (item ? "ویرایش دستیار" : "ساخت دستیار") : (item ? "Edit assistant" : "Create assistant")}</h2>
        <p>{fa ? "نقش دستیار و منابع پاسخ‌گویی را مشخص کنید." : "Define its role and choose its knowledge sources."}</p></div>
        <button type="button" onClick={onClose} className="assistant-form-close" aria-label={fa ? "بستن" : "Close"}><X size={18} /></button>
      </header>
      <div className="assistant-form-body">
        <Field label={fa ? "نام" : "Name"}><input autoFocus dir="auto" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} placeholder={fa ? "مثلاً دستیار پشتیبانی" : "e.g. Support assistant"} /></Field>
        <Field label={fa ? "توضیح کوتاه (اختیاری)" : "Short description (optional)"}><input dir="auto" maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={fa ? "این دستیار چه کاری انجام می‌دهد؟" : "What does this assistant help with?"} /></Field>
        <Field label={fa ? "دستورالعمل" : "Instructions"}><textarea dir="auto" rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} required minLength={10} maxLength={5000} placeholder={fa ? "نقش، محدوده پاسخ و لحن دستیار را مشخص کنید..." : "Define the role, answer boundaries, and tone..."} /></Field>
        <fieldset className="assistant-form-knowledge">
          <legend>{fa ? "مجموعه‌های دانش" : "Knowledge sets"}</legend>
          <div className="assistant-form-sets">{sets.map((set) => {
            const checked = selectedSets.includes(set.id);
            return <button type="button" key={set.id} aria-pressed={checked} onClick={() => setSelectedSets(checked ? selectedSets.filter((id) => id !== set.id) : [...selectedSets, set.id])} className="assistant-form-set">
              <FileStack size={16} /><span dir="auto">{set.name}</span><span className="assistant-form-check">{checked && <Check size={12} />}</span>
            </button>;
          })}</div>
          {!sets.length && <p className="assistant-form-hint">{fa ? "ابتدا در پایگاه دانش یک مجموعه بسازید." : "Create a knowledge set in Knowledge base first."}</p>}
        </fieldset>
        <button type="button" role="switch" aria-checked={active} onClick={() => setActive(!active)} className="assistant-form-status">
          <span><Power size={15} />{fa ? "دستیار فعال باشد" : "Assistant is active"}</span>
          <span className="assistant-form-toggle" aria-hidden="true"><span /></span>
        </button>
      </div>
      <footer className="assistant-form-footer">
        <button type="button" onClick={onClose} className="assistant-form-cancel">{fa ? "انصراف" : "Cancel"}</button>
        <button type="submit" disabled={!valid || saving} className="assistant-form-save">{saving ? (fa ? "در حال ذخیره…" : "Saving…") : fa ? "ذخیره دستیار" : "Save assistant"}</button>
      </footer>
    </form>
  </dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="assistant-form-field">{label}<div className="mt-2">{children}</div></label>; }

