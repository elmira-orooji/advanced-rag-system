import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Camera,
  Check,
  Languages,
  Monitor,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
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

  const copy = isFa ? {
    eyebrow: "تنظیمات فضای کاری", title: "تنظیمات", subtitle: "تجربه کاربری، زبان و تنظیمات حساب خود را مدیریت کنید.",
    account: "حساب کاربری", accountSub: "اطلاعات حساب فعال", admin: "مدیر فضای کاری", user: "عضو فضای کاری", profileHint: "نام کاربری و نقش از حساب احراز هویت‌شده دریافت می‌شوند.",
    language: "زبان و جهت صفحه", languageSub: "زبان رابط کاربری را انتخاب کنید.", persian: "فارسی", english: "English",
    appearance: "ظاهر برنامه", appearanceSub: "تم مناسب محیط کاری خود را انتخاب کنید.", light: "روشن", dark: "تیره", system: "سیستم",
    notifications: "اعلان‌ها", notificationsSub: "انتخاب کنید چه رویدادهایی به شما اطلاع داده شوند.", answers: "پاسخ‌های آماده", answersSub: "وقتی پاسخ طولانی آماده شد", documents: "پردازش اسناد", documentsSub: "پس از ایندکس یا خطای سند", securityNotice: "هشدارهای امنیتی", securityNoticeSub: "ورود جدید و تغییرات حساب",
    security: "امنیت", securitySub: "نشست شما با توکن امن محافظت می‌شود.", password: "تغییر رمز عبور", passwordHint: "مدیریت رمز عبور در مرحله اتصال API فعال می‌شود.", saved: "تنظیمات ذخیره شد", changePhoto: "تغییر عکس پروفایل", invalidPhoto: "تصویر باید JPG، PNG یا WebP و کمتر از ۳ مگابایت باشد", photoUpdated: "عکس پروفایل تغییر کرد",
  } : {
    eyebrow: "Workspace preferences", title: "Settings", subtitle: "Manage your account, language, and workspace experience.",
    account: "Your account", accountSub: "Active account information", admin: "Workspace admin", user: "Workspace member", profileHint: "Username and role are provided by your authenticated account.",
    language: "Language & direction", languageSub: "Choose the language used across the interface.", persian: "فارسی", english: "English",
    appearance: "Appearance", appearanceSub: "Choose the theme that fits your environment.", light: "Light", dark: "Dark", system: "System",
    notifications: "Notifications", notificationsSub: "Choose which workspace events should notify you.", answers: "Answer ready", answersSub: "When a long-running answer is complete", documents: "Document processing", documentsSub: "When indexing succeeds or fails", securityNotice: "Security alerts", securityNoticeSub: "New sign-ins and account changes",
    security: "Security", securitySub: "Your session is protected with a secure access token.", password: "Change password", passwordHint: "Password management will be enabled when the account API is connected.", saved: "Settings saved", changePhoto: "Change profile photo", invalidPhoto: "Image must be JPG, PNG, or WebP and smaller than 3 MB", photoUpdated: "Profile photo updated",
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
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#a995eb]"><span className="size-1.5 rounded-full bg-[#8f78d8] shadow-[0_0_12px_#8f78d8]" />{copy.eyebrow}</div>
          <h1 className="text-3xl font-semibold tracking-[-.045em] sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">{copy.subtitle}</p>
        </header>

        <div className="mt-5 grid min-h-0 flex-1 gap-5 overflow-y-auto overscroll-contain pb-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden">
          <aside className="app-glass-panel h-fit rounded-[24px] p-5 lg:h-full">
            <div className="flex items-center gap-3 border-b border-white/[.07] pb-5 lg:block lg:text-center">
              <div className="relative shrink-0 lg:mx-auto lg:w-fit">
                <span className="grid size-14 overflow-hidden place-items-center rounded-2xl bg-gradient-to-br from-[#5b35b8] to-[#241052] text-sm font-bold uppercase shadow-[0_10px_30px_rgba(50,18,122,.3)] lg:size-16 lg:text-base">{profileImage ? <img src={profileImage} alt="" className="size-full object-cover" /> : currentUser?.username.slice(0, 2) ?? "U"}</span>
                <label title={copy.changePhoto} className="absolute -bottom-1.5 -end-1.5 grid size-7 cursor-pointer place-items-center rounded-lg border border-white/15 bg-[#32127A] text-white shadow-lg transition hover:bg-[#43208F] focus-within:ring-4 focus-within:ring-[#32127A]/30">
                  <Camera size={13} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => changeProfileImage(event.target.files?.[0])} className="sr-only" aria-label={copy.changePhoto} />
                </label>
              </div>
              <div className="min-w-0 lg:mt-4"><h2 className="truncate text-sm font-semibold lg:text-base">{currentUser?.username ?? "User"}</h2><p className="mt-1 text-[10px] text-[#a995eb]">{currentUser?.role === "admin" ? copy.admin : copy.user}</p></div>
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

          </main>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsCard({ icon: Icon, title, subtitle, children }: { icon: typeof Monitor; title: string; subtitle: string; children: ReactNode }) {
  return <section className="app-glass-panel rounded-[22px] p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#8f78d8]/15 bg-[#32127A]/18 text-[#a995eb]"><Icon size={17} /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[11px] leading-5 text-white/30">{subtitle}</p></div></div>{children}</section>;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] p-3"><Icon size={15} className="shrink-0 text-[#a995eb]" /><div className="min-w-0"><span className="block text-[9px] uppercase tracking-[.12em] text-white/20">{label}</span><strong className="mt-1 block truncate text-xs font-medium text-white/55">{value}</strong></div></div>;
}

function SegmentButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold transition ${active ? "bg-[#32127A] text-white shadow-[0_8px_20px_rgba(50,18,122,.28)]" : "text-white/35 hover:bg-white/[.04] hover:text-white/65"}`}>{active && <Check size={13} />}{label}</button>;
}

function ThemeButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Sun; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`relative flex h-20 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition ${active ? "border-[#8f78d8]/35 bg-[#32127A]/18 text-white" : "border-white/[.07] bg-white/[.025] text-white/35 hover:border-white/[.13] hover:text-white/65"}`}><Icon size={18} className={active ? "text-[#b6a7ef]" : ""} />{label}{active && <span className="absolute end-2.5 top-2.5 grid size-4 place-items-center rounded-full bg-[#32127A]"><Check size={10} /></span>}</button>;
}
