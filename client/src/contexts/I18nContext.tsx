import React, { createContext, useContext, useState, useEffect } from 'react';
import { initReactI18next, i18n } from 'react-i18next';
import i18next from 'i18next';

// Translation resources
import enTranslations from '../locales/en.json';
import zhTranslations from '../locales/zh.json';

interface I18nContextType {
  currentLanguage: 'en' | 'zh';
  changeLanguage: (lang: 'en' | 'zh') => void;
  t: (key: string, options?: any) => string;
  i18n: i18n;
}

const I18nContext = createContext<I18nContextType>({
  currentLanguage: 'en',
  changeLanguage: () => {},
  t: (key: string) => key,
  i18n: i18next,
});

export const useI18n = () => useContext(I18nContext);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'zh'>('en');

  useEffect(() => {
    // Initialize i18next
    i18next
      .use(initReactI18next)
      .init({
        resources: {
          en: {
            translation: enTranslations,
          },
          zh: {
            translation: zhTranslations,
          },
        },
        lng: currentLanguage,
        fallbackLng: 'en',
        interpolation: {
          escapeValue: false,
        },
      });

    // Set HTML lang attribute
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const changeLanguage = (lang: 'en' | 'zh') => {
    i18next.changeLanguage(lang);
    setCurrentLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const value: I18nContextType = {
    currentLanguage,
    changeLanguage,
    t: (key: string, options?: any) => i18next.t(key, options),
    i18n: i18next,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};