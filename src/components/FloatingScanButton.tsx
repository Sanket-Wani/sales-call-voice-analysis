"use client";

import { useState, useRef } from "react";
import { Scan, X, FileUp, Library, Sparkles } from "lucide-react";

interface FloatingScanButtonProps {
  onOpenSamplePicker: () => void;
  onFileUpload: (file: File) => void;
}

export function FloatingScanButton({
  onOpenSamplePicker,
  onFileUpload,
}: FloatingScanButtonProps) {
  const [showOptions, setShowOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      setShowOptions(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/mpeg,video/mp4,audio/wav"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="relative">
          {/* Gentle pulsing halo */}
          <span className="absolute -inset-1 rounded-full bg-emerald-500/20 animate-ping -z-10"></span>

          <button
            type="button"
            onClick={() => setShowOptions((prev) => !prev)}
            className="flex items-center gap-2.5 px-5 py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-neutral-700/50"
          >
            <Scan className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide">Audit Call</span>
          </button>
        </div>
      </div>

      {/* 2-Option Popup Menu */}
      {showOptions && (
        <div className="fixed bottom-24 right-8 z-50 w-76 bg-white rounded-2xl shadow-2xl border border-neutral-200 p-3 space-y-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 px-1">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              Start Call Audit
            </span>
            <button
              onClick={() => setShowOptions(false)}
              className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Option 1: Pick from 24 Audio Samples */}
          <button
            type="button"
            onClick={() => {
              setShowOptions(false);
              onOpenSamplePicker();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-left transition group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-neutral-900">
                Choose from 24 Audio Samples
              </span>
              <span className="block text-[11px] text-neutral-500">
                ASIF, CHIRAG, POOJA, RITESH, etc.
              </span>
            </div>
          </button>

          {/* Option 2: Upload New Audio File */}
          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 text-left transition group"
          >
            <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white transition shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-xs font-bold text-neutral-900">
                Upload New Call Recording
              </span>
              <span className="block text-[11px] text-neutral-500">
                MP3, MP4 WhatsApp voice note
              </span>
            </div>
          </button>
        </div>
      )}
    </>
  );
}
