import type { CSSProperties } from "react";
import {
  Database,
  FileSearch,
  FileText,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

const nodes = [
  { className: "is-document", icon: FileText, label: "Documents" },
  { className: "is-search", icon: FileSearch, label: "Semantic search" },
  { className: "is-database", icon: Database, label: "Vector knowledge" },
  { className: "is-answer", icon: MessageSquareText, label: "Grounded answer" },
];

export default function KnowledgeMotion() {
  return (
    <div className="knowledge-motion" aria-hidden="true">
      <div className="knowledge-glow knowledge-glow-one" />
      <div className="knowledge-glow knowledge-glow-two" />
      <div className="knowledge-grid" />

      <div className="knowledge-stage">
        <svg className="knowledge-connections" viewBox="0 0 800 900" preserveAspectRatio="none">
        <path pathLength="1" d="M155 205 C275 220 285 355 400 408" />
        <path pathLength="1" d="M645 205 C525 220 515 355 400 408" />
        <path pathLength="1" d="M150 555 C270 540 285 485 400 452" />
        <path pathLength="1" d="M650 555 C530 540 515 485 400 452" />
        </svg>

      <div className="knowledge-core">
        <span className="knowledge-core-pulse" />
        <span className="knowledge-core-icon"><Sparkles size={28} /></span>
        <strong>RAG AI</strong>
        <small>Processing context</small>
      </div>

      {nodes.map(({ className, icon: Icon, label }, index) => (
        <div
          key={className}
          className={`knowledge-node ${className}`}
          style={{ "--node-delay": `${index * -1.2}s` } as CSSProperties}
        >
          <span><Icon size={19} /></span>
          <small>{label}</small>
        </div>
      ))}

      <span className="knowledge-chip chip-one">PDF · DOCX · TXT</span>
      <span className="knowledge-chip chip-two">Relevant context</span>
        <span className="knowledge-chip chip-three">98% confidence</span>
      </div>
    </div>
  );
}
