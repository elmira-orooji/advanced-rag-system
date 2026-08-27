import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, ArrowDownToLine, Bot, CircleAlert, Database, FileCheck2, MessageSquareText, Sparkles, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { analyticsService, type AnalyticsOverview, type DailyMetric, type RankedMetric } from "../services/analyticsService";
import { authService } from "../services/authService";
import "../styles/analytics.css";

const CW = 760, CH = 250, TOP = 18, BOTTOM = 34;

export default function AnalyticsPage() {
  const { i18n } = useTranslation();
  const fa = i18n.language.startsWith("fa");
  const user = authService.getUser();
  const reducedMotion = useReducedMotion();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    analyticsService.overview(days)
      .then((result) => { if (active) setData(result); })
      .catch((error) => { if (active) toast.error(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  const selectPeriod = (value: 7 | 30 | 90) => {
    if (value === days) return;
    setLoading(true);
    setDays(value);
  };

  const c = fa ? {
    welcome: "خوش آمدید", subtitle: "عملکرد فضای کاری و کیفیت پاسخ‌های RAG را در یک نگاه بررسی کنید.", export: "خروجی داده‌ها",
    queries: "کل پرسش‌ها", users: "کاربران فعال", grounded: "پاسخ‌های مستند", satisfaction: "رضایت کاربران",
    noFeedback: "بدون بازخورد", unanswered: "بدون مدرک", coverage: "پوشش بازخورد", citations: "میانگین ارجاع",
    performance: "عملکرد پاسخ‌گویی", performanceSub: "مقایسه پرسش‌ها و پاسخ‌های مستند در بازه انتخاب‌شده", query: "پرسش", groundedLabel: "مستند",
    health: "سلامت پایگاه دانش", indexed: "سند آماده", failed: "سند ناموفق", healthy: "آماده پاسخ‌گویی",
    quality: "کیفیت پاسخ", positive: "بازخورد مثبت", feedbackCoverage: "مشارکت در بازخورد",
    assistants: "عملکرد دستیارها", knowledge: "عملکرد پایگاه‌های دانش", issues: "نیازمند توجه", empty: "هنوز داده‌ای وجود ندارد",
  } : {
    welcome: "Welcome back", subtitle: "Monitor workspace adoption and RAG answer quality at a glance.", export: "Export data",
    queries: "Total queries", users: "Active users", grounded: "Grounded answers", satisfaction: "User satisfaction",
    noFeedback: "No feedback", unanswered: "without evidence", coverage: "feedback coverage", citations: "avg. citations",
    performance: "Answer performance", performanceSub: "Queries and grounded answers across the selected period", query: "Queries", groundedLabel: "Grounded",
    health: "Knowledge health", indexed: "documents ready", failed: "documents failed", healthy: "Ready to answer",
    quality: "Answer quality", positive: "Positive feedback", feedbackCoverage: "Feedback participation",
    assistants: "Assistant performance", knowledge: "Knowledge base performance", issues: "Needs attention", empty: "No data available yet",
  };

  const exportData = () => {
    if (!data) return;
    const rows = [["date", "queries", "grounded", "negative_feedback"], ...data.daily.map((item) => [item.date, item.queries, item.grounded, item.negative_feedback])];
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `nexora-analytics-${days}d.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  if (loading && !data) return <div className="analytics-dashboard grid h-full place-items-center an-surface"><span role="status" aria-label={fa ? "در حال بارگذاری" : "Loading"} className="analytics-spinner" /></div>;

  return <motion.div initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} dir={fa ? "rtl" : "ltr"} className="analytics-dashboard h-full overflow-y-auto  px-4 py-5 scrollbar-thin scrollbar-thumb-white/10 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-[1380px] pb-8">
      <header className="analytics-header flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><p className="analytics-eyebrow">Nexora intelligence</p><h1 className="mt-2 text-xl font-semibold tracking-[-.025em] sm:text-[25px]">{c.welcome}, <span className="an-text">{user?.username ?? (fa ? "کاربر" : "User")}</span></h1><p className="mt-1.5 text-[11px] an-muted sm:text-xs">{c.subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-2"><div className="analytics-period" role="group" aria-label={fa ? "بازه زمانی" : "Date range"}>{([7, 30, 90] as const).map((value) => <button key={value} onClick={() => selectPeriod(value)} aria-pressed={days === value} className={days === value ? "is-active" : ""}>{fa ? `${value} روز` : `${value} days`}</button>)}</div><button onClick={exportData} disabled={!data || loading} className="analytics-export"><ArrowDownToLine size={13} />{c.export}</button></div>
      </header>

      {data && <>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={MessageSquareText} label={c.queries} value={fmt(data.total_queries)} detail={`${data.unanswered_queries} ${c.unanswered}`} />
          <Metric icon={UsersRound} label={c.users} value={fmt(data.active_users)} detail={`${data.feedback_coverage}% ${c.coverage}`} />
          <Metric icon={FileCheck2} label={c.grounded} value={`${data.grounded_rate}%`} detail={`${data.average_citations} ${c.citations}`} />
          <Metric icon={Activity} label={c.satisfaction} value={data.positive_feedback_rate == null ? "—" : `${data.positive_feedback_rate}%`} detail={data.positive_feedback_rate == null ? c.noFeedback : `${data.feedback_coverage}% ${c.coverage}`} />
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
          <Card className="min-h-[370px] overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b an-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold">{c.performance}</h2><p className="mt-1 text-[10px] an-muted">{c.performanceSub}</p></div><div className="flex items-center gap-4 text-[10px] an-muted"><Legend color="var(--an-violet)" label={c.query} /><Legend dashed color="var(--an-cyan)" label={c.groundedLabel} /></div></div>
            <div className="px-3 pb-3 pt-5 sm:px-5"><TrendChart daily={data.daily} fa={fa} /></div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] an-muted">{c.health}</p><p className="mt-2 text-2xl font-semibold">{data.indexed_documents}</p></div><Ring value={health(data)} color="var(--an-cyan)"><Database size={18} /></Ring></div><div className="mt-5 grid grid-cols-2 gap-2"><SmallStat label={c.indexed} value={data.indexed_documents} color="an-success" /><SmallStat label={c.failed} value={data.failed_documents} color={data.failed_documents ? "an-danger" : "an-muted"} /></div><div className="mt-4 flex items-center gap-2 text-[10px] an-muted"><span className="size-1.5 rounded-full an-status-dot" />{c.healthy}</div></Card>
            <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] an-muted">{c.quality}</p><p className="mt-2 text-2xl font-semibold">{data.positive_feedback_rate == null ? "—" : `${data.positive_feedback_rate}%`}</p></div><Ring value={data.positive_feedback_rate ?? 0} color="var(--an-violet)"><Sparkles size={18} /></Ring></div><Progress label={c.positive} value={data.positive_feedback_rate ?? 0} color="analytics-bar" /><Progress label={c.feedbackCoverage} value={data.feedback_coverage} color="analytics-bar-secondary" /></Card>
          </div>
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_.9fr]">
          <Ranking title={c.assistants} icon={Bot} items={data.assistants} empty={c.empty} />
          <Ranking title={c.knowledge} icon={Database} items={data.knowledge_sets} empty={c.empty} />
          <Card className="p-5"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold">{c.issues}</h2><CircleAlert size={15} className="an-muted" /></div><div className="mt-4 space-y-2">{data.recent_issues.length ? data.recent_issues.slice(0, 4).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl border an-border an-surface p-3"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full an-status-dot an-danger" /><p className="min-w-0 flex-1 truncate text-[10px] font-semibold an-muted">{item.name}</p></div><p className="mt-1.5 line-clamp-2 ps-3.5 text-[10px] leading-4 an-muted">{item.detail}</p></div>) : <Empty text={c.empty} />}</div></Card>
        </section>
      </>}
    </div>
  </motion.div>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`analytics-panel ${className}`}>{children}</div>;
}
function Metric({ icon: Icon, label, value, detail }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: string; detail: string }) {
  return <Card className="analytics-metric">
    <div className="analytics-metric__label"><span>{label}</span><Icon size={16} /></div>
    <p className="analytics-metric__value">{value}</p>
    <p className="analytics-metric__detail">{detail}</p>
  </Card>;
}

function TrendChart({ daily, fa }: { daily: DailyMetric[]; fa: boolean }) {
  const values = daily.length ? daily : [{ date: new Date().toISOString(), queries: 0, grounded: 0, negative_feedback: 0 }];
  const max = Math.max(1, ...values.flatMap((item) => [item.queries, item.grounded]));
  const queries = path(values.map((item) => item.queries), max), grounded = path(values.map((item) => item.grounded), max);
  const area = `${queries} L ${CW},${CH - BOTTOM} L 0,${CH - BOTTOM} Z`;
  return <div dir="ltr" className="analytics-trend relative h-[270px] w-full overflow-hidden"><svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" role="img" aria-label={fa ? "روند پرسش‌ها و پاسخ‌های مستند" : "Queries and grounded answers over time"} className="h-[235px] w-full overflow-visible"><defs><linearGradient id="queryArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--an-violet)" stopOpacity=".26" /><stop offset="1" stopColor="var(--an-violet)" stopOpacity="0" /></linearGradient></defs>{[0, 1, 2, 3, 4].map((row) => { const y = TOP + row * ((CH - TOP - BOTTOM) / 4); return <g key={row}><line x1="0" y1={y} x2={CW} y2={y} stroke="var(--an-line)" strokeWidth="1" /><text x="4" y={y - 5} fill="var(--an-muted)" fontSize="9">{Math.round(max * (1 - row / 4))}</text></g>; })}<path d={area} fill="url(#queryArea)" /><path d={queries} fill="none" stroke="var(--an-violet)" strokeWidth="2.2" vectorEffect="non-scaling-stroke"  /><path d={grounded} fill="none" stroke="var(--an-cyan)" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /></svg><div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-[10px] an-muted">{labels(values.length).map((index) => <span key={index}>{new Date(values[index].date).toLocaleDateString(fa ? "fa-IR" : "en", { month: "short", day: "numeric" })}</span>)}</div></div>;
}

function path(values: number[], max: number) { return values.map((value, index) => { const x = values.length === 1 ? CW / 2 : index / (values.length - 1) * CW; const y = TOP + (1 - value / max) * (CH - TOP - BOTTOM); return `${index ? "L" : "M"} ${x.toFixed(1)},${y.toFixed(1)}`; }).join(" "); }
function labels(length: number) { if (length <= 5) return Array.from({ length }, (_, index) => index); return [...new Set([0, Math.floor((length - 1) / 4), Math.floor((length - 1) / 2), Math.floor((length - 1) * .75), length - 1])]; }
function Legend({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) { return <span className="flex items-center gap-1.5"><span className="w-4 border-t-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />{label}</span>; }
function Ring({ value, color, children }: { value: number; color: string; children: ReactNode }) { const safe = Math.max(0, Math.min(100, value)); return <div className="analytics-ring grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${safe}%,var(--an-track) ${safe}% 100%)` }}><div className="analytics-ring__center grid size-[48px] place-items-center rounded-full" style={{ color }}>{children}</div></div>; }
function SmallStat({ label, value, color }: { label: string; value: number; color: string }) { return <div className="rounded-lg border an-border an-surface p-3"><p className={`text-lg font-semibold ${color}`}>{value}</p><p className="mt-1 text-[10px] an-muted">{label}</p></div>; }
function Progress({ label, value, color }: { label: string; value: number; color: string }) { return <div className="mt-4"><div className="mb-1.5 flex justify-between text-[10px]"><span className="an-muted">{label}</span><span className="an-muted">{Math.round(value)}%</span></div><div className="analytics-track h-1.5 overflow-hidden rounded-full"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>; }
function Ranking({ title, icon: Icon, items, empty }: { title: string; icon: ComponentType<{ size?: number; className?: string }>; items: RankedMetric[]; empty: string }) { const max = Math.max(1, ...items.map((item) => item.queries)); return <Card className="p-5"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold">{title}</h2><Icon size={15} className="an-muted" /></div><div className="mt-4 space-y-4">{items.length ? items.slice(0, 5).map((item, index) => <div key={item.id || item.name}><div className="mb-2 flex items-center gap-2"><span className="grid size-5 place-items-center rounded an-surface text-[10px] an-muted">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[10px] an-muted">{item.name}</span><span className="text-[10px] an-muted">{item.queries}</span><span className="rounded an-surface px-1.5 py-0.5 text-[10px] an-muted">{item.grounded_rate}%</span></div><div className="analytics-track ms-7 h-1 overflow-hidden rounded-full"><div className="h-full rounded-full analytics-bar" style={{ width: `${item.queries / max * 100}%` }} /></div></div>) : <Empty text={empty} />}</div></Card>; }
function Empty({ text }: { text: string }) { return <div className="grid min-h-28 place-items-center text-[10px] an-muted">{text}</div>; }
function health(data: AnalyticsOverview) { const total = data.indexed_documents + data.failed_documents; return total ? data.indexed_documents / total * 100 : 0; }
function fmt(value: number) { return Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value); }
