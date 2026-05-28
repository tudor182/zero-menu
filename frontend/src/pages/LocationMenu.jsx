import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import api, { getSettings } from "../lib/api";
import TopBar from "../components/TopBar";
import FilterStrip from "../components/FilterStrip";
import ProductRow from "../components/ProductRow";
import { UtensilsCrossed, Wine } from "lucide-react";
import { useI18n } from "../lib/i18n";

const VALID_CATEGORII = ["terasa", "restaurant", "discoteca"];
const VALID_SUBCAT = ["mancare", "bauturi"];

// Build a stable DOM id for a tip group section
function tipGroupId(tipKey) {
  return `group-${encodeURIComponent(tipKey).replace(/%/g, "-")}`;
}

export default function LocationMenu() {
  const { t, tTip } = useI18n();
  const { categorie, subcategorie: rawSubcat, tip: rawTip } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!VALID_CATEGORII.includes(categorie)) {
      navigate("/", { replace: true });
    }
  }, [categorie, navigate]);

  const subcategorie = VALID_SUBCAT.includes(rawSubcat) ? rawSubcat : "mancare";
  const activeTip = rawTip ? decodeURIComponent(rawTip) : null;

  useEffect(() => {
    if (!VALID_SUBCAT.includes(rawSubcat)) {
      navigate(`/${categorie}/mancare`, { replace: true });
    }
  }, [rawSubcat, categorie, navigate]);

  const [data, setData] = useState({ items: [], tipuri: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // Fetch settings to get subcategory order for this location
  useEffect(() => {
    getSettings()
      .then((s) => setSettings(s))
      .catch(() => setSettings({ active_locations: ["terasa", "restaurant", "discoteca"], subcategory_order: {} }));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query = { categorie, subcategorie, limit: 200 };
    if (activeTip) query.tip = activeTip;
    api.get("/produse", { params: query })
      .then((r) => {
        const sorted = {
          ...r.data,
          items: (r.data.items || []).sort((a, b) => b.pret - a.pret)
        };
        setData(sorted);
      })
      .catch(() => setData({ items: [], tipuri: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [categorie, subcategorie, activeTip]);

  const [allTipuri, setAllTipuri] = useState([]);
  useEffect(() => {
    api.get("/tipuri", { params: { subcategorie, categorie } })
      .then((r) => setAllTipuri(r.data.tipuri || []))
      .catch(() => setAllTipuri([]));
  }, [subcategorie, categorie]);

  const tipuri = useMemo(() => {
    return (data.tipuri && data.tipuri.length > 0) ? data.tipuri : allTipuri;
  }, [data.tipuri, allTipuri]);

  // Sort subcategories based on settings for this location
  const sortedSubcategories = useMemo(() => {
    const order = settings?.subcategory_order?.[categorie] || { mancare: 1, bauturi: 2 };
    return [...VALID_SUBCAT].sort((a, b) => (order[a] || 1) - (order[b] || 2));
  }, [settings, categorie]);

  // Group products by `tip` — preserve tip order from settings, then canonical tipuri list.
  const groupedItems = useMemo(() => {
    if (!data.items.length) return [];
    
    // Get the custom order from settings if available
    const customOrder = settings?.tipuri_order?.[categorie]?.[subcategorie] || [];
    // Fall back to canonical order
    const order = (tipuri && tipuri.length) ? tipuri : Array.from(new Set(data.items.map((p) => p.tip)));
    
    // Merge: custom order first, then any remaining tipuri not in custom order
    const finalOrder = [...customOrder];
    for (const tip of order) {
      if (!finalOrder.includes(tip)) {
        finalOrder.push(tip);
      }
    }
    
    const map = new Map();
    for (const tip of finalOrder) map.set(tip, []);
    for (const p of data.items) {
      if (!map.has(p.tip)) map.set(p.tip, []);
      map.get(p.tip).push(p);
    }
    return Array.from(map.entries()).filter(([, arr]) => arr.length > 0);
  }, [data.items, tipuri, settings, categorie, subcategorie]);

  const onSelectTip = (tip) => {
    if (tip) {
      navigate(`/${categorie}/${subcategorie}/${encodeURIComponent(tip)}`);
    } else {
      navigate(`/${categorie}/${subcategorie}`);
    }
  };

  // ---------- Scroll restoration ----------
  const scrollKey = `zero:scroll:${categorie}:${subcategorie}:${activeTip || "_"}`;
  const lastProductKey = `zero:lastProduct:${categorie}:${subcategorie}`;
  const restoredRef = useRef(false);

  // Save scroll position when leaving (or before clicking a product)
  useEffect(() => {
    const onBeforeUnload = () => {
      try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch {}
    };
    window.addEventListener("pagehide", onBeforeUnload);
    return () => {
      // Save on unmount/route change
      try { sessionStorage.setItem(scrollKey, String(window.scrollY)); } catch {}
      window.removeEventListener("pagehide", onBeforeUnload);
    };
  }, [scrollKey]);

  // Restore scroll once data loaded — priority: hash > last-clicked product > saved scrollY
  useEffect(() => {
    if (loading || restoredRef.current) return;
    if (!data.items.length && !location.hash) return;
    restoredRef.current = true;
    requestAnimationFrame(() => {
      const hash = location.hash ? location.hash.slice(1) : "";
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      // 2) Try to find last-clicked product card and scroll directly to it
      try {
        const lastId = sessionStorage.getItem(lastProductKey);
        if (lastId) {
          const card = document.querySelector(`[data-product-id="${lastId}"]`);
          if (card) {
            card.scrollIntoView({ behavior: "auto", block: "center" });
            // Brief highlight pulse so user sees where they came from
            card.classList.add("return-highlight");
            setTimeout(() => card.classList.remove("return-highlight"), 1700);
            // Clear so reopening doesn't re-trigger
            sessionStorage.removeItem(lastProductKey);
            return;
          }
        }
      } catch {}
      // 3) Fallback: saved scrollY
      try {
        const saved = sessionStorage.getItem(scrollKey);
        if (saved && window.scrollY < 50) {
          window.scrollTo({ top: parseInt(saved, 10) || 0, behavior: "auto" });
        }
      } catch {}
    });
  }, [loading, data.items.length, location.hash, scrollKey, lastProductKey]);

  // Reset restoredRef when key changes
  useEffect(() => { restoredRef.current = false; }, [scrollKey]);

  const themeClass = categorie === "terasa" ? "theme-terasa" : categorie === "restaurant" ? "theme-restaurant" : "theme-discoteca";
  const title = categorie === "terasa" ? "Terasa" : categorie === "restaurant" ? "Restaurant" : "Discoteca";

  // When clicking a product, persist scrollY + the product ID for precise restore
  const handleProductNav = (produsId) => {
    try {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
      if (produsId) sessionStorage.setItem(lastProductKey, produsId);
    } catch {}
  };

  return (
    <div className={`min-h-screen bg-bg ${themeClass}`}>
      <TopBar title={title} backTo="/" />

      {/* Big, centered, stylized subcategory tabs — NO heading above */}
      <div className="relative bg-theme-tint theme-pattern border-b border-line/60 overflow-hidden">
        {/* Ornamental blur glows */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-60 h-60 rounded-full bg-theme-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-72 h-72 rounded-full bg-theme-primary/10 blur-3xl" />

        <div className="relative container max-w-4xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex justify-center">
            <div
              role="tablist"
              className="relative inline-flex items-center gap-1.5 p-2 rounded-full border border-line bg-white/80 backdrop-blur shadow-[0_14px_40px_-12px_rgba(0,0,0,0.22),_0_2px_4px_rgba(0,0,0,0.04)]"
            >
              {sortedSubcategories.map((sub) => {
                const iconMap = { mancare: UtensilsCrossed, bauturi: Wine };
                const Icon = iconMap[sub] || UtensilsCrossed;
                return (
                  <SubcatTab
                    key={sub}
                    active={subcategorie === sub}
                    to={`/${categorie}/${sub}`}
                    label={t(sub)}
                    Icon={Icon}
                    testid={`subcat-${sub}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div id="menu" />
      <FilterStrip tipuri={tipuri} activeTip={activeTip} onSelect={onSelectTip} />

      <main className="container max-w-4xl mx-auto px-4 pt-5 pb-16">
        {loading ? (
          <div className="py-16 text-center text-muted">{t("loading")}</div>
        ) : data.items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-primary text-2xl text-ink">{t("empty_title")}</p>
            <p className="text-sm text-muted mt-2">{t("empty_hint")}</p>
          </div>
        ) : (
          <div data-testid="product-list" className="animate-fade-up">
            {activeTip ? (
              /* Filtered: no group headers, just list */
              data.items.map((p) => (
                <div key={p.id} onClick={() => handleProductNav(p.id)}>
                  <ProductRow produs={p} to={`/produs/${p.id}`} />
                </div>
              ))
            ) : (
              /* Unfiltered: grouped by tip, header before each group */
              groupedItems.map(([tipKey, arr]) => (
                <section
                  key={tipKey}
                  id={tipGroupId(tipKey)}
                  className="mb-6 scroll-mt-24"
                  data-testid={`group-${tipKey}`}
                >
                  <CategoryHeader label={tTip(tipKey)} />
                  {arr.map((p) => (
                    <div key={p.id} onClick={() => handleProductNav(p.id)}>
                      <ProductRow produs={p} to={`/produs/${p.id}`} />
                    </div>
                  ))}
                </section>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export { tipGroupId };

function SubcatTab({ active, to, label, Icon, testid }) {
  return (
    <Link
      to={to}
      data-testid={testid}
      role="tab"
      aria-selected={active}
      className={`relative overflow-hidden inline-flex items-center gap-3 px-8 sm:px-12 py-4 sm:py-5 rounded-full text-lg sm:text-xl font-primary font-semibold tracking-tight transition-all duration-300 ${
        active
          ? "bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,0.45)] scale-[1.02]"
          : "text-muted hover:text-ink hover:bg-bg"
      }`}
    >
      {active && (
        <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/25" />
      )}
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={active ? "drop-shadow-sm" : ""} />
      <span>{label}</span>
    </Link>
  );
}

function CategoryHeader({ label }) {
  return (
    <div className="flex items-center gap-3 mt-7 mb-4 px-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-theme-primary/40 to-theme-primary/60" />
      <div className="flex items-center gap-2.5 px-3">
        <span className="w-1.5 h-1.5 rounded-full bg-theme-primary/60" />
        <h2
          data-testid={`category-header-${label}`}
          className="font-primary text-2xl sm:text-3xl font-medium text-theme-primary tracking-tight whitespace-nowrap"
        >
          {label}
        </h2>
        <span className="w-1.5 h-1.5 rounded-full bg-theme-primary/60" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-theme-primary/40 to-theme-primary/60" />
    </div>
  );
}
