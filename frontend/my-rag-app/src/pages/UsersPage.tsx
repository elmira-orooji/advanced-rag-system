import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  ChevronDown,
  Mail,
  PanelRightClose,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

type MemberRole = "admin" | "user";

interface TeamMember {
  id: string;
  name: string;
  username: string;
  email: string;
  role: MemberRole;
  status: "active" | "invited";
  joined: string;
}

const initialMembers: TeamMember[] = [
  { id: "1", name: "Ali Ahmadi", username: "ali.ahmadi", email: "ali@knowledgeflow.ai", role: "admin", status: "active", joined: "Aug 01, 2026" },
  { id: "2", name: "Sara Mohammadi", username: "sara.m", email: "sara@knowledgeflow.ai", role: "user", status: "active", joined: "Aug 02, 2026" },
  { id: "3", name: "Nima Karimi", username: "nima.k", email: "nima@knowledgeflow.ai", role: "user", status: "active", joined: "Aug 04, 2026" },
  { id: "4", name: "Mina Rezaei", username: "mina.r", email: "mina@knowledgeflow.ai", role: "user", status: "invited", joined: "Pending" },
];

export default function UsersPage() {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const [members, setMembers] = useState(initialMembers);
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | MemberRole>("all");
  const [form, setForm] = useState({ name: "", username: "", email: "", role: "user" as MemberRole });

  const copy = isFa ? {
    eyebrow: "مدیریت دسترسی", title: "اعضای تیم", subtitle: "اعضای فضای کاری، نقش‌ها و سطح دسترسی آن‌ها را مدیریت کنید.", add: "افزودن عضو",
    library: "فهرست اعضا", librarySub: "افرادی که به این فضای کاری دسترسی دارند", search: "جست‌وجوی اعضا...", all: "همه نقش‌ها", member: "عضو", role: "نقش", status: "وضعیت", joined: "تاریخ عضویت", empty: "عضوی پیدا نشد",
    admin: "مدیر", user: "کاربر", active: "فعال", invited: "دعوت‌شده", panelTitle: "عضو جدید", panelSub: "ایجاد حساب و تعیین سطح دسترسی", name: "نام کامل", username: "نام کاربری", email: "ایمیل", cancel: "بستن", save: "ایجاد عضو", required: "لطفاً تمام فیلدها را تکمیل کنید", created: "عضو جدید ایجاد شد", removed: "عضو حذف شد",
  } : {
    eyebrow: "Access management", title: "Team members", subtitle: "Manage workspace members, roles, and access levels.", add: "Add member",
    library: "Member directory", librarySub: "People with access to this workspace", search: "Search members...", all: "All roles", member: "Member", role: "Role", status: "Status", joined: "Joined", empty: "No members found",
    admin: "Admin", user: "User", active: "Active", invited: "Invited", panelTitle: "New member", panelSub: "Create an account and assign access", name: "Full name", username: "Username", email: "Email address", cancel: "Close", save: "Create member", required: "Please complete all fields", created: "New member created", removed: "Member removed",
  };

  const filteredMembers = useMemo(() => members.filter((member) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [member.name, member.username, member.email].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery && (roleFilter === "all" || member.role === roleFilter);
  }), [members, query, roleFilter]);

  const createMember = () => {
    if (!form.name.trim() || !form.username.trim() || !form.email.trim()) {
      toast.error(copy.required);
      return;
    }
    setMembers((current) => [{ id: crypto.randomUUID(), name: form.name.trim(), username: form.username.trim(), email: form.email.trim(), role: form.role, status: "active", joined: isFa ? "امروز" : "Today" }, ...current]);
    setForm({ name: "", username: "", email: "", role: "user" });
    toast.success(copy.created);
    if (window.innerWidth < 1280) setPanelOpen(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} className="relative flex h-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        <div className="mx-auto flex h-full w-full max-w-[900px] flex-col transition-[max-width] duration-300 ease-[cubic-bezier(.22,1,.36,1)]">
          <header className="flex shrink-0 flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#a995eb]"><span className="size-1.5 rounded-full bg-[#8f78d8] shadow-[0_0_12px_#8f78d8]" />{copy.eyebrow}</div>
              <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{copy.title}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">{copy.subtitle}</p>
            </div>
            {!panelOpen && <button type="button" onClick={() => setPanelOpen(true)} className="app-icon-button flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white/65 hover:text-white"><UserPlus size={17} />{copy.add}</button>}
          </header>

          <section className="app-glass-panel mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px]">
            <div className="flex shrink-0 flex-col gap-4 border-b border-white/[.07] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div><h2 className="text-sm font-semibold">{copy.library}</h2><p className="mt-1 text-xs text-white/30">{copy.librarySub}</p></div>
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1 sm:w-60"><Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/25" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="h-10 w-full rounded-xl border border-white/[.09] bg-white/[.035] ps-9 pe-3 text-xs text-white outline-none transition placeholder:text-white/20 focus:border-[#8f78d8]/45 focus:bg-white/[.055]" /></label>
                <label className="relative"><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)} className="h-10 appearance-none rounded-xl border border-white/[.09] bg-[#100e15] ps-3 pe-8 text-xs text-white/55 outline-none"><option value="all">{copy.all}</option><option value="admin">{copy.admin}</option><option value="user">{copy.user}</option></select><ChevronDown size={13} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-white/25" /></label>
              </div>
            </div>

            <div className="hidden shrink-0 grid-cols-[minmax(0,2fr)_90px_105px_120px_42px] gap-3 border-b border-white/[.055] px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-white/20 md:grid"><span>{copy.member}</span><span>{copy.role}</span><span>{copy.status}</span><span>{copy.joined}</span><span /></div>
            <div className="min-h-0 flex-1 divide-y divide-white/[.055] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {filteredMembers.length ? filteredMembers.map((member) => <MemberRow key={member.id} member={member} copy={copy} onDelete={() => { setMembers((current) => current.filter((item) => item.id !== member.id)); toast.success(copy.removed); }} />) : <div className="grid h-full min-h-40 place-items-center text-sm text-white/30">{copy.empty}</div>}
            </div>
          </section>
        </div>
      </div>

      {panelOpen && <button type="button" aria-label="Close member panel" onClick={() => setPanelOpen(false)} className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/65 backdrop-blur-sm xl:hidden" />}
      <aside className={`team-member-panel fixed bottom-0 right-0 top-16 z-50 flex w-[min(100%,390px)] flex-col border-s border-white/[.09] transition duration-300 xl:relative xl:inset-auto xl:z-20 xl:shrink-0 ${panelOpen ? "translate-x-0 xl:w-[370px]" : "translate-x-full xl:w-0 xl:translate-x-0 xl:overflow-hidden"}`}>
        <div className="flex h-full w-[min(100vw,390px)] flex-col xl:w-[370px]">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[.07] px-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[#8f78d8]/20 bg-[#32127A]/25 text-[#a995eb]"><UserPlus size={18} /></span><div><h2 className="text-sm font-semibold">{copy.panelTitle}</h2><p className="mt-1 text-[10px] text-white/30">{copy.panelSub}</p></div></div><button type="button" onClick={() => setPanelOpen(false)} aria-label="Collapse member panel" className="app-icon-button grid size-9 place-items-center rounded-xl text-white/40 hover:text-white"><PanelRightClose size={17} className="hidden xl:block" /><X size={17} className="xl:hidden" /></button></header>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 scrollbar-none">
            <div className="mb-6 rounded-2xl border border-[#8f78d8]/12 bg-[#32127A]/10 p-4"><div className="flex gap-3"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#a995eb]" /><p className="text-[11px] leading-5 text-white/35">{isFa ? "نقش مدیر به تنظیمات و مدیریت اعضا دسترسی کامل دارد. نقش کاربر فقط به فضای کاری و پایگاه دانش دسترسی دارد." : "Admins can manage members and settings. Users can access the workspace and knowledge base."}</p></div></div>
            <div className="space-y-4">
              <FormField label={copy.name}><input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={isFa ? "مثال: سارا محمدی" : "e.g. Sara Mohammadi"} className="team-input" /></FormField>
              <FormField label={copy.username}><input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} placeholder="sara.m" className="team-input" /></FormField>
              <FormField label={copy.email}><div className="relative"><Mail size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-white/25" /><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="sara@example.com" className="team-input ps-10" /></div></FormField>
              <FormField label={copy.role}><div className="relative"><select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as MemberRole }))} className="team-input appearance-none"><option value="user">{copy.user}</option><option value="admin">{copy.admin}</option></select><ChevronDown size={14} className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-white/25" /></div></FormField>
            </div>
          </div>
          <div className="flex shrink-0 gap-2 border-t border-white/[.07] p-4"><button type="button" onClick={() => setPanelOpen(false)} className="app-icon-button h-11 flex-1 rounded-xl text-xs font-semibold text-white/50 hover:text-white">{copy.cancel}</button><button type="button" onClick={createMember} className="h-11 flex-[1.35] rounded-xl bg-[#32127A] text-xs font-semibold shadow-[0_10px_26px_rgba(50,18,122,.3)] transition hover:bg-[#43208F]">{copy.save}</button></div>
        </div>
      </aside>
    </motion.div>
  );
}

function MemberRow({ member, copy, onDelete }: { member: TeamMember; copy: Record<string, string>; onDelete: () => void }) {
  const initials = member.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
  return <div className="group relative grid gap-3 p-4 transition hover:bg-white/[.025] md:grid-cols-[minmax(0,2fr)_90px_105px_120px_42px] md:items-center md:px-5 md:py-3.5">
    <div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#5b35b8] to-[#241052] text-[11px] font-bold uppercase shadow-[0_6px_18px_rgba(50,18,122,.2)]">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-white/75">{member.name}</p><p className="mt-1 truncate text-[10px] text-white/25">@{member.username} · {member.email}</p></div></div>
    <div><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] ${member.role === "admin" ? "border-[#8f78d8]/15 bg-[#32127A]/15 text-[#b6a7ef]" : "border-white/[.07] bg-white/[.035] text-white/40"}`}>{member.role === "admin" && <ShieldCheck size={11} />}{member.role === "admin" ? copy.admin : copy.user}</span></div>
    <div><span className={`inline-flex items-center gap-1.5 text-[10px] ${member.status === "active" ? "text-emerald-200/55" : "text-amber-200/55"}`}><span className={`size-1.5 rounded-full ${member.status === "active" ? "bg-emerald-300" : "bg-amber-300"}`} />{member.status === "active" ? copy.active : copy.invited}</span></div>
    <span className="hidden text-xs text-white/30 md:block">{member.joined}</span>
    <div className="absolute end-4 top-4 md:relative md:end-auto md:top-auto"><button type="button" aria-label="Delete member" onClick={onDelete} className="app-icon-button grid size-8 place-items-center rounded-lg text-white/25 opacity-100 transition hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"><Trash2 size={14} /></button></div>
  </div>;
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold text-white/55">{label}</span>{children}</label>;
}
