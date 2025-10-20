// filepath: frontend/src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      title: "Welcome to Imfrisiv Mail",
      description: "Organize your emails efficiently and securely.",
    },
  },
  tl: {
    translation: {
      title: "Pagbati sa Liham Imfrisiv",
      description: "Ayusin ang iyong mga email nang mahusay at ligtas.",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en", // Default language
  fallbackLng: "en",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;