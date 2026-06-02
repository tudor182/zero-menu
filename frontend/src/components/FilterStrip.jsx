import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../lib/i18n";
import api from "../lib/api";

export default function FilterStrip({ tipuri, activeTip, onSelect, categorie, subcategorie, settings, setSettings }) {
  const { t, tTip } = useI18n();
  const scrollRef = useRef(null);
  const activeRef = useRef(null);
  const [draggedTip, setDraggedTip] = useState(null);
  const [orderedTipuri, setOrderedTipuri] = useState(tipuri);

  useEffect(() => {
    // Load custom order from settings if available
    if (settings?.tipuri_order?.[categorie]?.[subcategorie]) {
      const customOrder = settings.tipuri_order[categorie][subcategorie];
      const ordered = customOrder.filter(t => tipuri.includes(t));
      // Add any tipuri not in custom order
      for (const t of tipuri) {
        if (!ordered.includes(t)) ordered.push(t);
      }
      setOrderedTipuri(ordered);
    } else {
      setOrderedTipuri(tipuri);
    }
  }, [tipuri, settings, categorie, subcategorie]);

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

  const handleDragStart = (e, tip) => {
    setDraggedTip(tip);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetTip) => {
    e.preventDefault();
    if (!draggedTip || draggedTip === targetTip) {
      setDraggedTip(null);
      return;
    }

    const dragIndex = orderedTipuri.indexOf(draggedTip);
    const targetIndex = orderedTipuri.indexOf(targetTip);
    
    if (dragIndex === -1 || targetIndex === -1) {
      setDraggedTip(null);
      return;
    }

    const newOrder = [...orderedTipuri];
    [newOrder[dragIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[dragIndex]];
    setOrderedTipuri(newOrder);

    // Save to backend
    if (categorie && subcategorie && settings && setSettings) {
      try {
        const updatedTipuriOrder = {
          ...settings.tipuri_order,
          [categorie]: {
            ...settings.tipuri_order?.[categorie],
            [subcategorie]: newOrder,
          },
        };

        const result = await api.put("/admin/settings", {
          tipuri_order: updatedTipuriOrder,
        });

        setSettings(result.data);
      } catch (e) {
        console.error("Failed to save tipuri order:", e);
      }
    }

    setDraggedTip(null);
  };

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
        {orderedTipuri.map((tip) => {
          const active = activeTip === tip;
          return (
            <button
              key={tip}
              ref={active ? activeRef : null}
              data-testid={`filter-pill-${tip.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => onSelect(tip)}
              draggable
              onDragStart={(e) => handleDragStart(e, tip)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tip)}
              className={`shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-secondary font-semibold transition-all duration-300 ring-1 cursor-move ${
                active
                  ? "bg-gradient-to-br from-[var(--t-primary)] to-[var(--t-accent)] text-white shadow-[0_8px_18px_-8px_rgba(0,0,0,0.35)] ring-white/20 scale-[1.03]"
                  : "bg-theme-soft text-theme-soft ring-transparent hover:bg-white hover:ring-line"
              } ${draggedTip === tip ? "opacity-50" : ""}`}
            >
              {tTip(tip)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
