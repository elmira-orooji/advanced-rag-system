// Adapted from 21st.dev/@jakobhoeg/components/message-loading and
// vengenceui.com/components/kinetic-text-loader. CSS motion respects reduced motion;
// whole words preserve connected Persian glyphs. No simulated pipeline progress.
export default function AnswerLoading({ isFa }: { isFa: boolean }) {
  const label = isFa ? "در حال آماده‌سازی پاسخ" : "Preparing your answer";
  return <article className="chat-answer chat-loading" dir={isFa ? "rtl" : "ltr"}>
    <div className="chat-answer-body" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <header className="chat-answer-heading" aria-hidden="true">
        <span className="chat-answer-mark"><img src="/brand/nexora-symbol.svg" alt="" width="20" height="20" /></span>
        <strong>Nexora</strong>
        <svg className="message-loading-dots" width="28" height="24" viewBox="0 0 24 24"><circle cx="4" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="20" cy="12" r="2" /></svg>
      </header>
      <div className="answer-kinetic" aria-hidden="true">{label.split(" ").map((word, index) => <span key={index} style={{ animationDelay: `${index * 110}ms` }}>{word}{" "}</span>)}</div>
      <div className="answer-loading-lines" aria-hidden="true"><span /><span /><span /></div>
    </div>
  </article>;
}
