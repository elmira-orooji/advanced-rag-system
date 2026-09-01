import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { authService } from "../services/authService";

export default function NotFoundPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const authenticated = authService.isAuthenticated();
  const fa = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("fa");

  return <main dir={fa ? "rtl" : "ltr"} className="relative grid min-h-[100dvh] overflow-hidden bg-[#080d1c] px-5 py-12 text-white">
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7c27ff]/15 blur-[140px]" />
      <div className="app-grid absolute inset-0 opacity-40" />
    </div>
    <section className="relative z-10 m-auto w-full max-w-lg rounded-[28px] border border-white/[.08] bg-white/[.035] p-7 text-center shadow-2xl backdrop-blur-xl sm:p-10" aria-labelledby="not-found-title">
      <img src="/brand/nexora-symbol.svg" alt="" className="mx-auto size-11" />
      <span className="mx-auto mt-8 grid size-14 place-items-center rounded-2xl border border-[#c43cff]/20 bg-[#7c27ff]/15 text-[#d9a6ff]" aria-hidden="true"><SearchX size={24} /></span>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.18em] text-[#c69cff]">{t("notFound.eyebrow")}</p>
      <h1 id="not-found-title" className="mt-2 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">{t("notFound.title")}</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-white/45">{t("notFound.description")}</p>
      <code dir="ltr" className="mx-auto mt-5 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-white/[.07] bg-black/20 px-3 py-2 text-[11px] text-white/35">{location.pathname}</code>
      <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
        <Link to={authenticated ? "/home" : "/"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#7c27ff] px-5 text-xs font-semibold shadow-[0_8px_28px_rgba(124,39,255,.25)]"><Home size={15} />{authenticated ? t("notFound.home") : t("notFound.login")}</Link>
        {authenticated && <Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-xs text-white/55 hover:bg-white/[.05]"><ArrowLeft size={15} className={fa ? "rotate-180" : ""} />{t("notFound.login")}</Link>}
      </div>
    </section>
  </main>;
}
