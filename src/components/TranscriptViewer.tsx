"use client";

import { useState, useEffect, useRef } from "react";
import { Search, User, Headphones, Clock, Check, Copy } from "lucide-react";

export interface TranscriptItem {
  id: string;
  speaker_id: string;
  speaker_role?: string;
  text: string;
  start_time: number;
  end_time: number;
  sequence_order: number;
}

interface TranscriptViewerProps {
  transcripts: TranscriptItem[];
  currentTime: number;
  onJumpToTime: (time: number) => void;
  representativeName?: string;
  customerName?: string;
}

export function TranscriptViewer({
  transcripts,
  currentTime,
  onJumpToTime,
  representativeName = "Sales Representative",
  customerName = "Prospective Buyer",
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastActiveIdRef = useRef<string | null>(null);

  const formatTimestamp = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins}:${rem.toString().padStart(2, "0")}`;
  };

  const filtered = transcripts.filter((t) =>
    t.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Auto-scroll to active transcript turn like Spotify lyrics
  const activeTranscript = filtered.find(
    (t) => currentTime >= t.start_time && currentTime <= t.end_time
  );

  useEffect(() => {
    if (!autoScroll || !activeTranscript) return;

    if (activeTranscript.id !== lastActiveIdRef.current) {
      lastActiveIdRef.current = activeTranscript.id;

      const el = itemRefs.current.get(activeTranscript.id);
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
  }, [currentTime, autoScroll, activeTranscript]);

  const handleCopy = () => {
    const fullText = transcripts
      .map(
        (t) =>
          `[${formatTimestamp(t.start_time)} - ${formatTimestamp(t.end_time)}] ${
            t.speaker_id === "0" ? representativeName : customerName
          }: ${t.text}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-xl flex flex-col h-[650px] shadow-sm">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-neutral-200 space-y-2.5 bg-neutral-50/50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Diarized Transcript
            </h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
              {transcripts.length} turns
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

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 transition"
              title="Copy full transcript"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search words, rates, property names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 focus:border-neutral-900 transition"
          />
        </div>
      </div>

      {/* Transcript Utterances List */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4">
            <p className="text-xs text-neutral-400">
              {searchQuery ? "No matching utterances found." : "No transcript entries."}
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isRep =
              item.speaker_role?.toLowerCase() === "representative" ||
              (item.speaker_role?.toLowerCase() !== "customer" && item.speaker_id === "0");
            const isActive =
              currentTime >= item.start_time && currentTime <= item.end_time;

            return (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(item.id, el);
                  else itemRefs.current.delete(item.id);
                }}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300/60 shadow-sm"
                    : "bg-white border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50/50"
                }`}
              >
                {/* Speaker Header & Jump Timestamp */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isRep
                          ? "bg-neutral-900 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {isRep ? (
                        <Headphones className="w-3 h-3" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-neutral-900">
                      {isRep ? representativeName : customerName}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isRep
                          ? "bg-neutral-100 text-neutral-700 border border-neutral-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isRep ? "Representative" : "Customer"}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Spk {item.speaker_id}
                    </span>
                  </div>

                  {/* Clickable Timestamp Badge */}
                  <button
                    type="button"
                    onClick={() => onJumpToTime(item.start_time)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-neutral-100 hover:bg-neutral-900 hover:text-white text-neutral-600 transition group"
                    title="Click to jump audio here"
                  >
                    <Clock className="w-3 h-3 text-neutral-400 group-hover:text-white" />
                    <span>
                      {formatTimestamp(item.start_time)} –{" "}
                      {formatTimestamp(item.end_time)}
                    </span>
                  </button>
                </div>

                {/* Utterance Text */}
                <p className="text-xs text-neutral-800 leading-relaxed pl-6 font-normal">
                  {item.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
