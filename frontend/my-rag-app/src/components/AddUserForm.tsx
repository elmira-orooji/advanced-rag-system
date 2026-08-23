import { useState } from "react";
import { Check, ChevronDown, UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { userService, type ManagedUser } from "../services/userService";

interface AddUserFormProps {
  isFa: boolean;
  onClose: () => void;
  onCreated: (user: ManagedUser) => void;
}

export default function AddUserForm({ isFa, onClose, onCreated }: AddUserFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validUsername = /^[A-Za-z0-9_.-]{3,100}$/.test(username.trim());
  const valid = validUsername && password.length >= 8 && jobTitle.trim().length <= 120;
  const copy = isFa
    ? { title: "افزودن عضو", subtitle: "یک حساب جدید در فضای کاری فعلی ایجاد کنید.", username: "نام کاربری", usernameHint: "حداقل ۳ حرف؛ فقط حروف انگلیسی، عدد، نقطه، خط تیره و زیرخط", password: "رمز عبور موقت", passwordHint: "حداقل ۸ کاراکتر", job: "عنوان شغلی", jobPlaceholder: "برای مثال: مدیر محصول", role: "نقش", user: "کاربر", admin: "مدیر", active: "حساب فعال باشد", cancel: "انصراف", save: "ایجاد عضو", saving: "در حال ایجاد…", success: "عضو جدید ایجاد شد" }
    : { title: "Add team member", subtitle: "Create a new account in the current workspace.", username: "Username", usernameHint: "At least 3 characters; letters, numbers, dot, dash, and underscore", password: "Temporary password", passwordHint: "At least 8 characters", job: "Job title", jobPlaceholder: "e.g. Product manager", role: "Role", user: "User", admin: "Admin", active: "Account is active", cancel: "Cancel", save: "Create member", saving: "Creating…", success: "Team member created" };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || saving) return;
    setSaving(true); setError("");
    try {
      const created = await userService.create({ username: username.trim(), password, job_title: jobTitle.trim() || undefined, role, is_active: active });
      toast.success(copy.success);
      onCreated(created);
    } catch (reason) { setError((reason as Error).message); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-4 backdrop-blur-md" onMouseDown={onClose}>
    <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="app-glass-panel w-full max-w-lg rounded-[24px] p-5 sm:p-6">
      <header className="flex items-start justify-between gap-4"><div><span className="grid size-10 place-items-center rounded-xl border border-[#18c7f4]/20 bg-[#7c27ff]/20 text-[#c43cff]"><UserPlus size={18} /></span><h2 className="mt-4 text-xl font-semibold">{copy.title}</h2><p className="mt-2 text-xs leading-5 text-white/35">{copy.subtitle}</p></div><button type="button" onClick={onClose} className="app-icon-button grid size-9 place-items-center rounded-xl"><X size={16} /></button></header>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={copy.username} hint={copy.usernameHint}><input autoFocus value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" className="team-input" /></Field>
        <Field label={copy.job}><input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder={copy.jobPlaceholder} maxLength={120} className="team-input" /></Field>
        <Field label={copy.password} hint={copy.passwordHint}><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="team-input" /></Field>
        <Field label={copy.role}><label className="relative block"><select value={role} onChange={(event) => setRole(event.target.value as "admin" | "user")} className="team-input appearance-none pe-9"><option value="user">{copy.user}</option><option value="admin">{copy.admin}</option></select><ChevronDown size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-white/30" /></label></Field>
      </div>
      <button type="button" onClick={() => setActive((value) => !value)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-white/[.08] px-3 py-3 text-xs text-white/55"><span>{copy.active}</span><span className={`grid size-5 place-items-center rounded-md border ${active ? "border-[#18c7f4]/35 bg-[#7c27ff] text-white" : "border-white/15 text-transparent"}`}><Check size={12} /></span></button>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[.07] px-3 py-2.5 text-[11px] text-rose-200">{error}</p>}
      <footer className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs text-white/45">{copy.cancel}</button><button disabled={!valid || saving} className="rounded-xl bg-gradient-to-r from-[#7c27ff] to-[#1b4dff] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_10px_25px_rgba(124,39,255,.22)] disabled:cursor-not-allowed disabled:opacity-40">{saving ? copy.saving : copy.save}</button></footer>
    </form>
  </div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-white/55"><span>{label}</span><div className="mt-2">{children}</div>{hint && <span className="mt-1.5 block text-[9px] font-normal leading-4 text-white/25">{hint}</span>}</label>;
}
