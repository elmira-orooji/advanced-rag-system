import { useEffect, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowRight, Building2, Check, CircleAlert, Eye, EyeOff, Languages, LoaderCircle, LockKeyhole, Moon, ShieldCheck, Sparkles, Sun, UserRound, WifiOff } from "lucide-react";

import loginHero from "../assets/login-android-hero-purple.png";
import { translations } from "../constants/translations";
import { useLanguage } from "../hooks/useLanguage";
import { loginSchema } from "../schemas/loginSchema";
import type { LoginSchemaType } from "../schemas/loginSchema";
import { authService } from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("knowledgeflow.login-theme") as "dark" | "light" | null) || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
  const [capsLock, setCapsLock] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const t = translations[language]; const isRtl = language === "fa";
  const { register, handleSubmit, formState: { errors }, setFocus } = useForm<LoginSchemaType>({ resolver: zodResolver(loginSchema) as never, defaultValues: { username: "", password: "", rememberMe: false, organization: "default" } });

  useEffect(() => {
    const online = () => setIsOnline(true); const offline = () => setIsOnline(false);
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);

  const updateCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState("CapsLock"));
  const toggleTheme = () => setTheme((current) => { const next = current === "dark" ? "light" : "dark"; localStorage.setItem("knowledgeflow.login-theme", next); return next; });
  const onSubmit = async (data: LoginSchemaType) => {
    setServerError("");
    if (!navigator.onLine) { setServerError(isRtl ? "اتصال اینترنت در دسترس نیست." : "You appear to be offline."); return; }
    try { setIsLoading(true); const session = await authService.login(data); toast.success(t.success); navigate("/home", { replace: true, state: { role: session.user.role } }); }
    catch (error) { setServerError(error instanceof Error ? error.message : (isRtl ? "ورود انجام نشد. دوباره تلاش کنید." : "Unable to sign in. Please try again.")); setFocus("password"); }
    finally { setIsLoading(false); }
  };

  return <div dir="ltr" className={`login-page relative grid h-[100dvh] max-h-[100dvh] overflow-hidden text-white lg:grid-cols-[1.02fr_.98fr] ${theme === "light" ? "login-light bg-[#f3f0f7]" : "bg-[#030304]"}`}>
    <aside className="login-hero relative hidden min-h-0 overflow-hidden border-e border-white/[.06] lg:block" aria-label="KnowledgeFlow visual">
      <img src={loginHero} alt="" className="login-hero-image absolute inset-0 size-full object-cover object-[48%_54%]" />
      <div className="login-hero-horizontal absolute inset-0 bg-[linear-gradient(90deg,rgba(2,2,3,.05),rgba(2,2,3,.02)_58%,#030304_100%)]" />
      <div className="login-hero-vertical absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,4,.12),transparent_45%,rgba(3,3,4,.65)_100%)]" />
      <div className="login-hero-bottom absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030304]/90 to-transparent" />
    </aside>

    <main dir={isRtl ? "rtl" : "ltr"} className="login-main relative flex min-h-0 items-center justify-center overflow-y-auto px-4 py-5 sm:px-8 lg:overflow-hidden lg:px-10">
      <img src={loginHero} alt="" className="login-mobile-hero pointer-events-none absolute inset-0 size-full scale-110 object-cover object-[center_42%] opacity-[.13] blur-[3px] lg:hidden" />
      <div className="login-backdrop pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(50,18,122,.22),transparent_42%),linear-gradient(rgba(3,3,4,.82),#030304)] lg:bg-[radial-gradient(circle_at_50%_48%,rgba(50,18,122,.14),transparent_42%)]" />

      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }} className="login-panel relative my-auto w-full max-w-[410px] rounded-[20px] border border-white/[.08] p-5 sm:p-6">
        <header>
          <div className="flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#32127A] text-white"><Sparkles size={16} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold tracking-[-.02em]">KnowledgeFlow</p><p className="mt-0.5 truncate text-[9px] text-white/40">AI knowledge workspace</p></div></div><div className="flex shrink-0 gap-1.5"><button type="button" aria-label={theme === "dark" ? (isRtl ? "فعال‌کردن حالت روشن" : "Enable light mode") : (isRtl ? "فعال‌کردن حالت تاریک" : "Enable dark mode")} onClick={toggleTheme} className="login-control grid size-8 place-items-center rounded-lg border border-white/[.08] text-white/50 transition hover:bg-white/[.06] hover:text-white">{theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}</button><button type="button" aria-label={t.changeLanguage} onClick={() => changeLanguage(language === "en" ? "fa" : "en")} className="login-control flex h-8 items-center gap-1 rounded-lg border border-white/[.08] px-2 text-[9px] font-semibold text-white/50 transition hover:bg-white/[.06] hover:text-white"><Languages size={13} />{language === "en" ? "FA" : "EN"}</button></div></div>
          <div className="mt-6"><h1 className="text-[26px] font-semibold leading-tight tracking-[-.04em] sm:text-[30px]">{t.title}</h1><p className="mt-2 max-w-sm text-xs leading-5 text-white/50">{t.subtitle}</p></div>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-3.5" noValidate>
          <AnimatePresence initial={false}>{showWorkspace && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden"><Field id="organization" label={isRtl ? "فضای کاری" : "Workspace"} error={errors.organization?.message} icon={<Building2 size={17} />} isRtl={isRtl}><input id="organization" type="text" autoComplete="organization" {...register("organization")} placeholder="default" className="login-input" /></Field></motion.div>}</AnimatePresence>
          <Field id="username" label={t.username} error={errors.username ? (isRtl ? "نام کاربری باید حداقل ۳ کاراکتر باشد." : errors.username.message) : undefined} icon={<UserRound size={17} />} isRtl={isRtl}><input id="username" type="text" autoComplete="username" autoFocus aria-invalid={Boolean(errors.username)} {...register("username")} placeholder={t.usernamePlaceholder} className="login-input" /></Field>
          <Field id="password" label={t.password} error={errors.password ? (isRtl ? "رمز عبور باید حداقل ۸ کاراکتر باشد." : errors.password.message) : undefined} icon={<LockKeyhole size={17} />} isRtl={isRtl} trailing={<button type="button" aria-label={showPassword ? t.hidePassword : t.showPassword} onClick={() => setShowPassword(!showPassword)} className="grid size-8 place-items-center rounded-lg text-white/35 transition hover:bg-white/[.06] hover:text-white">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>}><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register("password")} onKeyUp={updateCapsLock} onKeyDown={updateCapsLock} onBlur={() => setCapsLock(false)} placeholder={t.passwordPlaceholder} className="login-input" /></Field>
          {capsLock && <p className="-mt-2 flex items-center gap-1.5 text-[10px] text-amber-200/65"><CircleAlert size={12} />{isRtl ? "Caps Lock روشن است." : "Caps Lock is on."}</p>}
          {!isOnline && <p className="flex items-center gap-2 rounded-xl border border-amber-300/10 bg-amber-300/[.045] px-3 py-2.5 text-[10px] text-amber-100/60"><WifiOff size={13} />{isRtl ? "اتصال شبکه قطع است." : "Network connection is unavailable."}</p>}
          {serverError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300/12 bg-rose-300/[.045] px-3 py-2.5 text-[11px] leading-5 text-rose-100/70"><CircleAlert size={14} className="mt-0.5 shrink-0" />{serverError}</motion.p>}
          <div className="flex items-center justify-between gap-3 pt-1"><label className="group flex cursor-pointer items-center gap-2 text-[11px] text-white/55"><input type="checkbox" {...register("rememberMe")} className="peer sr-only" /><span className="grid size-[17px] place-items-center rounded-[5px] border border-white/15 bg-black/15 transition peer-checked:border-[#6f52c5] peer-checked:bg-[#32127A] peer-focus-visible:ring-4 peer-focus-visible:ring-[#32127A]/30 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"><Check size={11} strokeWidth={3} /></span>{t.remember}</label><button type="button" onClick={() => setShowWorkspace(!showWorkspace)} className="text-[11px] font-medium text-[#b7a6ef] transition hover:text-[#d0c5f5]">{showWorkspace ? (isRtl ? "بستن فضای کاری" : "Hide workspace") : (isRtl ? "تغییر فضای کاری" : "Change workspace")}</button></div>
          <button type="submit" disabled={isLoading || !isOnline} className="login-glow-button group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#32127A] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#43208F] active:translate-y-0 disabled:pointer-events-none disabled:opacity-45"><span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />{isLoading && <LoaderCircle size={18} className="animate-spin" />}<span>{isLoading ? t.loading : t.login}</span>{!isLoading && <ArrowRight size={17} className={`transition group-hover:translate-x-1 ${isRtl ? "rotate-180 group-hover:-translate-x-1" : ""}`} />}</button>
        </form>
        <footer className="mt-5 flex items-center justify-center gap-2 border-t border-white/[.07] pt-4 text-[9px] text-white/35"><ShieldCheck size={12} />{t.copyright}</footer>
      </motion.section>
    </main>
  </div>;
}

function Field({ id, label, error, icon, trailing, isRtl, children }: { id: string; label: string; error?: string; icon: ReactNode; trailing?: ReactNode; isRtl: boolean; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1.5 block text-[11px] font-semibold text-white/65">{label}</label><div className="relative"><span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/30 ${isRtl ? "right-4" : "left-4"}`}>{icon}</span>{children}{trailing && <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "left-3" : "right-3"}`}>{trailing}</span>}</div>{error && <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-rose-300/75"><CircleAlert size={12} />{error}</p>}</div>;
}
