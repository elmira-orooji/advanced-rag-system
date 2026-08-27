import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Check,
  CircleAlert,
  CircleCheck,
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
  WifiOff,
} from "lucide-react";

import { translations } from "../constants/translations";
import { useLanguage } from "../hooks/useLanguage";
import { loginSchema } from "../schemas/loginSchema";
import type { LoginSchemaType } from "../schemas/loginSchema";
import { authService } from "../services/authService";
import "../styles/login.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { language, changeLanguage } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(
    () =>
      (localStorage.getItem("knowledgeflow.login-theme") as "dark" | "light" | null) ||
      "dark",
  );
  const [capsLock, setCapsLock] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const t = translations[language];
  const isRtl = language === "fa";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema) as never,
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
      organization: "default",
    },
  });

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  const updateCapsLock = (event: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState("CapsLock"));

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("knowledgeflow.login-theme", next);
      return next;
    });
  };

  const onSubmit = async (data: LoginSchemaType) => {
    setServerError("");
    setSuccessMessage("");
    if (!navigator.onLine) {
      setServerError(isRtl ? "اتصال اینترنت در دسترس نیست." : "You appear to be offline.");
      return;
    }
    try {
      setIsLoading(true);
      const session = await authService.login(data);
      setSuccessMessage(t.success);
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      navigate("/home", { replace: true, state: { role: session.user.role } });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : isRtl
            ? "ورود انجام نشد. دوباره تلاش کنید."
            : "Unable to sign in. Please try again.",
      );
      setFocus("password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="ltr"
      className={`nexora-login ${theme === "light" ? "nexora-login--light" : ""}`}
    >
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="nexora-login__shell"
      >
        <aside dir="ltr" className="nexora-login__visual" aria-label={isRtl ? "فضای دانش نکسورا" : "Nexora knowledge workspace"}>
          <img src="/assets/nexora-rag-hero-transparent-v2.png" alt="Nexora retrieval augmented generation knowledge network" />
          <div className="nexora-login__visual-shade" />
          <div className="nexora-login__brand">
            <img src="/brand/nexora-horizontal-light.svg" alt="Nexora" />
          </div>
        </aside>

        <main dir={isRtl ? "rtl" : "ltr"} className="nexora-login__main">
          <div className="nexora-login__toolbar">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isRtl ? (theme === "dark" ? "فعال‌کردن حالت روشن" : "فعال‌کردن حالت تیره") : (theme === "dark" ? "Switch to light mode" : "Switch to dark mode")}
              className="nexora-login__theme-toggle"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              onClick={() => changeLanguage(language === "en" ? "fa" : "en")}
              aria-label={t.changeLanguage}
              className="nexora-login__language-toggle"
            >
              <Languages size={15} />
              <span>{language === "en" ? "FA" : "EN"}</span>
            </button>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, duration: 0.5 }}
            className={`nexora-login__form-wrap ${showWorkspace || Object.keys(errors).length > 0 || serverError || !isOnline || capsLock ? "nexora-login__form-wrap--expanded" : ""}`}
          >
            <header className="nexora-login__heading">
              <div className="nexora-login__card-identity">
                <div className="nexora-login__welcome-icon" aria-hidden="true"><LockKeyhole size={22} strokeWidth={1.5} /></div>
                <span dir="ltr">NEXORA<span>KNOWLEDGE WORKSPACE</span></span>
              </div>
              <span className="nexora-login__eyebrow">
                <Sparkles size={12} />
                {isRtl ? "خوش آمدید" : "WELCOME BACK"}
              </span>
              <h1>{t.title}</h1>
              <p>{isRtl ? "برای دسترسی به اسناد و گفتگوها، وارد حساب خود شوید." : "Sign in to access your documents and conversations."}</p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="nexora-login__form">
              <AnimatePresence initial={false}>
                {showWorkspace && (
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2 }}
                    id="login-workspace"
                    className="overflow-hidden"
                  >
                    <LoginField
                      id="organization"
                      label={isRtl ? "فضای کاری" : "Workspace"}
                      error={errors.organization?.message}
                      icon={<Building2 size={17} />}
                      isRtl={isRtl}
                    >
                      <input
                        id="organization"
                        type="text"
                        autoComplete="organization"
                        aria-invalid={Boolean(errors.organization)}
                        aria-describedby={errors.organization ? "organization-error" : undefined}
                        {...register("organization")}
                        placeholder="default"
                      />
                    </LoginField>
                  </motion.div>
                )}
              </AnimatePresence>

              <LoginField
                id="username"
                label={t.username}
                error={
                  errors.username
                    ? isRtl
                      ? "نام کاربری باید حداقل ۳ کاراکتر باشد."
                      : errors.username.message
                    : undefined
                }
                icon={<UserRound size={17} />}
                isRtl={isRtl}
              >
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  aria-invalid={Boolean(errors.username)}
                  aria-describedby={errors.username ? "username-error" : undefined}
                  {...register("username")}
                  placeholder={t.usernamePlaceholder}
                />
              </LoginField>

              <LoginField
                id="password"
                label={t.password}
                error={
                  errors.password
                    ? isRtl
                      ? "رمز عبور باید حداقل ۸ کاراکتر باشد."
                      : errors.password.message
                    : undefined
                }
                icon={<LockKeyhole size={17} />}
                isRtl={isRtl}
                trailing={
                  <button
                    type="button"
                    aria-label={showPassword ? t.hidePassword : t.showPassword}
                    aria-pressed={showPassword}
                    aria-controls="password"
                    onClick={() => setShowPassword((current) => !current)}
                    className="nexora-login__password-toggle"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
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
                  onKeyUp={updateCapsLock}
                  onKeyDown={updateCapsLock}
                  onBlur={() => setCapsLock(false)}
                  placeholder={t.passwordPlaceholder}
                />
              </LoginField>

              {capsLock && (
                <p role="status" className="nexora-login__notice nexora-login__notice--warning">
                  <CircleAlert size={13} />
                  {isRtl ? "Caps Lock روشن است." : "Caps Lock is on."}
                </p>
              )}
              {!isOnline && (
                <p role="alert" className="nexora-login__notice nexora-login__notice--warning">
                  <WifiOff size={13} />
                  {isRtl ? "اتصال شبکه قطع است." : "Network connection is unavailable."}
                </p>
              )}
              {serverError && (
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="alert"
                  className="nexora-login__error"
                >
                  <CircleAlert size={14} />
                  {serverError}
                </motion.p>
              )}
              {successMessage && (
                <motion.p
                  initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  aria-live="polite"
                  className="nexora-login__success"
                >
                  <CircleCheck size={16} />
                  <span>{successMessage}</span>
                </motion.p>
              )}

              <div className="nexora-login__options">
                <label>
                  <input type="checkbox" {...register("rememberMe")} />
                  <span className="nexora-login__checkbox"><Check size={11} /></span>
                  {t.remember}
                </label>
                <button type="button" aria-expanded={showWorkspace} aria-controls={showWorkspace ? "login-workspace" : undefined} onClick={() => setShowWorkspace((current) => !current)}>
                  {showWorkspace
                    ? isRtl ? "بستن فضای کاری" : "Hide workspace"
                    : isRtl ? "تغییر فضای کاری" : "Change workspace"}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isOnline}
                aria-busy={isLoading}
                className="nexora-login__submit"
              >
                {isLoading && <LoaderCircle size={18} className="animate-spin" />}
                <span>{isLoading ? t.loading : t.login}</span>
                {!isLoading && <ArrowRight size={16} className={isRtl ? "rotate-180" : ""} />}
              </button>
            </form>

            <footer>
              <span />
              <p>
                <ShieldCheck size={12} />
                {isRtl ? "ورود امن به فضای دانش شما" : "Secure access to your knowledge workspace"}
              </p>
              <span />
            </footer>
            <p className="nexora-login__access-help">{isRtl ? "حساب کاربری ندارید؟ با مدیر فضای کاری تماس بگیرید." : "Need an account? Contact your workspace administrator."}</p>
          </motion.div>
          <div className="nexora-login__page-footer"><span>© {new Date().getFullYear()} Nexora</span><span>{isRtl ? "فضای کاری دانش" : "Your knowledge. Your workspace."}</span></div>
        </main>
      </motion.section>
    </div>
  );
}

function LoginField({
  id,
  label,
  error,
  icon,
  trailing,
  isRtl,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
  isRtl: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="nexora-login__field">
      <label htmlFor={id}>{label}</label>
      <div>
        <span className={isRtl ? "is-rtl" : ""}>{icon}</span>
        {children}
        {trailing && <div className={`nexora-login__trailing ${isRtl ? "is-rtl" : ""}`}>{trailing}</div>}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert">
          <CircleAlert size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
