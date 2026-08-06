import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { LANGUAGES, type Language, type LanguageCode } from "./languages";

const LANGUAGE_STORAGE_KEY = "budgetflow-language";

type LanguageContextValue = {
  activeLanguage: Language;
  setLanguage: (language: LanguageCode) => void;
};

type LanguageProviderProps = {
  children: ReactNode;
};

const getInitialLanguage = (): LanguageCode => {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (storedLanguage === "en" || storedLanguage === "pt") return storedLanguage;

  return window.navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
};

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children }: LanguageProviderProps) => {
  const [languageCode, setLanguageCode] = useState<LanguageCode>(getInitialLanguage);
  const activeLanguage = LANGUAGES[languageCode];

  useEffect(() => {
    document.documentElement.lang = activeLanguage.code;
    document.documentElement.dataset.bfLanguage = activeLanguage.code;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, activeLanguage.code);
  }, [activeLanguage]);

  const value = useMemo(
    () => ({ activeLanguage, setLanguage: setLanguageCode }),
    [activeLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
