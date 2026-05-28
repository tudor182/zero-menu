import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Lock } from "lucide-react";
import { useI18n } from "../lib/i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function AdminLogin() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("zero_token", data.access_token);
      localStorage.setItem("zero_user", JSON.stringify(data.user));
      nav("/admin");
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 429) {
        setErr(t("account_locked"));
      } else {
        setErr(typeof detail === "string" ? detail : t("auth_failed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-ink text-white flex items-center justify-center mx-auto mb-4">
            <Lock size={22} />
          </div>
          <h1 className="font-primary text-4xl font-medium text-ink">{t("admin_title")}</h1>
          <p className="text-sm text-muted mt-2">{t("admin_sub")}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-white rounded-2xl p-6 border border-line shadow-sm" autoComplete="off">
          <div>
            <label className="text-xs uppercase tracking-[0.15em] font-bold text-muted">{t("email")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-email-input"
              className="w-full mt-2 px-4 py-3 rounded-xl border border-line bg-bg focus:outline-none focus:ring-2 focus:ring-ink"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.15em] font-bold text-muted">{t("password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-password-input"
              className="w-full mt-2 px-4 py-3 rounded-xl border border-line bg-bg focus:outline-none focus:ring-2 focus:ring-ink"
              required
              autoComplete="current-password"
            />
          </div>
          {err && <p data-testid="admin-login-error" className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            data-testid="admin-login-submit"
            className="w-full py-3 rounded-xl bg-ink text-white font-semibold active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? t("signing_in") : t("enter")}
          </button>
        </form>
      </div>
    </div>
  );
}
