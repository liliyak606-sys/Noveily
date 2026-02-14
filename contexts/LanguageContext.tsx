
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';

export type Language = 'en' | 'ru';

interface Translations {
  [key: string]: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  isLoaded: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<{ [key in Language]?: Translations }>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('noveily-lang') as Language | null;
    if (savedLang && ['en', 'ru'].includes(savedLang)) {
      setLanguageState(savedLang);
    }

    const loadTranslations = async () => {
      try {
        const [enResponse, ruResponse] = await Promise.all([
          fetch('locales/en.json'),
          fetch('locales/ru.json')
        ]);
        const enData = await enResponse.json();
        const ruData = await ruResponse.json();
        setTranslations({ en: enData, ru: ruData });
      } catch (error) {
        console.error("Failed to load translations:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTranslations();
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem('noveily-lang', lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, params?: { [key: string]: string | number }): string => {
    const langTranslations = translations[language];
    if (!langTranslations || Object.keys(langTranslations).length === 0) {
      return key;
    }
    
    let translation = langTranslations[key] || key;

    if (params) {
        Object.keys(params).forEach(pKey => {
            translation = translation.replace(`{{${pKey}}}`, String(params[pKey]));
        });
    }
    return translation;
  }, [language, translations]);

  const value = useMemo(() => ({ language, setLanguage, t, isLoaded }), [language, setLanguage, t, isLoaded]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
