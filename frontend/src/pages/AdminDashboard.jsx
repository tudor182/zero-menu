import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { resolveImage, getSettings, updateSettings } from "../lib/api";
import { Plus, Edit3, Trash2, LogOut, BarChart3, X, Eye, TrendingUp, Upload, ImageIcon, Loader2, Tags, Sparkles, AlertTriangle } from "lucide-react";
import { useI18n, localizedName, localizedDescription } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function AdminDashboard() {
  const { t, tTip, lang } = useI18n();
  const nav = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("produse");
  const [produse, setProduse] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filter, setFilter] = useState({ categorie: "", subcategorie: "", search: "" });
  const [editProd, setEditProd] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(() => {
    api.get("/auth/me")
      .then((r) => { setUser(r.data); setAuthChecked(true); })
      .catch(() => nav("/admin/login", { replace: true }));
  }, [nav]);

  const loadProduse = () => {
    const params = {};
    if (filter.categorie) params.categorie = filter.categorie;
    if (filter.subcategorie) params.subcategorie = filter.subcategorie;
    api.get("/admin/produse", { params }).then((r) => {
      const sorted = (r.data.items || []).sort((a, b) => b.pret - a.pret);
      setProduse(sorted);
    });
  };
  const loadAnalytics = () => {
    api.get("/admin/analytics").then((r) => setAnalytics(r.data));
  };

  const loadSettings = () => {
    getSettings()
      .then((s) => setSettings(s))
      .catch(() => setSettings({ active_locations: ["terasa", "restaurant", "discoteca"], category_order: {} }));
  };

  useEffect(() => {
    if (authChecked) {
      loadProduse();
      loadAnalytics();
      loadSettings();
    }
    // eslint-disable-next-line
  }, [authChecked, filter]);

  const logout = () => {
    localStorage.removeItem("zero_token");
    localStorage.removeItem("zero_user");
    nav("/admin/login", { replace: true });
  };

  const onDelete = async (p) => {
    const nameForConfirm = localizedName(p, lang);
    if (!window.confirm(`${t("confirm_delete")} "${nameForConfirm}"?`)) return;
    await api.delete(`/admin/produse/${p.id}`);
    loadProduse();
    loadAnalytics();
  };

  if (!authChecked) return <div className="min-h-screen flex items-center justify-center text-muted">{t("loading")}</div>;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-white sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/admin" className="font-primary text-2xl font-semibold text-ink">
            ZERO <span className="text-muted text-base">{t("admin_suffix")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="hidden sm:inline text-sm text-muted">{user?.email}</span>
            <button data-testid="admin-logout-btn" onClick={logout} className="w-10 h-10 rounded-full bg-bg border border-line flex items-center justify-center active:scale-95">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="container max-w-6xl mx-auto px-4 flex gap-2 pb-3">
          <TabBtn active={tab==="produse"} onClick={() => setTab("produse")} testid="tab-produse">{t("tab_produse")}</TabBtn>
          <TabBtn active={tab==="tipuri"} onClick={() => setTab("tipuri")} testid="tab-tipuri">
            <Tags size={14} className="inline mr-1" /> {t("tab_tipuri")}
          </TabBtn>
          <TabBtn active={tab==="analytics"} onClick={() => setTab("analytics")} testid="tab-analytics">
            <BarChart3 size={14} className="inline mr-1" /> {t("tab_analytics")}
          </TabBtn>
          <TabBtn active={tab==="settings"} onClick={() => setTab("settings")} testid="tab-settings">
            <Sparkles size={14} className="inline mr-1" /> Settings
          </TabBtn>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {tab === "produse" && (
          <>
            <div className="flex flex-col gap-4 mb-5">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <select
                    data-testid="filter-categorie"
                    value={filter.categorie}
                    onChange={(e) => setFilter((f) => ({ ...f, categorie: e.target.value }))}
                    className="px-4 py-2 rounded-full border border-line bg-white text-sm"
                  >
                    <option value="">{t("all_locations")}</option>
                    <option value="terasa">Terasa</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="discoteca">Zero Club</option>
                  </select>
                  <select
                    data-testid="filter-subcategorie"
                    value={filter.subcategorie}
                    onChange={(e) => setFilter((f) => ({ ...f, subcategorie: e.target.value }))}
                    className="px-4 py-2 rounded-full border border-line bg-white text-sm"
                  >
                    <option value="">{t("mancare_bauturi")}</option>
                    <option value="mancare">{t("mancare")}</option>
                    <option value="bauturi">{t("bauturi")}</option>
                  </select>
                </div>
                <button
                  data-testid="admin-create-btn"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ink text-white text-sm font-semibold active:scale-95"
                >
                  <Plus size={16} /> {t("new_product")}
                </button>
              </div>
              <input
                type="text"
                placeholder="Search products..."
                value={filter.search}
                onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                className="px-4 py-2 rounded-full border border-line bg-white text-sm w-full sm:w-64"
              />
            </div>

            <div className="bg-white rounded-2xl border border-line overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-bg text-muted uppercase text-xs tracking-wider">
                  <tr>
                    <th className="py-3 px-4">{t("product_col")}</th>
                    <th className="py-3 px-4 hidden sm:table-cell">{t("location_tip")}</th>
                    <th className="py-3 px-4">{t("price_col")}</th>
                    <th className="py-3 px-4 hidden md:table-cell">{t("views_col")}</th>
                    <th className="py-3 px-4 text-right">{t("actions_col")}</th>
                  </tr>
                </thead>
                <tbody data-testid="admin-product-table">
                  {produse.length === 0 ? (
                    <tr><td colSpan={5} className="py-10 text-center text-muted">{t("no_products")}</td></tr>
                  ) : produse.filter((p) => {
                    const searchText = filter.search.toLowerCase();
                    if (!searchText) return true;
                    const name = (localizedName(p, lang) || "").toLowerCase();
                    const desc = (localizedDescription(p, lang) || "").toLowerCase();
                    const tip = (tTip(p.tip) || "").toLowerCase();
                    return name.includes(searchText) || desc.includes(searchText) || tip.includes(searchText);
                  }).map((p) => (
                    <tr key={p.id} className="border-t border-line" data-testid={`admin-row-${p.id}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.imagine ? <img src={resolveImage(p.imagine)} alt="" loading="lazy" decoding="async" className="w-10 h-10 rounded-lg object-cover" /> : <div className="w-10 h-10 rounded-lg bg-bg" />}
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate max-w-[180px] sm:max-w-none">{localizedName(p, lang)}</p>
                            <p className="text-xs text-muted truncate max-w-[180px] sm:max-w-md">{localizedDescription(p, lang)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-xs uppercase tracking-wide text-muted">{p.categorie} · {p.subcategorie}</span>
                        <p className="text-sm text-ink">{tTip(p.tip)}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold">{p.pret.toFixed(2)}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted"><Eye size={12} className="inline mr-1" />{p.vizualizari ?? 0}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button data-testid={`edit-${p.id}`} onClick={() => setEditProd(p)} className="w-9 h-9 rounded-full bg-bg border border-line inline-flex items-center justify-center active:scale-95 mr-2"><Edit3 size={14} /></button>
                        <button data-testid={`delete-${p.id}`} onClick={() => onDelete(p)} className="w-9 h-9 rounded-full bg-red-50 border border-red-100 text-red-600 inline-flex items-center justify-center active:scale-95"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "tipuri" && <TipuriManager />}

        {tab === "analytics" && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label={t("total_produse")} value={analytics.total_produse} testid="stat-total-produse" />
              <StatCard label={t("total_vizite")} value={analytics.total_vizite} testid="stat-total-vizite" />
              <StatCard label={t("unique_ips_24h")} value={analytics.unique_ips_24h} testid="stat-unique-ips" />
              <StatCard label={t("locations_stat")} value={analytics.per_locatie.length} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-line p-5 shadow-sm">
                <h3 className="font-primary text-2xl mb-4 flex items-center gap-2"><TrendingUp size={18} /> {t("top_products")}</h3>
                <div className="space-y-2" data-testid="top-produse-list">
                  {analytics.top_produse.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-line last:border-0">
                      <span className="w-6 text-muted font-bold text-xs">{i+1}</span>
                      {p.imagine && <img src={resolveImage(p.imagine)} alt="" loading="lazy" decoding="async" className="w-9 h-9 rounded-lg object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{localizedName(p, lang)}</p>
                        <p className="text-xs text-muted capitalize">{p.categorie}</p>
                      </div>
                      <span className="text-sm font-bold">{p.vizualizari}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-line p-5 shadow-sm">
                <h3 className="font-primary text-2xl mb-4">{t("per_location")}</h3>
                <div className="space-y-3" data-testid="per-locatie-list">
                  {analytics.per_locatie.map((l) => (
                    <div key={l.categorie} className="flex items-center justify-between py-2 border-b border-line last:border-0">
                      <span className="capitalize font-semibold">{l.categorie}</span>
                      <div className="text-right">
                        <p className="font-bold text-lg">{l.views} <span className="text-xs text-muted font-normal">{t("views_short")}</span></p>
                        <p className="text-xs text-muted">{l.count} {t("products")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <SettingsManager settings={settings} setSettings={setSettings} loadingSettings={loadingSettings} setLoadingSettings={setLoadingSettings} />
        )}
      </main>

      {(showCreate || editProd) && (
        <ProductModal
          initial={editProd}
          onClose={() => { setEditProd(null); setShowCreate(false); }}
          onSaved={() => { setEditProd(null); setShowCreate(false); loadProduse(); loadAnalytics(); }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${active ? "bg-ink text-white" : "bg-bg border border-line text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, testid }) {
  return (
    <div className="bg-white rounded-2xl border border-line p-5 shadow-sm" data-testid={testid}>
      <p className="text-xs uppercase tracking-[0.15em] text-muted font-bold">{label}</p>
      <p className="font-primary text-4xl font-medium text-ink mt-2">{value}</p>
    </div>
  );
}

function ProductModal({ initial, onClose, onSaved }) {
  const { t } = useI18n();
  const empty = {
    nume_ro: "", descriere_ro: "",
    nume_en: "", descriere_en: "",
    nume_ru: "", descriere_ru: "",
    pret: 0, imagine: "",
    categorie: "terasa", subcategorie: "mancare", tip: "",
  };
  const [form, setForm] = useState(initial ? { ...empty, ...initial } : empty);
  const [activeLang, setActiveLang] = useState("ro");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translateMsg, setTranslateMsg] = useState("");

  // Tipuri loaded dynamically from API per (categorie, subcategorie)
  const [tipuriMap, setTipuriMap] = useState({}); // key: `${cat}:${sub}` -> string[]
  const tipKey = `${form.categorie}:${form.subcategorie}`;
  useEffect(() => {
    if (tipuriMap[tipKey]) return;
    api.get("/tipuri", { params: { categorie: form.categorie, subcategorie: form.subcategorie } })
      .then((r) => setTipuriMap((prev) => ({ ...prev, [tipKey]: r.data.tipuri || [] })))
      .catch(() => {});
  }, [tipKey, form.categorie, form.subcategorie, tipuriMap]);

  const tipOptions = useMemo(() => tipuriMap[tipKey] || [], [tipuriMap, tipKey]);

  useEffect(() => {
    if (!tipOptions.length) return;
    if (form.tip && !tipOptions.includes(form.tip)) {
      setForm((f) => ({ ...f, tip: tipOptions[0] || "" }));
    } else if (!form.tip) {
      setForm((f) => ({ ...f, tip: tipOptions[0] }));
    }
    // eslint-disable-next-line
  }, [tipKey, tipOptions.length]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setSaving(true);
    try {
      const payload = {
        nume_ro: form.nume_ro, descriere_ro: form.descriere_ro,
        nume_en: form.nume_en || null, descriere_en: form.descriere_en || null,
        nume_ru: form.nume_ru || null, descriere_ru: form.descriere_ru || null,
        pret: parseFloat(form.pret),
        imagine: form.imagine || null,
        categorie: form.categorie, subcategorie: form.subcategorie, tip: form.tip,
      };
      if (initial) {
        await api.put(`/admin/produse/${initial.id}`, payload);
      } else {
        await api.post(`/admin/produse`, payload);
      }
      onSaved();
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : t("save_error"));
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!form.nume_ro?.trim()) {
      setTranslateMsg(t("translate_failed") + ": RO empty");
      return;
    }
    setTranslating(true);
    setTranslateMsg("");
    try {
      const res = await api.post("/admin/translate", {
        nume_ro: form.nume_ro,
        descriere_ro: form.descriere_ro || "",
        targets: ["en", "ru"],
      });
      setForm((f) => ({
        ...f,
        nume_en: res.data.nume_en || f.nume_en,
        descriere_en: res.data.descriere_en || f.descriere_en,
        nume_ru: res.data.nume_ru || f.nume_ru,
        descriere_ru: res.data.descriere_ru || f.descriere_ru,
      }));
      setTranslateMsg(t("translate_filled"));
      setTimeout(() => setTranslateMsg(""), 3000);
    } catch (e) {
      const d = e?.response?.data?.detail;
      setTranslateMsg(typeof d === "string" ? d : t("translate_failed"));
    } finally {
      setTranslating(false);
    }
  };

  const langTabs = [
    { code: "ro", label: "RO", required: true },
    { code: "en", label: "EN", required: false },
    { code: "ru", label: "RU", required: false },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto animate-fade-up"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="font-primary text-2xl">{initial ? t("edit") : t("new_product")}</h2>
          <button onClick={onClose} data-testid="modal-close" className="w-9 h-9 rounded-full bg-bg flex items-center justify-center"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {/* Language tabs + Auto-translate */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-1 bg-bg rounded-full w-fit">
              {langTabs.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  data-testid={`modal-lang-tab-${l.code}`}
                  onClick={() => setActiveLang(l.code)}
                  className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider transition ${
                    activeLang === l.code ? "bg-ink text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {l.label}{l.required ? " *" : ""}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={translating || !form.nume_ro?.trim()}
              data-testid="modal-auto-translate"
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-xs font-bold tracking-wide shadow-[0_6px_18px_-6px_rgba(168,85,247,0.55)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title={t("auto_translate")}
            >
              {translating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>{translating ? t("translating") : "AI"}</span>
            </button>
          </div>
          {translateMsg && (
            <p data-testid="modal-translate-msg" className={`text-xs font-semibold ${translateMsg === t("translate_filled") ? "text-emerald-600" : "text-red-600"}`}>
              {translateMsg}
            </p>
          )}
          <Input
            label={`${t("name")} · ${activeLang.toUpperCase()}`}
            value={form[`nume_${activeLang}`]}
            onChange={(v) => setForm({ ...form, [`nume_${activeLang}`]: v })}
            testid={`modal-nume-${activeLang}`}
            required={activeLang === "ro"}
          />
          <div>
            <label className="text-xs uppercase tracking-[0.1em] font-bold text-muted">
              {t("description")} · {activeLang.toUpperCase()}
            </label>
            <textarea
              value={form[`descriere_${activeLang}`] || ""}
              onChange={(e) => setForm({ ...form, [`descriere_${activeLang}`]: e.target.value })}
              data-testid={`modal-descriere-${activeLang}`}
              rows={3}
              required={activeLang === "ro"}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:outline-none focus:ring-2 focus:ring-ink"
            />
          </div>
          <div>
            <ImageUploader
              value={form.imagine}
              onChange={(url) => setForm({ ...form, imagine: url })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("price_lei")} type="number" step="0.01" value={form.pret} onChange={(v) => setForm({ ...form, pret: v })} testid="modal-pret" required />
            <Select label={t("location")} value={form.categorie} onChange={(v) => setForm({ ...form, categorie: v })} testid="modal-categorie"
              options={[{v:"terasa",l:"Terasa"},{v:"restaurant",l:"Restaurant"},{v:"discoteca",l:"Zero Club"}]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label={t("subcategory")} value={form.subcategorie} onChange={(v) => setForm({ ...form, subcategorie: v })} testid="modal-subcategorie"
              options={[{v:"mancare",l:t("mancare")},{v:"bauturi",l:t("bauturi")}]} />
            <Select label={t("type")} value={form.tip} onChange={(v) => setForm({ ...form, tip: v })} testid="modal-tip"
              options={tipOptions.map((tip) => ({ v: tip, l: tip }))} />
          </div>
          {err && <p className="text-sm text-red-600" data-testid="modal-error">{err}</p>}
          <button
            type="submit" disabled={saving}
            data-testid="modal-submit"
            className="w-full py-3 rounded-xl bg-ink text-white font-semibold active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? t("saving") : initial ? t("save_changes") : t("create_product")}
          </button>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, testid, type = "text", required, step }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.1em] font-bold text-muted">{label}</label>
      <input
        type={type} value={value ?? ""} step={step}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        required={required}
        className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:outline-none focus:ring-2 focus:ring-ink"
      />
    </div>
  );
}
function Select({ label, value, onChange, options, testid }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.1em] font-bold text-muted">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:outline-none focus:ring-2 focus:ring-ink"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function ImageUploader({ value, onChange }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr(t("upload_failed"));
      return;
    }
    setErr("");
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      onChange(res.data.url);
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : t("upload_failed"));
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const onFileInput = (e) => {
    const f = e.target.files?.[0];
    handleFile(f);
    // reset input so same file can be re-selected
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  };

  const preview = value ? resolveImage(value) : "";

  return (
    <div>
      <label className="text-xs uppercase tracking-[0.1em] font-bold text-muted">{t("upload_image")}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFileInput}
        data-testid="modal-image-file"
        className="hidden"
      />
      {preview ? (
        <div
          className="mt-2 relative rounded-xl overflow-hidden border border-line bg-bg"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <img src={preview} alt="preview" className="w-full h-44 object-cover" />
          <div className="absolute inset-x-0 bottom-0 p-2 flex gap-2 bg-gradient-to-t from-black/60 to-transparent">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              data-testid="modal-image-change"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-full bg-white/95 text-ink text-xs font-bold active:scale-95 disabled:opacity-60"
            >
              <Upload size={13} /> {t("change_image")}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              data-testid="modal-image-remove"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/95 text-white text-xs font-bold active:scale-95 disabled:opacity-60"
            >
              <X size={13} />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-xs mt-2">{t("uploading")} {progress}%</span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          disabled={uploading}
          data-testid="modal-image-drop"
          className="mt-2 w-full h-44 rounded-xl border-2 border-dashed border-line hover:border-ink hover:bg-bg/60 flex flex-col items-center justify-center gap-2 text-muted transition disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span className="text-sm font-semibold">{t("uploading")} {progress}%</span>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full bg-bg flex items-center justify-center">
                <ImageIcon size={20} />
              </div>
              <span className="text-sm font-semibold text-ink">{t("upload_image")}</span>
              <span className="text-[11px] text-muted">{t("image_hint")}</span>
            </>
          )}
        </button>
      )}
      {err && <p className="text-sm text-red-600 mt-1" data-testid="modal-image-error">{err}</p>}
    </div>
  );
}


function TipuriManager() {
  const { t } = useI18n();
  const [activeCat, setActiveCat] = useState("terasa");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSub, setNewSub] = useState("mancare");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const [confirmTip, setConfirmTip] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/tipuri", { params: { categorie: activeCat } });
      setItems(r.data.items || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [activeCat]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setErr("");
    try {
      await api.post("/admin/tipuri", {
        nume: newName.trim(),
        categorie: activeCat,
        subcategorie: newSub,
      });
      setNewName("");
      setShowAdd(false);
      await load();
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : t("save_error"));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (force) => {
    if (!confirmTip) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/tipuri/${confirmTip.id}`, { params: { force } });
      setConfirmTip(null);
      await load();
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : t("save_error"));
    } finally {
      setDeleting(false);
    }
  };

  const grouped = useMemo(() => {
    const m = { mancare: [], bauturi: [] };
    for (const it of items) {
      if (m[it.subcategorie]) m[it.subcategorie].push(it);
    }
    return m;
  }, [items]);

  const themeClass = activeCat === "terasa" ? "theme-terasa" : activeCat === "restaurant" ? "theme-restaurant" : "theme-discoteca";

  return (
    <div data-testid="tipuri-manager" className={`space-y-6 ${themeClass}`}>
      {/* Location switcher + buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-line shadow-sm">
            <CatPill active={activeCat === "terasa"} onClick={() => setActiveCat("terasa")} testid="tipuri-cat-terasa">
              Terasa
            </CatPill>
            <CatPill active={activeCat === "restaurant"} onClick={() => setActiveCat("restaurant")} testid="tipuri-cat-restaurant">
              Restaurant
            </CatPill>
            <CatPill active={activeCat === "discoteca"} onClick={() => setActiveCat("discoteca")} testid="tipuri-cat-discoteca">
              Zero Club
            </CatPill>
          </div>
          <span className="text-sm text-muted">{items.length} {t("tab_tipuri").toLowerCase()}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            data-testid="tipuri-add-btn"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white font-secondary font-bold text-sm shadow-[0_8px_22px_-8px_rgba(0,0,0,0.4)] active:scale-95 transition"
          >
            <Plus size={16} /> {t("new_tip")}
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600" data-testid="tipuri-error">{err}</p>}

      {loading ? (
        <div className="py-10 text-center text-muted">{t("loading")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(["mancare", "bauturi"]).map((sub) => (
            <div key={sub} className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-theme">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-line">
                <h3 className="font-primary text-lg font-semibold text-theme-primary tracking-tight">
                  {t(sub)}
                </h3>
                <span className="text-xs font-bold text-muted px-2 py-0.5 rounded-full bg-bg">
                  {grouped[sub].length}
                </span>
              </div>
              {grouped[sub].length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">{t("no_products")}</p>
              ) : (
                <ul className="space-y-2" data-testid={`tipuri-list-${activeCat}-${sub}`}>
                  {grouped[sub].map((tip) => (
                    <li
                      key={tip.id}
                      data-testid={`tip-row-${tip.id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-bg hover:bg-line/30 transition group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">{tip.nume}</p>
                        {tip.produse_count > 0 && (
                          <p className="text-[11px] text-muted">{tip.produse_count} {t("products")} · {t("tip_in_use")}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setConfirmTip(tip)}
                        data-testid={`tip-delete-${tip.id}`}
                        className="w-8 h-8 rounded-full bg-white border border-line text-red-600 flex items-center justify-center hover:bg-red-50 transition"
                        aria-label="delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={() => setShowAdd(false)}>
          <form
            onSubmit={handleAdd}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 animate-fade-up space-y-4 ${themeClass}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-primary text-2xl">{t("new_tip")}</h2>
                <p className="text-xs uppercase tracking-[0.18em] font-bold text-theme-primary mt-1 capitalize">{activeCat}</p>
              </div>
              <button type="button" onClick={() => setShowAdd(false)} className="w-9 h-9 rounded-full bg-bg flex items-center justify-center"><X size={16} /></button>
            </div>
            <Input label={t("tip_name")} value={newName} onChange={setNewName} testid="tip-new-name" required />
            <Select
              label={t("subcategory")}
              value={newSub}
              onChange={setNewSub}
              testid="tip-new-sub"
              options={[{ v: "mancare", l: t("mancare") }, { v: "bauturi", l: t("bauturi") }]}
            />
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              data-testid="tip-new-submit"
              className="w-full py-3 rounded-full bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white font-secondary font-bold disabled:opacity-50 shadow-[0_10px_28px_-10px_rgba(0,0,0,0.45)]"
            >
              {adding ? t("loading") : t("save")}
            </button>
          </form>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmTip && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={() => !deleting && setConfirmTip(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 animate-fade-up space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="font-primary text-xl">{t("delete_tip_confirm")}</h2>
                <p className="text-sm text-muted mt-1">
                  <span className="font-bold text-ink">{confirmTip.nume}</span>
                  <span className="text-[11px] ml-2 px-2 py-0.5 rounded-full bg-bg uppercase tracking-wider">{confirmTip.categorie}</span>
                  {confirmTip.produse_count > 0 && (
                    <span className="block mt-1 text-red-600">
                      {t("tip_has_products").replace("{n}", confirmTip.produse_count)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmTip(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-full bg-bg text-ink font-bold"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handleDelete(confirmTip.produse_count > 0)}
                disabled={deleting}
                data-testid="tip-confirm-delete"
                className="flex-1 py-2.5 rounded-full bg-red-600 text-white font-bold disabled:opacity-60"
              >
                {deleting ? t("loading") : t("confirm_delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatPill({ active, onClick, testid, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      className={`px-4 py-1.5 rounded-full text-sm font-secondary font-bold tracking-wide transition ${
        active
          ? "bg-ink text-white shadow-sm"
          : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SettingsManager({ settings, setSettings, loadingSettings, setLoadingSettings }) {
  const { t } = useI18n();
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);

  const toggleLocation = async (location) => {
    if (!settings) return;
    setErr("");
    setSuccessMsg("");
    setLoadingSettings(true);

    try {
      const updatedLocations = settings.active_locations.includes(location)
        ? settings.active_locations.filter((l) => l !== location)
        : [...settings.active_locations, location];

      const result = await updateSettings({
        active_locations: updatedLocations,
      });

      setSettings(result);
      setSuccessMsg(`Location ${location} ${updatedLocations.includes(location) ? "activated" : "deactivated"}`);
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Error updating settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  const reorderTipuri = async (location, subcategory, newOrder) => {
    if (!settings) return;
    setErr("");
    setSuccessMsg("");
    setLoadingSettings(true);

    try {
      const updatedTipuriOrder = {
        ...settings.tipuri_order,
        [location]: {
          ...settings.tipuri_order?.[location],
          [subcategory]: newOrder,
        },
      };

      const result = await updateSettings({
        tipuri_order: updatedTipuriOrder,
      });

      setSettings(result);
      setSuccessMsg(`Category order updated for ${location} - ${subcategory}`);
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Error updating settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleDragStartTipuri = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverTipuri = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropTipuri = (e, location, subcategory, targetTipName) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.location !== location || draggedItem.subcategory !== subcategory || draggedItem.tip === targetTipName) {
      setDraggedItem(null);
      return;
    }

    const currentOrder = settings.tipuri_order?.[location]?.[subcategory] || [];
    const dragIndex = currentOrder.indexOf(draggedItem.tip);
    const targetIndex = currentOrder.indexOf(targetTipName);

    if (dragIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    const newOrder = [...currentOrder];
    [newOrder[dragIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[dragIndex]];

    reorderTipuri(location, subcategory, newOrder);
    setDraggedItem(null);
  };

  if (!settings) {
    return <div className="py-10 text-center text-muted">Loading settings...</div>;
  }

  const locations = [
    { id: "terasa", name: "Terasa", color: "cyan" },
    { id: "restaurant", name: "Restaurant", color: "amber" },
    { id: "discoteca", name: "Zero Club", color: "purple" },
  ];

  const subcategories = [
    { id: "mancare", name: "Mâncare" },
    { id: "bauturi", name: "Băuturi" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">
          {err}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-800 text-sm">
          {successMsg}
        </div>
      )}

      {/* Location Management */}
      <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
        <h2 className="font-primary text-2xl font-medium mb-5">Manage Locations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {locations.map((loc) => {
            const isActive = settings.active_locations.includes(loc.id);
            const bgColor = loc.color === "cyan" ? "bg-cyan-50 border-cyan-200" : loc.color === "amber" ? "bg-amber-50 border-amber-200" : "bg-purple-50 border-purple-200";
            const textColor = loc.color === "cyan" ? "text-cyan-700" : loc.color === "amber" ? "text-amber-700" : "text-purple-700";
            const buttonColor = isActive 
              ? (loc.color === "cyan" ? "bg-cyan-600" : loc.color === "amber" ? "bg-amber-600" : "bg-purple-600")
              : "bg-gray-300";

            return (
              <div key={loc.id} className={`rounded-xl border-2 p-4 ${bgColor}`}>
                <h3 className={`font-semibold text-lg ${textColor} mb-3`}>{loc.name}</h3>
                <button
                  onClick={() => toggleLocation(loc.id)}
                  disabled={loadingSettings}
                  className={`w-full py-2 rounded-lg text-white font-semibold transition ${buttonColor} ${loadingSettings ? "opacity-60" : "hover:opacity-90 active:scale-95"}`}
                >
                  {isActive ? "✓ Active" : "Inactive"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category (Tipuri) Order per Location/Subcategory */}
      <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
        <h2 className="font-primary text-2xl font-medium mb-5">Category Order</h2>
        <p className="text-sm text-muted mb-6">Drag to reorder categories within each subcategory</p>
        
        <div className="space-y-6">
          {locations.map((loc) => {
            const isActive = settings.active_locations.includes(loc.id);
            if (!isActive) return null;

            return (
              <div key={loc.id} className="border border-line rounded-xl p-4 bg-bg">
                <h3 className="font-semibold text-ink mb-4">{loc.name}</h3>
                <div className="space-y-4">
                  {subcategories.map((sub) => {
                    const tipuri = settings.tipuri_order?.[loc.id]?.[sub.id] || [];
                    return (
                      <div key={`${loc.id}-${sub.id}`} className="pl-4 border-l-2 border-line">
                        <h4 className="text-sm font-medium text-muted mb-2">{sub.name}</h4>
                        <div className="space-y-2">
                          {tipuri.length > 0 ? (
                            tipuri.map((tip, idx) => (
                              <div
                                key={`${loc.id}-${sub.id}-${tip}`}
                                draggable
                                onDragStart={(e) => handleDragStartTipuri(e, { tip, location: loc.id, subcategory: sub.id })}
                                onDragOver={handleDragOverTipuri}
                                onDrop={(e) => handleDropTipuri(e, loc.id, sub.id, tip)}
                                className={`flex items-center gap-3 p-2 bg-white rounded border-2 cursor-move transition ${
                                  draggedItem?.tip === tip && draggedItem?.location === loc.id && draggedItem?.subcategory === sub.id
                                    ? "border-ink opacity-50"
                                    : "border-line hover:border-ink/30"
                                }`}
                              >
                                <span className="text-xs font-bold text-ink bg-bg px-2 py-1 rounded">#{idx + 1}</span>
                                <span className="flex-1 font-medium text-ink text-sm">{tip}</span>
                                <span className="text-xs text-muted">≡ drag</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted py-2">No categories</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Products Management */}
      <div className="bg-white rounded-2xl border border-line p-6 shadow-sm">
        <h2 className="font-primary text-2xl font-medium mb-5">Manage Products</h2>
        <p className="text-sm text-muted mb-6">Toggle products on/off to control which products are visible to customers</p>
        <ProductsManager settings={settings} setSettings={setSettings} loadingSettings={loadingSettings} setLoadingSettings={setLoadingSettings} />
      </div>
    </div>
  );
}

function ProductsManager({ settings, setSettings, loadingSettings, setLoadingSettings }) {
  const { t, lang } = useI18n();
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [allProduse, setAllProduse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // Load all products
    api.get("/admin/produse").then((r) => {
      setAllProduse(r.data.items || []);
      setLoading(false);
    }).catch(() => {
      setAllProduse([]);
      setLoading(false);
    });
  }, []);

  const toggleProduct = async (productId) => {
    if (!settings) return;
    setErr("");
    setSuccessMsg("");
    setLoadingSettings(true);

    try {
      const inactiveList = settings.inactive_produse || [];
      const isCurrentlyInactive = inactiveList.includes(productId);
      
      const updatedProduse = isCurrentlyInactive
        ? inactiveList.filter((id) => id !== productId)  // Remove from inactive = turn ON
        : [...inactiveList, productId];  // Add to inactive = turn OFF

      const result = await updateSettings({
        inactive_produse: updatedProduse,
      });

      setSettings(result);
      const prod = allProduse.find(p => p.id === productId);
      const prodName = localizedName(prod, lang);
      setSuccessMsg(`${prodName} ${isCurrentlyInactive ? "turned ON" : "turned OFF"}`);
    } catch (e) {
      const d = e?.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Error updating settings");
    } finally {
      setLoadingSettings(false);
    }
  };

  const filteredProduse = allProduse.filter(p => {
    // Filter by category
    if (filterCat && p.categorie !== filterCat) return false;
    
    // Filter by search text
    if (searchText) {
      const search = searchText.toLowerCase();
      const name = (localizedName(p, lang) || "").toLowerCase();
      const desc = (localizedDescription(p, lang) || "").toLowerCase();
      const tip = (p.tip || "").toLowerCase();
      if (!name.includes(search) && !desc.includes(search) && !tip.includes(search)) {
        return false;
      }
    }
    
    return true;
  });

  const locations = [
    { id: "terasa", name: "Terasa" },
    { id: "restaurant", name: "Restaurant" },
    { id: "discoteca", name: "Zero Club" },
  ];

  if (loading) {
    return <div className="py-10 text-center text-muted">Loading products...</div>;
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-800 text-sm">
          {err}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-800 text-sm">
          {successMsg}
        </div>
      )}

      {/* Filter by location */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Search products..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="px-4 py-2 rounded-full border border-line bg-white text-sm w-full sm:w-64"
        />
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat("")}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              filterCat === ""
                ? "bg-ink text-white"
                : "bg-bg border border-line text-muted hover:text-ink"
            }`}
          >
            All
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setFilterCat(loc.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                filterCat === loc.id
                  ? "bg-ink text-white"
                  : "bg-bg border border-line text-muted hover:text-ink"
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
        {filteredProduse.length > 0 ? (
          filteredProduse.map((prod) => {
            const inactiveList = settings?.inactive_produse || [];
            const isInactive = inactiveList.includes(prod.id);
            const isActive = !isInactive;  // Inverse logic
            
            return (
              <div
                key={prod.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 transition ${
                  isActive
                    ? "bg-green-50 border-green-300"
                    : "bg-gray-50 border-gray-300"
                }`}
              >
                <button
                  onClick={() => toggleProduct(prod.id)}
                  disabled={loadingSettings}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                    isActive
                      ? "bg-green-600 border-green-600"
                      : "bg-white border-gray-400 hover:border-green-600"
                  }`}
                >
                  {isActive && <span className="text-white text-xs font-bold">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">{localizedName(prod, lang)}</p>
                  <p className="text-xs text-muted">{prod.categorie} • {prod.subcategorie} • {prod.tip}</p>
                  <p className="text-xs font-medium text-ink mt-1">{prod.pret} lei</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted py-4">No products found</p>
        )}
      </div>
    </div>
  );
}
