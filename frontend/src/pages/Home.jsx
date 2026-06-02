import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { HERO_IMG, TERASA_IMG, RESTAURANT_IMG, DISCOTECA_IMG, resolveImage, getSettings } from "../lib/api";
import TopBar from "../components/TopBar";
import { MapPin, ArrowRight, Sparkles } from "lucide-react";
import { useI18n, localizedName } from "../lib/i18n";

export default function Home() {
  const { t, tTip, lang } = useI18n();
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    getSettings()
      .then((s) => setSettings(s))
      .catch(() => setSettings({ active_locations: ["terasa", "restaurant", "discoteca"], subcategory_order: {} }));
  }, []);

  useEffect(() => {
    api.get("/home")
      .then((r) => {
        const sorted = (r.data.trending || []).sort((a, b) => b.pret - a.pret);
        setTrending(sorted);
      })
      .catch(() => setTrending([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg paper-tex">
      <TopBar />

      {/* Hero */}
      <section className="relative h-[64vh] sm:h-[72vh] overflow-hidden">
        <img src={HERO_IMG} alt="ZERO Menu" className="absolute inset-0 w-full h-full object-cover scale-[1.02]" />
        {/* Layered gradients for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/30 via-transparent to-transparent" />
        {/* Ornamental corner rule */}
        <div className="absolute top-6 left-6 sm:top-10 sm:left-10 flex items-center gap-2 text-white/70">
          <span className="h-px w-6 bg-white/60" />
          <span className="text-[10px] uppercase tracking-[0.35em] font-bold">ZERO · EST.</span>
        </div>

        <div className="relative h-full container max-w-4xl mx-auto px-4 flex flex-col justify-end pb-12 sm:pb-16">
          <h1 className="font-primary text-[70px] leading-[0.92] sm:text-[96px] sm:leading-[0.92] font-medium text-white tracking-tight animate-fade-up">
            {t("hero_title_l1")}<br/>{t("hero_title_l2")}<br/>
            <span className="italic font-light">{t("hero_title_l3")}</span>
          </h1>
          {/* Ornament underline */}
          <div className="mt-6 flex items-center gap-2 animate-fade-up" style={{animationDelay:'0.2s'}}>
            <span className="h-px w-16 bg-white/60" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            <span className="h-px w-6 bg-white/40" />
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="container max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <div className="flex items-end justify-between mb-6 sm:mb-8">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted">{t("spaces")}</span>
            <h2 className="font-primary text-4xl sm:text-5xl font-medium text-ink mt-1 tracking-tight">
              {t("choose_location")}
            </h2>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="h-px w-16 bg-ink/20" />
            <span className="h-px w-10 bg-ink/10" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
          {settings && settings.active_locations.includes("terasa") && (
            <LocationCard to="/terasa" name="Terasa" tagline={t("terasa_tagline")} img={TERASA_IMG} tint="from-cyan-900/60" accent="bg-cyan-400" testid="terasa-location-card" index={1} />
          )}
          {settings && settings.active_locations.includes("restaurant") && (
            <LocationCard to="/restaurant" name="Restaurant" tagline={t("restaurant_tagline")} img={RESTAURANT_IMG} tint="from-amber-900/60" accent="bg-amber-300" testid="restaurant-location-card" index={2} />
          )}
          {settings && settings.active_locations.includes("discoteca") && (
            <LocationCard to="/discoteca" name="Zero Club" tagline={t("discoteca_tagline")} img={DISCOTECA_IMG} tint="from-purple-900/60" accent="bg-purple-400" testid="discoteca-location-card" index={3} />
          )}
        </div>
      </section>

      {/* Trending */}
      <section className="container max-w-4xl mx-auto px-4 py-10 sm:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] font-bold text-muted">
              <Sparkles size={11} /> {t("top_views")}
            </span>
            <h2 className="font-primary text-4xl sm:text-5xl font-medium text-ink mt-1 tracking-tight">
              {t("trending")}
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted">{t("loading")}</div>
        ) : trending.length === 0 ? (
          <div className="py-10 text-center text-muted">{t("empty_hint")}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {trending.map((p, i) => {
              const nume = localizedName(p, lang);
              return (
              <Link
                key={p.id}
                to={`/produs/${p.id}`}
                data-testid={`trending-${p.id}`}
                className="group relative"
              >
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#EFEBE9] shadow-[0_1px_3px_rgba(0,0,0,0.06)] group-hover:shadow-[0_20px_44px_-18px_rgba(0,0,0,0.25)] transition-shadow duration-400">
                  {p.imagine && (
                    <img src={resolveImage(p.imagine)} alt={nume} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-[600ms]" />
                  )}
                  {/* rank ribbon */}
                  <span className="absolute top-2 left-2 bg-white/95 backdrop-blur rounded-full px-2 py-0.5 text-[10px] font-bold text-ink tracking-wide shadow-sm">
                    #{i + 1}
                  </span>
                  {/* Gradient hover overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="mt-2.5 flex items-baseline justify-between gap-2">
                  <h3 className="font-primary font-semibold text-base text-ink truncate group-hover:text-ink">{nume}</h3>
                  <span className="text-sm font-secondary font-bold text-ink shrink-0">{p.pret.toFixed(0)} <span className="text-muted font-medium">lei</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted mt-0.5">
                  <MapPin size={10} /> <span className="capitalize">{p.categorie}</span>
                  <span className="dot-ornament" />
                  <span className="truncate">{tTip(p.tip)}</span>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="relative mt-10 pt-10 pb-8">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="divider-ornament text-ink/40 mb-5">
            <span className="text-[11px] uppercase tracking-[0.35em] font-bold">ZERO</span>
          </div>
          <p className="text-center text-[11px] text-muted uppercase tracking-[0.22em]">{t("footer")}</p>
        </div>
      </footer>
    </div>
  );
}

function LocationCard({ to, name, tagline, img, tint, accent, testid, index }) {
  return (
    <Link
      to={to}
      data-testid={testid}
      className="relative block h-56 sm:h-72 rounded-[22px] overflow-hidden shadow-[0_10px_40px_-18px_rgba(0,0,0,0.35)] group active:scale-[0.99] transition-all duration-400"
    >
      <img
        src={img}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-[800ms] ease-out"
      />
      <div className={`absolute inset-0 bg-gradient-to-t ${tint} via-black/25 to-black/75`} />
      {/* Decorative corner marks */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 text-white/90">
        <span className={`w-1.5 h-1.5 rounded-full ${accent}`} />
        <span className="text-[9px] uppercase tracking-[0.3em] font-bold">{String(index).padStart(2, "0")}</span>
      </div>
      <div className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/10 backdrop-blur border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-300">
        <ArrowRight size={14} className="text-white" />
      </div>

      <div className="absolute bottom-0 left-0 p-5 sm:p-6 w-full">
        <span className="text-[10px] uppercase tracking-[0.22em] text-white/75 font-bold">{tagline}</span>
        <h3 className="font-primary text-[40px] sm:text-5xl text-white tracking-tight drop-shadow-lg mt-1 leading-none">
          {name}
        </h3>
        <div className="mt-2.5 flex items-center gap-2">
          <span className={`h-[2px] w-10 ${accent} rounded-full`} />
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-bold">Explore</span>
        </div>
      </div>
    </Link>
  );
}
