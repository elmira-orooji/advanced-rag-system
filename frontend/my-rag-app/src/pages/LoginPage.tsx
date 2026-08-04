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
  CircleAlert,
  Eye,
  EyeOff,
  Languages,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import loginHero from "../assets/login-android-hero.png";
import { translations } from "../constants/translations";
import { useLanguage } from "../hooks/useLanguage";
import { loginSchema } from "../schemas/loginSchema";
import type { LoginSchemaType } from "../schemas/loginSchema";
import { authService } from "../services/authService";

export default function LoginPage() {
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
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

  const usernameError = errors.username
    ? isRtl ? "نام کاربری باید حداقل ۳ کاراکتر باشد" : errors.username.message
    : undefined;
  const passwordError = errors.password
    ? isRtl ? "رمز عبور باید حداقل ۸ کاراکتر باشد" : errors.password.message
    : undefined;

  const onSubmit = async (data: LoginSchemaType) => {
    try {
      setIsLoading(true);
      const session = await authService.login(data);
      toast.success(t.success);
      navigate("/home", { replace: true, state: { role: session.user.role } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="ltr"
      className="login-cinematic h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#030303] text-white lg:grid lg:grid-cols-[1.12fr_.88fr]"
    >
      <aside className="relative hidden h-full min-h-0 overflow-hidden lg:block" aria-label="KnowledgeFlow visual">
        <img src={loginHero} alt="" className="absolute inset-0 size-full object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.12),rgba(0,0,0,.04)_58%,#030303_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.18),transparent_44%,rgba(0,0,0,.72)_100%)]" />
      </aside>

      <main dir={isRtl ? "rtl" : "ltr"} className="relative flex h-full min-h-0 items-center justify-center overflow-hidden px-5 py-16 sm:px-10 sm:py-20 lg:px-12 lg:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,rgba(254,40,162,.10),transparent_36%)]" />

        <button
          type="button"
          aria-label={t.changeLanguage}
          onClick={() => changeLanguage(language === "en" ? "fa" : "en")}
          className="absolute right-5 top-5 z-20 flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3.5 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:bg-white/[.08] hover:text-white sm:right-8 sm:top-8"
        >
          <Languages size={17} />
          {language === "en" ? "FA" : "EN"}
        </button>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[430px]"
        >
          <div className="mb-8 grid size-11 place-items-center rounded-xl border border-[#FE28A2]/30 bg-[#FE28A2]/10 text-[#FE28A2] shadow-[0_0_30px_rgba(254,40,162,.16)]">
            <Sparkles size={21} />
          </div>
          <span className="mb-3 block text-xs font-bold uppercase tracking-[.2em] text-[#FE28A2]">{t.eyebrow}</span>
          <h2 className="text-3xl font-semibold tracking-[-.04em] sm:text-[40px]">{t.title}</h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/45">{t.subtitle}</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-5" noValidate>
            <Field id="username" label={t.username} error={usernameError} icon={<UserRound size={18} />} isRtl={isRtl}>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(errors.username)}
                aria-describedby={errors.username ? "username-error" : undefined}
                {...register("username")}
                placeholder={t.usernamePlaceholder}
                className="h-14 w-full rounded-xl border border-white/10 bg-white/[.045] px-12 text-[15px] text-white outline-none ring-4 ring-transparent transition placeholder:text-white/25 hover:border-white/20 focus:border-[#FE28A2]/60 focus:bg-white/[.06] focus:ring-[#FE28A2]/10"
              />
            </Field>

            <Field
              id="password"
              label={t.password}
              error={passwordError}
              icon={<LockKeyhole size={18} />}
              isRtl={isRtl}
              trailing={
                <button
                  type="button"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                  className="grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/[.06] hover:text-white"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            >
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
                placeholder={t.passwordPlaceholder}
                className="h-14 w-full rounded-xl border border-white/10 bg-white/[.045] px-12 text-[15px] text-white outline-none ring-4 ring-transparent transition placeholder:text-white/25 hover:border-white/20 focus:border-[#FE28A2]/60 focus:bg-white/[.06] focus:ring-[#FE28A2]/10"
              />
            </Field>

            <div className="flex items-center justify-between gap-4 pt-1">
              <label className="group flex cursor-pointer items-center gap-2.5 text-sm text-white/50">
                <input type="checkbox" {...register("rememberMe")} className="peer sr-only" />
                <span className="grid size-[18px] place-items-center rounded-[5px] border border-white/20 bg-white/[.04] transition peer-checked:border-[#FE28A2] peer-checked:bg-[#FE28A2] peer-focus-visible:ring-4 peer-focus-visible:ring-[#FE28A2]/20 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                  <Check size={12} strokeWidth={3} className="text-white transition" />
                </span>
                {t.remember}
              </label>
              <button type="button" className="text-sm font-medium text-[#FE28A2] transition hover:text-[#ff6bc1]">
                {t.forgot}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-glow-button group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#FE28A2] px-5 font-semibold text-[#16000d] transition hover:-translate-y-0.5 hover:bg-[#ff54b6] active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              {isLoading ? <LoaderCircle size={19} className="animate-spin" /> : null}
              <span>{isLoading ? t.loading : t.login}</span>
              {!isLoading ? <ArrowRight size={18} className={`transition group-hover:translate-x-1 ${isRtl ? "rotate-180 group-hover:-translate-x-1" : ""}`} /> : null}
            </button>
          </form>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-white/[.08] pt-6 text-xs text-white/30">
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
      <label htmlFor={id} className="mb-2 block text-xs font-semibold text-white/75">{label}</label>
      <div className="relative">
        <span className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-white/35 ${isRtl ? "right-4" : "left-4"}`}>{icon}</span>
        {children}
        {trailing ? <span className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? "left-3" : "right-3"}`}>{trailing}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-400">
          <CircleAlert size={13} aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
