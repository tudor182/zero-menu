import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useI18n, localizedName, localizedDescription } from "../lib/i18n";
import { resolveImage } from "../lib/api";

export default function ProductRow({ produs, to }) {
  const { tTip, lang } = useI18n();
  const nume = localizedName(produs, lang);
  const descriere = localizedDescription(produs, lang);
  const imgSrc = resolveImage(produs.imagine);

  return (
    <Link
      to={to}
      data-testid={`product-item-${produs.id}`}
      data-product-id={produs.id}
      className="group relative block mb-3.5 sm:mb-4 bg-white rounded-2xl border border-line/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_14px_36px_-14px_rgba(0,0,0,0.18)] hover:-translate-y-[2px] hover:border-theme-primary/40 transition-all duration-400 active:scale-[0.995] overflow-hidden product-row"
    >
      {/* Decorative corner accent */}
      <div className="pointer-events-none absolute top-0 left-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-0 w-8 h-[2px] bg-gradient-to-r from-theme-primary to-transparent" />
        <div className="absolute top-0 left-0 h-8 w-[2px] bg-gradient-to-b from-theme-primary to-transparent" />
      </div>

      <div className="flex items-stretch gap-3.5 sm:gap-5 p-3.5 sm:p-4">
        {/* Image column with decorative frame */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-theme-soft ring-1 ring-inset ring-white/60">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={nume}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-[1.08] transition-transform duration-[600ms] ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-theme-primary/30 font-primary text-3xl">Z</div>
          )}
          {/* Subtle inner gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/15 via-transparent to-transparent" />
        </div>

        {/* Center text column */}
        <div className="flex-1 min-w-0 flex flex-col justify-center pr-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-theme-soft text-theme-soft">
              <span className="inline-block w-1 h-1 rounded-full bg-theme-primary" />
              <span className="text-[10px] uppercase tracking-[0.14em] font-bold leading-none truncate max-w-[160px]">
                {tTip(produs.tip)}
              </span>
            </span>
          </div>
          <h3 className="text-[17px] sm:text-lg font-primary font-semibold text-ink leading-tight line-clamp-2 group-hover:text-theme-primary transition-colors">
            {nume}
          </h3>
          <p className="text-[13px] text-muted line-clamp-2 mt-1 leading-snug">{descriere}</p>
        </div>

        {/* Price column (right) */}
        <div className="flex flex-col items-end justify-between shrink-0 pl-1">
          <ChevronRight size={18} className="text-muted/30 group-hover:text-theme-primary group-hover:translate-x-1 transition-all duration-300" />
          <div className="flex flex-col items-end relative">
            <span className="font-primary font-bold text-[26px] sm:text-[30px] text-theme-primary leading-none whitespace-nowrap tracking-tight">
              {produs.pret.toFixed(0)}
            </span>
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold text-muted mt-1">lei</span>
          </div>
        </div>
      </div>

      {/* bottom gradient line */}
      <div className="absolute inset-x-3 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-theme-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Link>
  );
}
