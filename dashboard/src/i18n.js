import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locates/en/translation.json';
import viTranslation from './locates/vi/translation.json';

// Tài nguyên bản dịch
const resources = {
  en: enTranslation,
  vi: viTranslation,
};

i18n
  .use(LanguageDetector) // Phát hiện ngôn ngữ trình duyệt
  .use(initReactI18next) // Kết nối với React
  .init({
    resources,
    fallbackLng: 'en', // Ngôn ngữ mặc định nếu không phát hiện được
    interpolation: {
      escapeValue: false, // React đã xử lý XSS
    },
  });

export default i18n;