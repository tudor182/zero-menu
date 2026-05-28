import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

export default function TopBar({ title, backTo }) {
  return (
    <header className="sticky top-0 z-50 bg-bg/85 backdrop-blur-md border-b border-line/80">
      <div className="container max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              data-testid="back-button"
              className="w-10 h-10 rounded-full bg-theme-soft flex items-center justify-center active:scale-95 hover:scale-105 transition shrink-0 ring-1 ring-inset ring-white/40"
            >
              <ArrowLeft size={18} className="text-theme-soft" />
            </Link>
          ) : (
            <Link
              to="/"
              data-testid="logo-home"
              className="relative font-primary text-2xl font-semibold tracking-tight text-ink"
            >
              <span className="relative z-10">ZERO</span>
              <span className="absolute -bottom-0.5 left-0 right-0 h-[3px] bg-ink/10 rounded-full" />
            </Link>
          )}
          {title && (
            <>
              <span className="hidden sm:inline-block w-px h-5 bg-line" />
              <h1 className="font-primary text-xl sm:text-2xl font-medium text-ink truncate tracking-tight">
                {title}
              </h1>
            </>
          )}
        </div>
        <LanguageSwitcher />
      </div>
      {/* subtle decorative underline */}
      <div className="h-px bg-gradient-to-r from-transparent via-theme-primary/30 to-transparent" />
    </header>
  );
}
