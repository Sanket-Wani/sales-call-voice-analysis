"use client";

import { Loader2 } from "lucide-react";

interface LaserScannerProps {
  isProcessing: boolean;
  statusMessage?: string;
  stepMessage?: string;
}

export function LaserScanner({
  isProcessing,
  statusMessage = "Analyzing Call Audio & Diarizing Speakers...",
  stepMessage = "Running Sarvam AI (saaras:v4) & Sarvam-105B LLM",
}: LaserScannerProps) {
  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white px-4 animate-in fade-in duration-200">
      <div className="relative w-72 h-96 sm:w-84 sm:h-[420px] rounded-2xl border-2 border-emerald-500/70 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.3)] bg-neutral-950 flex flex-col items-center justify-center p-6">
        {/* Corner Bracket Accents */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-emerald-400"></div>
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-emerald-400"></div>
        <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-emerald-400"></div>
        <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-emerald-400"></div>

        {/* Laser Scanning Beam */}
        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-400 to-indigo-500 shadow-[0_0_15px_#10b981] animate-laser"></div>

        {/* Status Indicators */}
        <div className="text-center space-y-4 z-10 px-2">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
            <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping -z-10"></span>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
              Evidence Extraction & Audit
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed font-medium">
              {statusMessage}
            </p>
          </div>

          <div className="pt-2 border-t border-neutral-800">
            <span className="inline-block px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400">
              {stepMessage}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
