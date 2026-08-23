import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowDownToLine, Bot, CircleAlert, Database, FileCheck2, MessageSquareText, MoreHorizontal, Sparkles, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { analyticsService, type AnalyticsOverview, type DailyMetric, type RankedMetric } from "../services/analyticsService";
import { authService } from "../services/authService";

const CW = 760, CH = 250, TOP = 18, BOTTOM = 34;

export default function AnalyticsPage() {
  const { i18n } = useTranslation();
  const fa = i18n.language.startsWith("fa");
  const user = authService.getUser();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsService.overview(days).then(setData).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [days]);

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

  if (loading && !data) return <div className="analytics-page grid h-full place-items-center bg-[#070d20]"><span className="size-7 animate-spin rounded-full border-2 border-white/10 border-t-[#c43cff]" /></div>;

  return <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} dir={fa ? "rtl" : "ltr"} className="analytics-page h-full overflow-y-auto bg-[radial-gradient(circle_at_78%_8%,rgba(66,38,148,.14),transparent_30%),#070d20] px-4 py-5 text-[#eef2ff] scrollbar-thin scrollbar-thumb-white/10 sm:px-6 lg:px-8">
    <div className="mx-auto w-full max-w-[1380px] pb-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#18c7f4]">Nexora intelligence</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.04em] sm:text-[30px]">{c.welcome}, <span className="text-white">{user?.username ?? (fa ? "کاربر" : "User")}</span></h1><p className="mt-1.5 text-[11px] text-[#8290b2] sm:text-xs">{c.subtitle}</p></div>
        <div className="flex flex-wrap items-center gap-2"><div className="flex rounded-lg border border-[#24345e] bg-[#0c1733] p-1">{([7, 30, 90] as const).map((value) => <button key={value} onClick={() => setDays(value)} className={`rounded-md px-3 py-2 text-[10px] font-semibold transition ${days === value ? "bg-[#7c27ff] text-white shadow-[0_7px_20px_rgba(124,39,255,.28)]" : "text-[#7684a7] hover:text-white"}`}>{fa ? `${value} روز` : `${value} days`}</button>)}</div><button onClick={exportData} className="flex h-10 items-center gap-2 rounded-lg border border-[#24345e] bg-[#0c1733] px-3 text-[10px] font-semibold text-[#aeb9d7] transition hover:border-[#7c27ff]/50 hover:text-white"><ArrowDownToLine size={13} />{c.export}</button></div>
      </header>

      {data && <>
        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={MessageSquareText} label={c.queries} value={fmt(data.total_queries)} detail={`${data.unanswered_queries} ${c.unanswered}`} accent="#c43cff" />
          <Metric icon={UsersRound} label={c.users} value={fmt(data.active_users)} detail={`${data.feedback_coverage}% ${c.coverage}`} accent="#18c7f4" />
          <Metric icon={FileCheck2} label={c.grounded} value={`${data.grounded_rate}%`} detail={`${data.average_citations} ${c.citations}`} accent="#1b4dff" />
          <Metric icon={Activity} label={c.satisfaction} value={data.positive_feedback_rate == null ? "—" : `${data.positive_feedback_rate}%`} detail={data.positive_feedback_rate == null ? c.noFeedback : `${data.feedback_coverage}% ${c.coverage}`} accent="#ffb52e" />
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_360px]">
          <Card className="min-h-[420px] overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-[#213157] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-semibold">{c.performance}</h2><p className="mt-1 text-[10px] text-[#7180a4]">{c.performanceSub}</p></div><div className="flex items-center gap-4 text-[9px] text-[#8492b6]"><Legend color="#c43cff" label={c.query} /><Legend color="#18c7f4" label={c.groundedLabel} /></div></div>
            <div className="px-3 pb-3 pt-5 sm:px-5"><TrendChart daily={data.daily} fa={fa} /></div>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] text-[#8190b5]">{c.health}</p><p className="mt-2 text-2xl font-semibold">{data.indexed_documents}</p></div><Ring value={health(data)} color="#18c7f4"><Database size={18} /></Ring></div><div className="mt-5 grid grid-cols-2 gap-2"><SmallStat label={c.indexed} value={data.indexed_documents} color="text-[#34d6aa]" /><SmallStat label={c.failed} value={data.failed_documents} color={data.failed_documents ? "text-[#ff7289]" : "text-[#8492b6]"} /></div><div className="mt-4 flex items-center gap-2 text-[9px] text-[#58d9b5]"><span className="size-1.5 rounded-full bg-[#34d6aa] shadow-[0_0_9px_#34d6aa]" />{c.healthy}</div></Card>
            <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] text-[#8190b5]">{c.quality}</p><p className="mt-2 text-2xl font-semibold">{data.positive_feedback_rate == null ? "—" : `${data.positive_feedback_rate}%`}</p></div><Ring value={data.positive_feedback_rate ?? 0} color="#c43cff"><Sparkles size={18} /></Ring></div><Progress label={c.positive} value={data.positive_feedback_rate ?? 0} color="from-[#7c27ff] to-[#c43cff]" /><Progress label={c.feedbackCoverage} value={data.feedback_coverage} color="from-[#0148f8] to-[#18c7f4]" /></Card>
          </div>
        </section>

        <section className="mt-3 grid gap-3 xl:grid-cols-[1fr_1fr_.9fr]">
          <Ranking title={c.assistants} icon={Bot} items={data.assistants} empty={c.empty} />
          <Ranking title={c.knowledge} icon={Database} items={data.knowledge_sets} empty={c.empty} />
          <Card className="p-5"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold">{c.issues}</h2><CircleAlert size={15} className="text-[#ff7289]" /></div><div className="mt-4 space-y-2">{data.recent_issues.length ? data.recent_issues.slice(0, 4).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl border border-[#24345e] bg-[#0a1530] p-3"><div className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#ff7289]" /><p className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#cbd4ec]">{item.name}</p></div><p className="mt-1.5 line-clamp-2 ps-3.5 text-[9px] leading-4 text-[#657398]">{item.detail}</p></div>) : <Empty text={c.empty} />}</div></Card>
        </section>
      </>}
    </div>
  </motion.div>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) { return <div className={`analytics-card rounded-xl border border-[#213157] bg-[linear-gradient(145deg,#0e1a3b,#0a1530)] shadow-[0_16px_45px_rgba(0,0,0,.16)] ${className}`}>{children}</div>; }
function Metric({ icon: Icon, label, value, detail, accent }: { icon: ComponentType<{ size?: number; className?: string }>; label: string; value: string; detail: string; accent: string }) { return <Card className="relative overflow-hidden p-4"><span className="absolute inset-x-0 top-0 h-px opacity-70" style={{ background: `linear-gradient(90deg,transparent,${accent},transparent)` }} /><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] text-[#95a2c2]"><Icon size={13} /><span>{label}</span></div><MoreHorizontal size={14} className="text-[#546386]" /></div><div className="mt-4 flex items-end justify-between gap-3"><p className="text-[25px] font-semibold tracking-[-.04em] text-white">{value}</p><span className="mb-1 rounded bg-[#142446] px-2 py-1 text-[8px] text-[#7f8eaf]">{detail}</span></div></Card>; }

function TrendChart({ daily, fa }: { daily: DailyMetric[]; fa: boolean }) {
  const values = daily.length ? daily : [{ date: new Date().toISOString(), queries: 0, grounded: 0, negative_feedback: 0 }];
  const max = Math.max(1, ...values.flatMap((item) => [item.queries, item.grounded]));
  const queries = path(values.map((item) => item.queries), max), grounded = path(values.map((item) => item.grounded), max);
  const area = `${queries} L ${CW},${CH - BOTTOM} L 0,${CH - BOTTOM} Z`;
  return <div className="relative h-[310px] w-full overflow-hidden"><svg viewBox={`0 0 ${CW} ${CH}`} preserveAspectRatio="none" className="h-[265px] w-full overflow-visible"><defs><linearGradient id="queryArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c27ff" stopOpacity=".26" /><stop offset="1" stopColor="#7c27ff" stopOpacity="0" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>{[0, 1, 2, 3, 4].map((row) => { const y = TOP + row * ((CH - TOP - BOTTOM) / 4); return <g key={row}><line x1="0" y1={y} x2={CW} y2={y} stroke="#23335a" strokeWidth="1" /><text x="4" y={y - 5} fill="#526286" fontSize="9">{Math.round(max * (1 - row / 4))}</text></g>; })}<path d={area} fill="url(#queryArea)" /><path d={queries} fill="none" stroke="#c43cff" strokeWidth="2.2" vectorEffect="non-scaling-stroke" filter="url(#glow)" /><path d={grounded} fill="none" stroke="#18c7f4" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-[8px] text-[#566688]">{labels(values.length).map((index) => <span key={index}>{new Date(values[index].date).toLocaleDateString(fa ? "fa-IR" : "en", { month: "short", day: "numeric" })}</span>)}</div></div>;
}

function path(values: number[], max: number) { return values.map((value, index) => { const x = values.length === 1 ? CW / 2 : index / (values.length - 1) * CW; const y = TOP + (1 - value / max) * (CH - TOP - BOTTOM); return `${index ? "L" : "M"} ${x.toFixed(1)},${y.toFixed(1)}`; }).join(" "); }
function labels(length: number) { if (length <= 5) return Array.from({ length }, (_, index) => index); return [...new Set([0, Math.floor((length - 1) / 4), Math.floor((length - 1) / 2), Math.floor((length - 1) * .75), length - 1])]; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />{label}</span>; }
function Ring({ value, color, children }: { value: number; color: string; children: ReactNode }) { const safe = Math.max(0, Math.min(100, value)); return <div className="grid size-16 place-items-center rounded-full" style={{ background: `conic-gradient(${color} ${safe}%,#1c2a4d ${safe}% 100%)` }}><div className="grid size-[52px] place-items-center rounded-full bg-[#0c1733]" style={{ color }}>{children}</div></div>; }
function SmallStat({ label, value, color }: { label: string; value: number; color: string }) { return <div className="rounded-lg border border-[#213157] bg-[#0a1530] p-3"><p className={`text-lg font-semibold ${color}`}>{value}</p><p className="mt-1 text-[8px] text-[#68779a]">{label}</p></div>; }
function Progress({ label, value, color }: { label: string; value: number; color: string }) { return <div className="mt-4"><div className="mb-1.5 flex justify-between text-[9px]"><span className="text-[#7685a9]">{label}</span><span className="text-[#aeb9d7]">{Math.round(value)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#1a294b]"><div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>; }
function Ranking({ title, icon: Icon, items, empty }: { title: string; icon: ComponentType<{ size?: number; className?: string }>; items: RankedMetric[]; empty: string }) { const max = Math.max(1, ...items.map((item) => item.queries)); return <Card className="p-5"><div className="flex items-center justify-between"><h2 className="text-xs font-semibold">{title}</h2><Icon size={15} className="text-[#a971ff]" /></div><div className="mt-4 space-y-4">{items.length ? items.slice(0, 5).map((item, index) => <div key={item.id || item.name}><div className="mb-2 flex items-center gap-2"><span className="grid size-5 place-items-center rounded bg-[#17264a] text-[8px] text-[#8493b6]">{index + 1}</span><span className="min-w-0 flex-1 truncate text-[10px] text-[#aeb9d7]">{item.name}</span><span className="text-[9px] text-[#66769b]">{item.queries}</span><span className="rounded bg-[#123c45] px-1.5 py-0.5 text-[8px] text-[#43d7ac]">{item.grounded_rate}%</span></div><div className="ms-7 h-1 overflow-hidden rounded-full bg-[#1a294b]"><div className="h-full rounded-full bg-gradient-to-r from-[#7c27ff] via-[#c43cff] to-[#18c7f4]" style={{ width: `${item.queries / max * 100}%` }} /></div></div>) : <Empty text={empty} />}</div></Card>; }
function Empty({ text }: { text: string }) { return <div className="grid min-h-28 place-items-center text-[9px] text-[#536285]">{text}</div>; }
function health(data: AnalyticsOverview) { const total = data.indexed_documents + data.failed_documents; return total ? data.indexed_documents / total * 100 : 0; }
function fmt(value: number) { return Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value); }

