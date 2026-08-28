import NexoraAvatar from "./NexoraAvatar";
// Adapted from 21st.dev/@jakobhoeg/components/message-loading and
// vengenceui.com/components/kinetic-text-loader. CSS motion respects reduced motion;
// whole words preserve connected Persian glyphs. No simulated pipeline progress.
export default function AnswerLoading({ isFa, assistantName }: { isFa: boolean; assistantName?: string }) {
  const label = isFa ? "در حال آماده‌سازی پاسخ" : "Preparing your answer";
  return <article className="chat-answer chat-loading" dir={isFa ? "rtl" : "ltr"}>
    <div className="chat-answer-body" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <header className="chat-answer-heading" aria-hidden="true">
        <NexoraAvatar />
        <strong>{assistantName || "Nexora"}</strong>
        <svg className="message-loading-dots" width="28" height="24" viewBox="0 0 24 24"><circle cx="4" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg>
      </header>
      <div className="answer-kinetic" aria-hidden="true">{label.split(" ").map((word, index) => <span key={index} style={{ animationDelay: `${index * 110}ms` }}>{word}{" "}</span>)}</div>
      <div className="answer-loading-lines" aria-hidden="true"><span /><span /><span /></div>
    </div>
  </article>;
}
