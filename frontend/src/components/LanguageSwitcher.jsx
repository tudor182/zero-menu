import React from "react";
import { useI18n } from "../lib/i18n";

export default function LanguageSwitcher({ compact = false }) {
  const { lang, setLang, languages } = useI18n();
  return (
    <div
      data-testid="language-switcher"
      className={`inline-flex items-center gap-0.5 bg-white border border-line rounded-full p-0.5 shadow-sm`}
    >
      {languages.map((l) => {
        const active = lang === l.code;
        return (
          <button
            key={l.code}
            data-testid={`lang-${l.code}`}
            onClick={() => setLang(l.code)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider transition ${
              active ? "bg-ink text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
            aria-label={l.name}
            title={l.name}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
