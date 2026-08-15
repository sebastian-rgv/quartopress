"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LANG,
  dictionaries,
  LANG_STORAGE_KEY,
  type I18nKey,
  type Lang,
} from "@/lib/i18n";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return DEFAULT_LANG;
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    return stored === "en" || stored === "es" ? stored : DEFAULT_LANG;
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(LANG_STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => {
      let str = dictionaries[lang][key];
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          str = str.replaceAll(`{${name}}`, String(value));
        }
      }
      return str;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within a LanguageProvider");
  }
  return ctx;
}