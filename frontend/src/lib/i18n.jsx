import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { translations, LANGUAGES } from "./translations";

const I18nContext = createContext(null);

const STORAGE_KEY = "zero_lang";

function detectDefault() {
  if (typeof window === "undefined") return "ro";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && translations[saved]) return saved;
  const nav = (navigator.language || "ro").toLowerCase();
  if (nav.startsWith("ru")) return "ru";
  if (nav.startsWith("en")) return "en";
  return "ro";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectDefault);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key) => {
      const dict = translations[lang] || translations.ro;
      const val = key.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), dict);
      if (val !== undefined) return val;
      // fallback RO
      const fb = key.split(".").reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), translations.ro);
      return fb !== undefined ? fb : key;
    },
    [lang]
  );

  const tTip = useCallback(
    (tipKey) => {
      const map = (translations[lang] && translations[lang].tipuri) || {};
      return map[tipKey] || tipKey;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t, tTip, languages: LANGUAGES }), [lang, t, tTip]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}

// Helpers to pick localized fields from a product document.
// Falls back EN→RO, RU→RO, or legacy `nume`/`descriere` fields.
export function localizedName(produs, lang) {
  if (!produs) return "";
  return produs[`nume_${lang}`] || produs.nume_ro || produs.nume || "";
}

export function localizedDescription(produs, lang) {
  if (!produs) return "";
  return produs[`descriere_${lang}`] || produs.descriere_ro || produs.descriere || "";
}
