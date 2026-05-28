import React, { useEffect, useRef } from "react";
import { useI18n } from "../lib/i18n";

export default function FilterStrip({ tipuri, activeTip, onSelect }) {
  const { t, tTip } = useI18n();
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const el = activeRef.current;
      const parent = scrollRef.current;
      const elLeft = el.offsetLeft;
      const elRight = elLeft + el.offsetWidth;
      const visibleLeft = parent.scrollLeft;
      const visibleRight = visibleLeft + parent.clientWidth;
      if (elLeft < visibleLeft || elRight > visibleRight) {
        parent.scrollTo({ left: elLeft - 16, behavior: "smooth" });
      }
    }
  }, [activeTip]);

  return (
    <div
      className="sticky top-0 z-40 bg-bg/90 backdrop-blur-md border-b border-line"
      data-testid="filter-strip"
    >
      <div ref={scrollRef} className="filter-strip hide-scrollbar">
        <button
          ref={!activeTip ? activeRef : null}
          data-testid="filter-pill-all"
          onClick={() => onSelect(null)}
          className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-secondary font-semibold transition-all duration-300 ring-1 ${
            !activeTip
              ? "bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.35)] ring-white/20 scale-[1.03]"
              : "bg-theme-soft text-theme-soft ring-transparent hover:bg-white hover:ring-line"
          }`}
        >
          {t("all")}
        </button>
        {tipuri.map((tip) => {
          const active = activeTip === tip;
          return (
            <button
              key={tip}
              ref={active ? activeRef : null}
              data-testid={`filter-pill-${tip.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => onSelect(tip)}
              className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-secondary font-semibold transition-all duration-300 ring-1 ${
                active
                  ? "bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.35)] ring-white/20 scale-[1.03]"
                  : "bg-theme-soft text-theme-soft ring-transparent hover:bg-white hover:ring-line"
              }`}
            >
              {tTip(tip)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
