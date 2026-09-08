import NexoraAvatar from "./NexoraAvatar";
export default function AnswerLoading({ isFa, assistantName }: { isFa: boolean; assistantName?: string }) {
  const label = isFa ? "در حال آماده‌سازی پاسخ" : "Preparing your answer";
  const liveLabel = isFa ? "در حال فکر کردن" : "Thinking";
  return <article className="chat-answer chat-loading" dir={isFa ? "rtl" : "ltr"}>
    <div className="chat-answer-body" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <header className="chat-answer-heading" aria-hidden="true">
        <NexoraAvatar />
        <strong>{assistantName || "Nexora"}</strong>
        <span className="answer-thinking-state"><span />{liveLabel}</span>
      </header>
      <div className="answer-thinking-content" aria-hidden="true">
        <div className="answer-thinking-orbit"><span /><span /><i /></div>
        <div className="answer-thinking-copy"><p>{label}</p><div className="answer-thinking-wave"><span /><span /><span /><span /><span /></div></div>
      </div>
      <div className="answer-thinking-lines" aria-hidden="true"><span /><span /><span /></div>
    </div>
  </article>;
}
