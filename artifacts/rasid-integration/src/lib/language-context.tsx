import { createContext, useContext, useState, useEffect } from "react";
import { ar } from "@/translations/ar";
import { en } from "@/translations/en";

export type Lang = "ar" | "en";

interface LanguageContextType {
  lang: Lang;
  dir: "rtl" | "ltr";
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("lang");
    return saved === "en" ? "en" : "ar";
  });

  const setLang = (newLang: Lang) => {
    localStorage.setItem("lang", newLang);
    setLangState(newLang);
  };

  const dir: "rtl" | "ltr" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang, dir]);

  const t = (key: string): string => {
    const dict = lang === "ar" ? ar : en;
    return dict[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
