import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n
  .use(initReactI18next)
  .init({
    lng: "en",
    fallbackLng: "en",

    resources: {
      en: {
        translation: {
          home: "Home",
          tasks: "My Tasks",
          upload: "Upload Files",
          settings: "Settings",
          logout: "Logout",

          language: "Language",
          theme: "Theme",

          light: "Light",
          dark: "Dark",

          productManager: "Product Manager",
        },
      },

      fa: {
        translation: {
          home: "خانه",
          tasks: "وظایف من",
          upload: "آپلود فایل",
          settings: "تنظیمات",
          logout: "خروج",

          language: "زبان",
          theme: "تم",

          light: "روشن",
          dark: "تیره",

          productManager: "مدیر محصول",
        },
      },
    },
  });

export default i18n;