import { useEffect, useState, type RefObject } from "react";

interface Props {
  viewportRef: RefObject<HTMLDivElement | null>;
  isFa: boolean;
}

export default function ConversationScrollRail({ viewportRef, isFa }: Props) {
  const [metrics, setMetrics] = useState({ progress: 0, visible: 1 });
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maximum = viewport.scrollHeight - viewport.clientHeight;
        setMetrics({
          progress: maximum > 1 ? Math.max(0, Math.min(1, viewport.scrollTop / maximum)) : 0,
          visible: maximum > 1 ? viewport.clientHeight / viewport.scrollHeight : 1,
        });
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    viewport.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener("scroll", measure);
    };
  }, [viewportRef]);

  if (metrics.visible >= 1) return null;
  const activeLength = Math.max(1, Math.round(metrics.visible * 28));
  const activeStart = Math.round(metrics.progress * (28 - activeLength));
  return <div className="conversation-scroll-rail">
    <div className="conversation-scroll-ticks" aria-hidden="true">
      {Array.from({ length: 28 }, (_, index) => <span key={index} className={index >= activeStart && index < activeStart + activeLength ? "is-active" : ""} />)}
    </div>
    <input
      type="range" min={0} max={1000} step={1}
      value={Math.round(metrics.progress * 1000)}
      aria-label={isFa ? "موقعیت در گفتگو" : "Conversation scroll position"}
      aria-orientation="vertical"
      aria-valuetext={`${Math.round(metrics.progress * 100)}%`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        const bounds = event.currentTarget.getBoundingClientRect();
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) * (viewport.scrollHeight - viewport.clientHeight);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) * (viewport.scrollHeight - viewport.clientHeight);
      }}
      onKeyDown={(event) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const maximum = viewport.scrollHeight - viewport.clientHeight;
        const destinations: Record<string, number> = {
          Home: 0, End: maximum,
          ArrowUp: viewport.scrollTop - 40, ArrowDown: viewport.scrollTop + 40,
          PageUp: viewport.scrollTop - viewport.clientHeight, PageDown: viewport.scrollTop + viewport.clientHeight,
        };
        if (event.key in destinations) { event.preventDefault(); viewport.scrollTop = destinations[event.key]; }
      }}
      onInput={(event) => {
        const viewport = viewportRef.current;
        if (viewport) viewport.scrollTop = Number(event.currentTarget.value) / 1000 * (viewport.scrollHeight - viewport.clientHeight);
      }}
    />
  </div>;
}

