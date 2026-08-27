import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Check, Languages, Moon, Palette, Sun } from "lucide-react";
import "../styles/settings.css";

interface SettingsPageProps {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}

export default function SettingsPage({ theme, setTheme }: SettingsPageProps) {
  const { i18n } = useTranslation();
  const isFa = i18n.language.startsWith("fa");
  const reducedMotion = useReducedMotion();
  const copy = isFa ? {
    title: "تنظیمات", subtitle: "ظاهر و زبان رابط کاربری را انتخاب کنید.",
    appearance: "ظاهر برنامه", appearanceSub: "تم مناسب محیط کاری خود را انتخاب کنید.",
    light: "روشن", dark: "تیره", language: "زبان و جهت صفحه",
    languageSub: "جهت صفحه متناسب با زبان انتخاب‌شده تنظیم می‌شود.",
    ltr: "چپ به راست", rtl: "راست به چپ",
  } : {
    title: "Settings", subtitle: "Choose how your workspace looks and reads.",
    appearance: "Appearance", appearanceSub: "Choose the theme that fits your environment.",
    light: "Light", dark: "Dark", language: "Language & direction",
    languageSub: "The interface direction follows your selected language.",
    ltr: "Left to right", rtl: "Right to left",
  };

  const changeLanguage = (language: "en" | "fa") => {
    void i18n.changeLanguage(language);
    localStorage.setItem("lang", language);
    document.documentElement.setAttribute("lang", language);
    document.documentElement.setAttribute("dir", language === "fa" ? "rtl" : "ltr");
  };

  return (
    <motion.div className="preferences-page" dir={isFa ? "rtl" : "ltr"}
      initial={{ opacity: reducedMotion ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: .18 }}>
      <div className="preferences-content">
        <header className="preferences-header">
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </header>
        <section className="preferences-card" aria-labelledby="appearance-title">
          <div className="preferences-section-heading">
            <span className="preferences-icon"><Palette size={18} aria-hidden="true" /></span>
            <div><h2 id="appearance-title">{copy.appearance}</h2><p>{copy.appearanceSub}</p></div>
          </div>
          <div className="preferences-options" role="radiogroup" aria-labelledby="appearance-title">
            {(["light", "dark"] as const).map((value) => {
              const Icon = value === "light" ? Sun : Moon;
              return <label key={value} className="preferences-choice">
                <input type="radio" name="appearance" value={value} checked={theme === value} onChange={() => setTheme(value)} />
                <span className={`preferences-preview preferences-preview--${value}`} aria-hidden="true">
                  <span className="preferences-preview-sidebar"><i /><i /><i /></span>
                  <span className="preferences-preview-body"><i /><span><i /><i /></span><i /></span>
                </span>
                <span className="preferences-choice-footer"><Icon size={16} aria-hidden="true" /><span>{copy[value]}</span><span className="preferences-check" aria-hidden="true">{theme === value && <Check size={12} />}</span></span>
              </label>;
            })}
          </div>
        </section>
        <section className="preferences-card" aria-labelledby="language-title">
          <div className="preferences-section-heading">
            <span className="preferences-icon"><Languages size={18} aria-hidden="true" /></span>
            <div><h2 id="language-title">{copy.language}</h2><p>{copy.languageSub}</p></div>
          </div>
          <div className="preferences-options" role="radiogroup" aria-labelledby="language-title">
            {(["en", "fa"] as const).map((language) => {
              const active = language === "fa" ? isFa : !isFa;
              return <label key={language} className="preferences-choice preferences-language">
                <input type="radio" name="language" value={language} checked={active} onChange={() => changeLanguage(language)} />
                <span className="preferences-language-symbol" aria-hidden="true">{language === "fa" ? "فا" : "En"}</span>
                <span className="preferences-language-copy"><strong lang={language}>{language === "fa" ? "فارسی" : "English"}</strong><span>{language === "fa" ? copy.rtl : copy.ltr}</span></span>
                <span className="preferences-check" aria-hidden="true">{active && <Check size={12} />}</span>
              </label>;
            })}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
