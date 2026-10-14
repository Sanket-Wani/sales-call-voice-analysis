"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Play, Quote, Tag, ShieldCheck, Filter } from "lucide-react";

export interface EvidenceClaimItem {
  id: string;
  claim: string;
  category: string;
  speaker_role?: string;
  speaker_id?: string;
  verbatim_quote: string;
  start_time: number;
  end_time: number;
  confidence: number;
  grounding_notes?: string;
  status: string;
}

interface EvidenceCardsProps {
  claims: EvidenceClaimItem[];
  currentTime: number;
  onJumpToTime: (time: number) => void;
}

export function EvidenceCards({
  claims,
  currentTime,
  onJumpToTime,
}: EvidenceCardsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [autoScroll, setAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastActiveIdRef = useRef<string | null>(null);

  const categories = [
    { key: "all", label: "All Claims" },
    { key: "pricing", label: "Pricing & Budget" },
    { key: "project_details", label: "Project Details" },
    { key: "commitment", label: "Commitments" },
    { key: "objection", label: "Objections" },
  ];

  const matchesCategory = (itemCategory: string, catKey: string) => {
    if (catKey === "all") return true;
    if (catKey === "pricing") return itemCategory === "pricing" || itemCategory === "customer_budget";
    return itemCategory === catKey;
  };

  const getCategoryCount = (key: string) => {
    return claims.filter((c) => matchesCategory(c.category, key)).length;
  };

  const filtered = claims.filter((c) => matchesCategory(c.category, selectedCategory));

  // Auto-scroll to active claim card aligned with current dialogue
  const activeClaim = filtered.find(
    (item) => currentTime >= item.start_time && currentTime <= item.end_time
  );

  useEffect(() => {
    if (!autoScroll || !activeClaim) return;

    if (activeClaim.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeClaim.id;

      const el = cardRefs.current.get(activeClaim.id);
      const container = containerRef.current;

      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const relativeTop = elRect.top - containerRect.top + container.scrollTop;
        const targetScrollTop = relativeTop - container.clientHeight / 2 + elRect.height / 2;

        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [currentTime, autoScroll, activeClaim]);

  const formatTimestamp = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, "0")}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pricing":
      case "customer_budget":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "project_details":
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
      case "commitment":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "objection":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200";
    }
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl flex flex-col h-[650px] shadow-sm">
      {/* Header & Filter Pills */}
      <div className="p-3.5 border-b border-neutral-200 space-y-2.5 bg-neutral-50/50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Traceable Evidence Claims
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              100% Grounded
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Scroll Toggle */}
            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold transition border ${
                autoScroll
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-neutral-100 text-neutral-500 border-neutral-200 hover:text-neutral-700"
              }`}
              title={
                autoScroll
                  ? "Live audio auto-scroll active (Click to pause)"
                  : "Live auto-scroll paused (Click to resume)"
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autoScroll ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"
                }`}
              />
              <span>Auto-scroll {autoScroll ? "On" : "Off"}</span>
            </button>

            <span className="text-xs font-mono text-neutral-500 font-semibold">
              {filtered.length} of {claims.length} claims
            </span>
          </div>
        </div>

        {/* Filter Badges with Category Counts (Clean Wrapping, No Horizontal Scrollbar) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {categories.map((cat) => {
            const count = getCategoryCount(cat.key);
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                  isSelected
                    ? "bg-neutral-900 text-white font-semibold shadow-xs"
                    : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold transition-colors ${
                    isSelected
                      ? "bg-neutral-800 text-emerald-300 border border-neutral-700"
                      : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards Stream */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4">
            <p className="text-xs text-neutral-400">No claims found in this category.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isActive =
              currentTime >= item.start_time && currentTime <= item.end_time;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(item.id, el);
                  else cardRefs.current.delete(item.id);
                }}
                className={`p-3.5 rounded-xl border transition-all duration-200 space-y-2.5 ${
                  isActive
                    ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300/60 shadow-sm"
                    : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-xs"
                }`}
              >
                {/* Category & Confidence Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryColor(
                        item.category
                      )}`}
                    >
                      {item.category.replace("_", " ")}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        item.speaker_role?.toLowerCase() === "representative"
                          ? "bg-neutral-100 text-neutral-800 border border-neutral-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {item.speaker_role || (item.speaker_id === "0" ? "Representative" : "Customer")}
                    </span>
                  </div>
                </div>

                {/* Claim Statement */}
                <h4 className="text-xs font-bold text-neutral-900 leading-snug">
                  {item.claim}
                </h4>

                {/* Verbatim Audio Quote Box */}
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 relative">
                  <Quote className="w-3.5 h-3.5 text-neutral-400 absolute top-2 left-2 opacity-50" />
                  <p className="pl-4 italic leading-relaxed font-sans">
                    &ldquo;{item.verbatim_quote}&rdquo;
                  </p>
                </div>

                {/* Jump to Audio Action Button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Time span: {formatTimestamp(item.start_time)} – {formatTimestamp(item.end_time)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onJumpToTime(item.start_time)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs transition transform active:scale-95 group"
                  >
                    <Play className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    <span>Jump to Audio</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
