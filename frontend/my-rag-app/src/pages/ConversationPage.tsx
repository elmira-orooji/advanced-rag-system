import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Loader2, MessageSquarePlus } from "lucide-react";
import toast from "react-hot-toast";

import ChatInput from "../components/ChatInput";
import ChatWindow from "../components/ChatWindow";
import { conversationService, type ConversationDetail, type PersistedMessage } from "../services/conversationService";
import { knowledgeService, type DocumentSet } from "../services/knowledgeService";
import type { ChatMessage } from "../types/chat";

interface ConversationPageProps {
  conversationId: string | null;
  onConversationChange: (id: string) => void;
  onConversationsUpdated: () => void;
}

function toChatMessage(message: PersistedMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content.replace(/\[Source\s+(\d+)\]/gi, "[$1]"),
    createdAt: message.created_at,
    grounded: Boolean(message.sources?.length),
    sources: message.sources?.map((source, index) => ({
      id: source.chunk_id,
      citationId: index + 1,
      documentId: source.document_id,
      title: source.filename,
      chunkIndex: source.chunk_index,
      excerpt: source.content,
      score: source.score,
      page: source.page,
      section: source.section,
    })),
  };
}

export default function ConversationPage({ conversationId, onConversationChange, onConversationsUpdated }: ConversationPageProps) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [sets, setSets] = useState<DocumentSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const task = conversationId
      ? conversationService.get(conversationId).then((value) => { if (active) setDetail(value); })
      : knowledgeService.listSets().then((value) => {
          if (!active) return;
          setSets(value);
          setSelectedSetId((current) => current || value[0]?.id || "");
          setDetail(null);
        });
    task.catch((error) => toast.error((error as Error).message)).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [conversationId]);

  const messages = useMemo(() => detail?.messages.map(toChatMessage) ?? [], [detail]);

  const send = async (content: string) => {
    setSending(true);
    try {
      let id = conversationId;
      if (!id) {
        if (!selectedSetId) throw new Error("Create or select a knowledge base first.");
        const created = await conversationService.createForSet(selectedSetId);
        id = created.id;
        onConversationChange(id);
      }
      await conversationService.send(id, content);
      const updated = await conversationService.get(id);
      setDetail(updated);
      onConversationsUpdated();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="grid h-full place-items-center text-white/30"><Loader2 className="animate-spin" /></div>;

  return <div className="mx-auto flex h-full w-full max-w-[1120px] flex-col px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-9">
    <header className="flex shrink-0 items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#a995eb]"><span className="size-1.5 rounded-full bg-[#8f78d8]" />Persistent conversation</div>
        <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-.04em]">{detail?.title || "New conversation"}</h1>
      </div>
      <span className="hidden items-center gap-2 rounded-xl border border-emerald-300/10 bg-emerald-300/[.05] px-3 py-2 text-[11px] text-emerald-200/60 sm:flex"><span className="size-1.5 rounded-full bg-emerald-300" />Saved automatically</span>
    </header>

    <section className="app-glass-panel mt-5 min-h-0 flex-1 overflow-hidden rounded-[24px] p-4 sm:p-6">
      {messages.length ? <ChatWindow messages={messages} isThinking={sending} /> : <div className="flex h-full flex-col items-center justify-center text-center">
        <span className="grid size-14 place-items-center rounded-2xl border border-[#8f78d8]/25 bg-[#32127A]/25 text-[#b6a7ef]"><MessageSquarePlus size={23} /></span>
        <h2 className="mt-5 text-xl font-semibold">Start a source-grounded conversation</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/35">Choose the knowledge base this conversation should use. Your messages and answers will remain available in Recent chats.</p>
        {!conversationId && <label className="mt-6 w-full max-w-sm text-left text-xs text-white/45">
          <span className="mb-2 flex items-center gap-2"><BookOpen size={13} />Knowledge base</span>
          <select value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-[#12101a] px-3 text-sm text-white outline-none focus:border-[#8f78d8]/45">
            {sets.length ? sets.map((set) => <option key={set.id} value={set.id}>{set.name} ({set.indexed_document_count} indexed)</option>) : <option value="">No knowledge base available</option>}
          </select>
        </label>}
      </div>}
    </section>
    <div className="mt-4 shrink-0"><ChatInput disabled={sending || (!conversationId && !selectedSetId)} onSend={send} /><div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-white/20"><FileText size={11} />Messages and RAG answers are saved securely to your account.</div></div>
  </div>;
}
