import { useEffect, useState } from "react";
import NexoraAvatar from "./NexoraAvatar";
import { BorderBeam } from "border-beam";
export default function AnswerLoading({ isFa, assistantName, slow = false }: { isFa: boolean; assistantName?: string; slow?: boolean }) {
  const [motionAllowed, setMotionAllowed] = useState(() => typeof window === "undefined" || !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [theme, setTheme] = useState<"dark" | "light">(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light");
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setMotionAllowed(!preference.matches);
    updateMotionPreference();
    preference.addEventListener("change", updateMotionPreference);
    return () => preference.removeEventListener("change", updateMotionPreference);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(root.classList.contains("dark") ? "dark" : "light"));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const label = slow
    ? (isFa ? "دریافت پاسخ بیش از حد معمول طول کشیده است. می‌توانید آن را متوقف کنید." : "This is taking longer than usual. You can stop the request.")
    : (isFa ? "در حال آماده‌سازی پاسخ" : "Preparing your answer");
  const liveLabel = isFa ? "در حال فکر کردن" : "Thinking";
  return <article className="chat-answer chat-loading" dir={isFa ? "rtl" : "ltr"}>
    <BorderBeam
      active={motionAllowed}
      className="chat-answer-beam"
      colorVariant="ocean"
      duration={3.2}
      size="md"
      staticColors
      strength={0.94}
      theme={theme}
    >
    <div className="chat-answer-body" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <header className="chat-answer-heading" aria-hidden="true">
        <NexoraAvatar />
        <strong>{assistantName || "Nexora"}</strong>
        <span className="answer-thinking-state"><span />{liveLabel}</span>
      </header>
      <div className="answer-thinking-content" aria-hidden="true">
        <p>{label}</p><span className="answer-thinking-dots"><i /><i /><i /></span>
      </div>
    </div>
    </BorderBeam>
  </article>;
}
