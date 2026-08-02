import { useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Languages,
  LoaderCircle,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";

import KnowledgeMotion from "../components/KnowledgeMotion";
import { translations } from "../constants/translations";
import { loginSchema } from "../schemas/loginSchema";
import type { LoginSchemaType } from "../schemas/loginSchema";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";

export default function LoginPage() {
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const { darkMode, setDarkMode } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const t = translations[language];
  const isRtl = language === "fa";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: { username: "", password: "", rememberMe: false },
  });

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 900));
      void data;
      toast.success(t.success);
      navigate("/home");
    } finally {
      setIsLoading(false);
    }
  };

  const page = darkMode ? "bg-[#080d18] text-white" : "bg-[#f4f7fb] text-slate-950";
  const card = darkMode
    ? "border-white/10 bg-[#101827]/95 shadow-black/30"
    : "border-slate-200/80 bg-white/95 shadow-slate-900/10";
  const input = darkMode
    ? "border-slate-700 bg-slate-900/70 text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-blue-400/20"
    : "border-slate-200 bg-slate-50/80 text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-blue-500/15";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className={`min-h-[100dvh] lg:grid lg:grid-cols-[1.08fr_0.92fr] ${page}`}>
      <aside className="relative hidden min-h-[100dvh] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[#06101f]" />
        <KnowledgeMotion />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,11,25,.08),rgba(4,11,25,.05)_45%,rgba(4,11,25,.88))]" />

        <div className="relative z-10 flex items-center gap-3 p-10 text-white xl:p-14">
          <span className="grid size-11 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl">
            <Sparkles size={21} />
          </span>
          <div>
            <p className="text-base font-bold tracking-tight">KnowledgeFlow</p>
            <p className="text-xs text-blue-100/70">AI knowledge workspace</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 max-w-2xl p-10 text-white xl:p-14"
        >
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-blue-50 backdrop-blur-xl">
            <ShieldCheck size={15} />
            {t.secureWorkspace}
          </span>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-[-0.035em] xl:text-5xl">
            {t.heroTitle}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-200/80 xl:text-lg">
            {t.heroBody}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-100/85">
            {[t.featureSearch, t.featureSources, t.featurePrivacy].map((feature) => (
              <span key={feature} className="flex items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
                <Check size={14} className="text-blue-300" />
                {feature}
              </span>
            ))}
          </div>
        </motion.div>
      </aside>

      <main className="relative flex min-h-[100dvh] items-center justify-center px-4 py-24 sm:px-8 lg:px-10 lg:py-12">
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 sm:p-8 lg:justify-end lg:gap-2">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Sparkles size={17} />
            </span>
            <span className="text-sm font-bold tracking-tight">KnowledgeFlow</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label={t.toggleTheme}
              onClick={() => setDarkMode(!darkMode)}
              className={`grid size-10 place-items-center rounded-xl border transition hover:-translate-y-0.5 ${darkMode ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              aria-label={t.changeLanguage}
              onClick={() => changeLanguage(language === "en" ? "fa" : "en")}
              className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition hover:-translate-y-0.5 ${darkMode ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"}`}
            >
              <Languages size={17} />
              {language === "en" ? "FA" : "EN"}
            </button>
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full max-w-[460px] rounded-[28px] border p-6 shadow-2xl backdrop-blur-xl sm:p-9 ${card}`}
        >
          <div className="mb-8">
            <span className="mb-3 block text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{t.eyebrow}</span>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] sm:text-[34px]">{t.title}</h2>
            <p className={`mt-2 text-sm leading-6 ${muted}`}>{t.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Field
              id="username"
              label={t.username}
              error={errors.username?.message}
              icon={<UserRound size={18} />}
              isRtl={isRtl}
            >
              <input
                id="username"
                type="text"
                autoComplete="username"
                {...register("username")}
                placeholder={t.usernamePlaceholder}
                className={`h-13 w-full rounded-2xl border px-12 text-[15px] outline-none ring-4 ring-transparent transition ${input}`}
              />
            </Field>

            <Field
              id="password"
              label={t.password}
              error={errors.password?.message}
              icon={<LockKeyhole size={18} />}
              isRtl={isRtl}
              trailing={
                <button
                  type="button"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className={`grid size-8 place-items-center rounded-lg transition hover:bg-slate-500/10 ${muted}`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            >
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                placeholder={t.passwordPlaceholder}
                className={`h-13 w-full rounded-2xl border px-12 text-[15px] outline-none ring-4 ring-transparent transition ${input}`}
              />
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${muted}`}>
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                {t.remember}
              </label>
              <button type="button" className="text-sm font-semibold text-blue-600 transition hover:text-blue-700">
                {t.forgot}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-70"
            >
              {isLoading ? <LoaderCircle size={19} className="animate-spin" /> : null}
              <span>{isLoading ? t.loading : t.login}</span>
              {!isLoading ? <ArrowRight size={18} className={`transition group-hover:translate-x-0.5 ${isRtl ? "rotate-180 group-hover:-translate-x-0.5" : ""}`} /> : null}
            </button>
          </form>

          <div className={`mt-7 flex items-center justify-center gap-2 border-t pt-6 text-xs ${darkMode ? "border-white/10 text-slate-500" : "border-slate-100 text-slate-400"}`}>
            <ShieldCheck size={14} />
            {t.copyright}
          </div>
        </motion.section>
      </main>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  icon: ReactNode;
  trailing?: ReactNode;
  isRtl: boolean;
  children: ReactNode;
}

function Field({ id, label, error, icon, trailing, isRtl, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? "right-4" : "left-4"}`}>
          {icon}
        </span>
        {children}
        {trailing ? (
          <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "left-3" : "right-3"}`}>{trailing}</span>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs font-medium text-rose-500">{error}</p> : null}
    </div>
  );
}
