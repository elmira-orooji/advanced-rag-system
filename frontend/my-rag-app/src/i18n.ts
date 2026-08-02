import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: localStorage.getItem("lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  resources: {
    en: {
      translation: {
        home: "Home",
        tasks: "My Tasks",
        upload: "Upload Files",
        settings: "Settings",
        logout: "Logout",
        users: "Users",
        language: "Language",
        theme: "Theme",
        today: "Today",
        yesterday: "Yesterday",
        light: "Light",
        dark: "Dark",
        productManager: "Product Manager",
      },
    },
    fa: {
      translation: {
        home: "خانه",
        tasks: "وظایف من",
        upload: "بارگذاری فایل",
        settings: "تنظیمات",
        logout: "خروج",
        users: "کاربران",
        language: "زبان",
        theme: "پوسته",
        today: "امروز",
        yesterday: "دیروز",
        light: "روشن",
        dark: "تیره",
        productManager: "مدیر محصول",
      },
    },
  },
});

export default i18n;
