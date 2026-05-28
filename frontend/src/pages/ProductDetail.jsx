import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { resolveImage } from "../lib/api";
import { ArrowLeft, Tag, LayoutGrid, Sparkles } from "lucide-react";
import { useI18n, localizedName, localizedDescription } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { tipGroupId } from "./LocationMenu";

export default function ProductDetail() {
  const { t, tTip, lang } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const [produs, setProdus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/produse/${id}`)
      .then((r) => setProdus(r.data))
      .catch((e) => setError(e?.response?.data?.detail || t("product_unavailable")))
      .finally(() => setLoading(false));
  }, [id, t]);

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [id]);

  if (loading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">{t("loading")}</div>;
  }

  if (error || !produs) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 text-center">
        <h1 className="font-primary text-3xl text-ink">{t("product_unavailable")}</h1>
        <p className="text-muted mt-2">{error}</p>
        <button
          onClick={() => navigate(-1)}
          data-testid="back-after-error"
          className="mt-6 px-6 py-3 rounded-full bg-ink text-white font-semibold"
        >
          {t("back")}
        </button>
      </div>
    );
  }

  const themeClass = produs.categorie === "terasa" ? "theme-terasa" : produs.categorie === "restaurant" ? "theme-restaurant" : "theme-discoteca";
  const nume = localizedName(produs, lang);
  const descriere = localizedDescription(produs, lang);
  const imgSrc = resolveImage(produs.imagine);
  const locationLabel = produs.categorie === "terasa" ? "Terasa" : produs.categorie === "restaurant" ? "Restaurant" : "Discoteca";
  // Back-to-category: go to the category page filtered by the product's tip
  const categoryHref = `/${produs.categorie}/${produs.subcategorie}/${encodeURIComponent(produs.tip)}`;

  return (
    <div className={`min-h-screen bg-bg paper-tex ${themeClass}`}>
      {/* Hero image */}
      <div className="relative h-[57vh] sm:h-[70vh] overflow-hidden">
        {imgSrc && (
          <img
            src={imgSrc}
            alt={nume}
            loading="eager"
            decoding="async"
            className="w-full h-[50vh] sm:h-[70vh] object-cover"
          />
        )}
        {/* Top shade for button legibility + bottom shade for smooth transition */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 via-black/15 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

        {/* Back button + themed label group */}
        <button
          onClick={() => navigate(-1)}
          data-testid="product-back-button"
          className="group absolute top-4 left-4 inline-flex items-center gap-2 pl-1.5 pr-4 sm:pr-5 py-1.5 rounded-full bg-white/90 hover:bg-white backdrop-blur-md border border-white/40 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] active:scale-95 transition-all duration-300"
          aria-label={t("back")}
        >
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white flex items-center justify-center group-hover:-translate-x-0.5 transition-transform shadow-[0_6px_14px_-4px_rgba(0,0,0,0.45)]">
            <ArrowLeft size={18} strokeWidth={2.4} />
          </span>
          <span className="flex flex-col leading-tight pr-1">
            <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-muted">
              {t("back_to")}
            </span>
            <span className="font-primary text-base sm:text-lg font-semibold text-theme-primary tracking-tight -mt-0.5">
              {locationLabel}
            </span>
          </span>
        </button>

        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        {/* Floating signature marker */}
        <div className="absolute bottom-6 right-6 hidden sm:flex items-center gap-2 text-white/90">
          <Sparkles size={14} />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold drop-shadow">ZERO Selection</span>
        </div>
      </div>

      {/* Info card */}
      <div className="relative -mt-12 sm:-mt-16 bg-bg rounded-t-[28px] px-5 sm:px-10 pt-8 pb-24 shadow-[0_-20px_40px_-24px_rgba(0,0,0,0.2)]">
        {/* top grabber */}
        <div className="mx-auto w-12 h-1.5 rounded-full bg-ink/10 mb-6" />

        <div className="container max-w-3xl mx-auto">
          {/* Tip pill (no redundant location — already in back button) */}
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] font-bold mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-theme-soft text-theme-soft">
              <Tag size={11} />
              <span data-testid="product-tip">{tTip(produs.tip)}</span>
            </span>
            <span data-testid="product-categorie" className="sr-only">{produs.categorie}</span>
          </div>

          <h1 data-testid="product-title" className="font-primary text-[40px] sm:text-[64px] font-medium text-ink leading-[1.02] tracking-tight">
            {nume}
          </h1>

          {/* Decorative rule */}
          <div className="mt-4 flex items-center gap-2">
            <span className="h-[2px] w-10 bg-theme-primary rounded-full" />
            <span className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
            <span className="h-px w-6 bg-theme-primary/40" />
          </div>

          {/* Price badge with accent */}
          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <span
              data-testid="product-price"
              className="relative inline-flex items-baseline gap-1 px-5 py-2.5 rounded-full bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white font-secondary font-bold shadow-[0_10px_28px_-10px_rgba(0,0,0,0.35)]"
            >
              <span className="text-xl sm:text-2xl tracking-tight">{produs.pret.toFixed(2)}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] opacity-85">lei</span>
            </span>
          </div>

          <p className="mt-7 text-base sm:text-lg text-ink/80 leading-relaxed font-secondary whitespace-pre-line first-letter:font-primary first-letter:text-3xl first-letter:font-semibold first-letter:text-theme-primary first-letter:mr-1 first-letter:float-left first-letter:leading-[0.95]">
            {descriere}
          </p>

          {/* CTA back-to-category */}
          <div className="mt-10">
            <Link
              to={categoryHref}
              data-testid="product-view-category"
              className="sheen-anim relative overflow-hidden inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white border-2 border-theme-primary text-theme-primary font-secondary font-bold text-sm tracking-wide hover:bg-gradient-to-br hover:from-[var(--t-primary)] hover:to-[var(--t-accent)] hover:text-white transition-all duration-400 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.18)] active:scale-95"
            >
              <LayoutGrid size={16} />
              <span>{t("view_category")}</span>
            </Link>
          </div>

          {/* Footer meta */}
          <div className="mt-12 pt-6 border-t border-line">
            <div className="divider-ornament text-muted mb-3">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{t("served_at")}</span>
            </div>
            <p className="text-center text-xs uppercase tracking-[0.22em] text-muted">
              <span className="text-ink font-bold capitalize">{produs.categorie}</span>
              <span className="dot-ornament" />
              {produs.subcategorie === "mancare" ? t("kitchen") : t("bar")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
