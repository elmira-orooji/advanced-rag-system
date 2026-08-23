import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Camera,
  Check,
  ChevronDown,
  Database,
  Download,
  HardDrive,
  Languages,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";

import { authService } from "../services/authService";

interface SettingsPageProps {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export default function SettingsPage({ theme, setTheme }: SettingsPageProps) {
  const { i18n } = useTranslation();
  const currentUser = authService.getUser();
  const isFa = i18n.language.startsWith("fa");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [historyRetention, setHistoryRetention] = useState("always");
  const [confirmClear, setConfirmClear] = useState(false);

  const copy = isFa ? {
    eyebrow: "تنظیمات فضای کاری", title: "تنظیمات", subtitle: "تجربه کاربری، زبان و تنظیمات حساب خود را مدیریت کنید.",
    account: "حساب کاربری", accountSub: "اطلاعات حساب فعال", admin: "مدیر فضای کاری", user: "عضو فضای کاری", profileHint: "نام کاربری و نقش از حساب احراز هویت‌شده دریافت می‌شوند.",
    language: "زبان و جهت صفحه", languageSub: "زبان رابط کاربری را انتخاب کنید.", persian: "فارسی", english: "English",
    appearance: "ظاهر برنامه", appearanceSub: "تم مناسب محیط کاری خود را انتخاب کنید.", light: "روشن", dark: "تیره", system: "سیستم",
    notifications: "اعلان‌ها", notificationsSub: "انتخاب کنید چه رویدادهایی به شما اطلاع داده شوند.", answers: "پاسخ‌های آماده", answersSub: "وقتی پاسخ طولانی آماده شد", documents: "پردازش اسناد", documentsSub: "پس از ایندکس یا خطای سند", securityNotice: "هشدارهای امنیتی", securityNoticeSub: "ورود جدید و تغییرات حساب",
    security: "امنیت", securitySub: "نشست شما با توکن امن محافظت می‌شود.", password: "تغییر رمز عبور", passwordHint: "مدیریت رمز عبور در مرحله اتصال API فعال می‌شود.", saved: "تنظیمات ذخیره شد", changePhoto: "تغییر عکس پروفایل", invalidPhoto: "تصویر باید JPG، PNG یا WebP و کمتر از ۳ مگابایت باشد", photoUpdated: "عکس پروفایل تغییر کرد", data: "داده‌ها و فضای ذخیره‌سازی", dataSub: "اسناد، گفتگوها و داده‌های ذخیره‌شده حساب خود را مدیریت کنید.", storage: "فضای مصرف‌شده", used: "۱٫۲ گیگابایت از ۵ گیگابایت", history: "نگهداری تاریخچه گفتگو", historySub: "مدت نگهداری گفتگوهای قبلی را انتخاب کنید.", days30: "۳۰ روز", days90: "۹۰ روز", always: "همیشه", export: "خروجی داده‌های حساب", exportSub: "یک نسخه از گفتگوها و تنظیمات خود دریافت کنید.", exportAction: "دریافت خروجی", clear: "پاک‌سازی تاریخچه گفتگو", clearSub: "تمام گفتگوهای ذخیره‌شده این حساب حذف می‌شوند.", clearAction: "پاک‌سازی", confirmAction: "تأیید حذف", exported: "درخواست خروجی آماده شد", cleared: "تاریخچه گفتگو پاک شد",
  } : {
    eyebrow: "Workspace preferences", title: "Settings", subtitle: "Manage your account, language, and workspace experience.",
    account: "Your account", accountSub: "Active account information", admin: "Workspace admin", user: "Workspace member", profileHint: "Username and role are provided by your authenticated account.",
    language: "Language & direction", languageSub: "Choose the language used across the interface.", persian: "فارسی", english: "English",
    appearance: "Appearance", appearanceSub: "Choose the theme that fits your environment.", light: "Light", dark: "Dark", system: "System",
    notifications: "Notifications", notificationsSub: "Choose which workspace events should notify you.", answers: "Answer ready", answersSub: "When a long-running answer is complete", documents: "Document processing", documentsSub: "When indexing succeeds or fails", securityNotice: "Security alerts", securityNoticeSub: "New sign-ins and account changes",
    security: "Security", securitySub: "Your session is protected with a secure access token.", password: "Change password", passwordHint: "Password management will be enabled when the account API is connected.", saved: "Settings saved", changePhoto: "Change profile photo", invalidPhoto: "Image must be JPG, PNG, or WebP and smaller than 3 MB", photoUpdated: "Profile photo updated", data: "Data & storage", dataSub: "Manage your documents, conversations, and stored account data.", storage: "Storage usage", used: "1.2 GB of 5 GB used", history: "Conversation history", historySub: "Choose how long previous conversations are retained.", days30: "30 days", days90: "90 days", always: "Always", export: "Export account data", exportSub: "Download a copy of your conversations and settings.", exportAction: "Export", clear: "Clear conversation history", clearSub: "All saved conversations for this account will be removed.", clearAction: "Clear", confirmAction: "Confirm clear", exported: "Export request prepared", cleared: "Conversation history cleared",
  };

  const changeLanguage = (language: "en" | "fa") => {
    void i18n.changeLanguage(language);
    localStorage.setItem("lang", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "fa" ? "rtl" : "ltr";
    toast.success(copy.saved);
  };

  const changeTheme = (nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    toast.success(copy.saved);
  };

  const changeProfileImage = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      toast.error(copy.invalidPhoto);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileImage(reader.result);
        toast.success(copy.photoUpdated);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} className="h-full overflow-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
      <div className="mx-auto flex h-full w-full max-w-[900px] flex-col">
        <header className="shrink-0">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#c43cff]"><span className="size-1.5 rounded-full bg-[#18c7f4] shadow-[0_0_12px_#18c7f4]" />{copy.eyebrow}</div>
          <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">{copy.subtitle}</p>
        </header>

        <div className="mt-5 grid min-h-0 flex-1 gap-5 overflow-y-auto overscroll-contain pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
          <aside className="app-glass-panel h-fit rounded-[22px] p-5 lg:sticky lg:top-0">
            <div className="flex items-center gap-3 border-b border-white/[.07] pb-5 lg:block lg:text-center">
              <div className="relative shrink-0 lg:mx-auto lg:w-fit">
                <span className="grid size-14 overflow-hidden place-items-center rounded-2xl bg-gradient-to-br from-[#7c27ff] to-[#1b2454] text-sm font-bold uppercase text-white shadow-[0_10px_30px_rgba(124,39,255,.3)] lg:size-16 lg:text-base">{profileImage ? <img src={profileImage} alt="" className="size-full object-cover" /> : currentUser?.username.slice(0, 2) ?? "U"}</span>
                <label title={copy.changePhoto} className="absolute -bottom-1.5 -end-1.5 grid size-7 cursor-pointer place-items-center rounded-lg border border-white/15 bg-[#7c27ff] text-white shadow-lg transition hover:bg-[#9238ff] focus-within:ring-4 focus-within:ring-[#7c27ff]/30">
                  <Camera size={13} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => changeProfileImage(event.target.files?.[0])} className="sr-only" aria-label={copy.changePhoto} />
                </label>
              </div>
              <div className="min-w-0 lg:mt-4"><h2 className="truncate text-sm font-semibold lg:text-base">{currentUser?.username ?? "User"}</h2><p className="mt-1 text-[10px] text-[#c43cff]">{currentUser?.role === "admin" ? copy.admin : copy.user}</p></div>
            </div>
            <div className="mt-5 space-y-3">
              <InfoRow icon={UserRound} label={isFa ? "نام کاربری" : "Username"} value={currentUser?.username ?? "—"} />
              <InfoRow icon={ShieldCheck} label={isFa ? "سطح دسترسی" : "Access level"} value={currentUser?.role === "admin" ? copy.admin : copy.user} />
            </div>
            <p className="mt-5 rounded-xl border border-white/[.06] bg-black/15 p-3 text-[10px] leading-5 text-white/25">{copy.profileHint}</p>
          </aside>

          <main className="min-h-0 space-y-4 lg:overflow-y-auto lg:overscroll-contain lg:pe-1 lg:scrollbar-thin lg:scrollbar-track-transparent lg:scrollbar-thumb-white/10">
            <SettingsCard icon={Languages} title={copy.language} subtitle={copy.languageSub}>
              <div className="settings-segmented mt-5 grid grid-cols-2 gap-1 rounded-xl p-1">
                <SegmentButton active={!isFa} onClick={() => changeLanguage("en")} label={copy.english} />
                <SegmentButton active={isFa} onClick={() => changeLanguage("fa")} label={copy.persian} />
              </div>
            </SettingsCard>

            <SettingsCard icon={Palette} title={copy.appearance} subtitle={copy.appearanceSub}>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <ThemeButton active={theme === "light"} icon={Sun} label={copy.light} onClick={() => changeTheme("light")} />
                <ThemeButton active={theme === "dark"} icon={Moon} label={copy.dark} onClick={() => changeTheme("dark")} />
              </div>
            </SettingsCard>

            <SettingsCard icon={Database} title={copy.data} subtitle={copy.dataSub}>
              <div className="mt-5 rounded-2xl border border-white/[.07] bg-black/15 p-4">
                <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#7c27ff]/20 text-[#c43cff]"><HardDrive size={16} /></span><div><p className="text-xs font-semibold text-white/65">{copy.storage}</p><p className="mt-1 text-[10px] text-white/25">{copy.used}</p></div></div><strong className="text-sm text-[#d9a6ff]">24%</strong></div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full w-[24%] rounded-full bg-gradient-to-r from-[#7c27ff] to-[#18c7f4] shadow-[0_0_12px_rgba(24,199,244,.35)]" /></div>
              </div>

              <div className="mt-3 divide-y divide-white/[.06] rounded-2xl border border-white/[.07] bg-white/[.018] px-4">
                <div className="flex items-center justify-between gap-4 py-4"><div><p className="text-xs font-semibold text-white/65">{copy.history}</p><p className="mt-1 text-[10px] leading-4 text-white/25">{copy.historySub}</p></div><label className="relative shrink-0"><select value={historyRetention} onChange={(event) => { setHistoryRetention(event.target.value); toast.success(copy.saved); }} className="settings-select h-9 appearance-none rounded-xl border border-white/[.08] bg-[#0a1530] ps-3 pe-8 text-[10px] text-white/60 outline-none"><option value="30">{copy.days30}</option><option value="90">{copy.days90}</option><option value="always">{copy.always}</option></select><ChevronDown size={12} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-white/25" /></label></div>
                <ActionRow icon={Download} title={copy.export} description={copy.exportSub} action={copy.exportAction} onClick={() => toast.success(copy.exported)} />
                <ActionRow icon={Trash2} title={copy.clear} description={copy.clearSub} action={confirmClear ? copy.confirmAction : copy.clearAction} danger confirm={confirmClear} onClick={() => { if (confirmClear) { toast.success(copy.cleared); setConfirmClear(false); } else { setConfirmClear(true); } }} />
              </div>
            </SettingsCard>

          </main>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsCard({ icon: Icon, title, subtitle, children }: { icon: typeof Monitor; title: string; subtitle: string; children: ReactNode }) {
  return <section className="app-glass-panel rounded-[22px] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#18c7f4]/15 bg-[#7c27ff]/18 text-[#c43cff]"><Icon size={17} /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[11px] leading-5 text-white/30">{subtitle}</p></div></div>{children}</section>;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3"><Icon size={15} className="shrink-0 text-[#c43cff]" /><div className="min-w-0"><span className="block text-[9px] uppercase tracking-[.12em] text-white/20">{label}</span><strong className="mt-1 block truncate text-xs font-medium text-white/55">{value}</strong></div></div>;
}

function SegmentButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition ${active ? "bg-[#7c27ff] text-white shadow-[0_8px_20px_rgba(124,39,255,.28)]" : "text-white/35 hover:bg-white/[.04] hover:text-white/65"}`}>{active && <Check size={13} />}{label}</button>;
}

function ThemeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Sun; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`settings-theme-option relative flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${active ? "is-active border-[#18c7f4]/35 bg-[#7c27ff]/18 text-white" : "border-white/[.07] bg-white/[.025] text-white/35 hover:border-white/[.13] hover:text-white/65"}`}><Icon size={18} className={active ? "text-[#d9a6ff]" : ""} />{label}{active && <span className="absolute end-2.5 top-2.5 grid size-4 place-items-center rounded-full bg-[#7c27ff] text-white"><Check size={10} /></span>}</button>;
}

function ActionRow({ icon: Icon, title, description, action, onClick, danger = false, confirm = false }: { icon: typeof Download; title: string; description: string; action: string; onClick: () => void; danger?: boolean; confirm?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-xl ${danger ? "bg-rose-400/[.06] text-rose-300/60" : "bg-white/[.035] text-[#c43cff]"}`}><Icon size={15} /></span><div className="min-w-0"><p className="text-xs font-semibold text-white/65">{title}</p><p className="mt-1 truncate text-[10px] text-white/25">{description}</p></div></div><button type="button" onClick={onClick} className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] font-semibold transition ${danger ? confirm ? "border-rose-400/30 bg-rose-400/15 text-rose-200" : "border-rose-400/12 text-rose-300/55 hover:bg-rose-400/[.08]" : "border-white/[.08] text-white/45 hover:bg-white/[.05] hover:text-white/70"}`}>{action}</button></div>;
}

