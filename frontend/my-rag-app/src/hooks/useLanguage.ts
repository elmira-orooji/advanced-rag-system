import { useEffect, useState } from "react";

export type Language = "en" | "fa";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language");

    if (savedLanguage === "fa" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  return {
    language,
    changeLanguage,
  };
}