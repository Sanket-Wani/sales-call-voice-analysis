"use client";

import { useEffect, useState } from "react";
import { X, Music, CheckCircle2, Play, Sparkles, Folder } from "lucide-react";

interface SampleItem {
  id: string;
  fileName: string;
  relativePath: string;
  representative: string;
  sizeBytes: number;
  sizeMb: string;
  format: string;
  isAlreadyProcessed: boolean;
}

interface SamplePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (sample: SampleItem) => void;
}

export function SamplePickerModal({
  isOpen,
  onClose,
  onSelectSample,
}: SamplePickerModalProps) {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRep, setSelectedRep] = useState<string>("all");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch("/api/samples")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setSamples(data.samples || []);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const representatives = ["all", ...Array.from(new Set(samples.map((s) => s.representative)))];

  const filteredSamples = selectedRep === "all"
    ? samples
    : samples.filter((s) => s.representative === selectedRep);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              Audio Samples Inventory
            </h2>
            <p className="text-xs text-neutral-500">
              Select any real estate sales call recording to audit & extract evidence
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Representative Filter Tabs */}
        <div className="px-6 py-2.5 border-b border-neutral-100 flex items-center gap-1.5 overflow-x-auto bg-white">
          <span className="text-[11px] font-semibold text-neutral-400 mr-1 flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" /> Rep:
          </span>
          {representatives.map((rep) => (
            <button
              key={rep}
              type="button"
              onClick={() => setSelectedRep(rep)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition ${
                selectedRep === rep
                  ? "bg-neutral-900 text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {rep === "all" ? "All Folders" : rep}
            </button>
          ))}
        </div>

        {/* Samples List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {loading ? (
            <div className="text-center py-12 text-xs text-neutral-400">
              Loading audio inventory...
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-400">
              No audio files found.
            </div>
          ) : (
            filteredSamples.map((sample) => (
              <div
                key={sample.id}
                className="p-3.5 rounded-xl border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50/60 transition flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 group-hover:bg-neutral-900 group-hover:text-white transition shrink-0">
                    <Music className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-neutral-900 truncate">
                      {sample.fileName}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                      <span className="font-semibold text-neutral-700">
                        {sample.representative}
                      </span>
                      <span>•</span>
                      <span>{sample.format}</span>
                      <span>•</span>
                      <span>{sample.sizeMb} MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sample.isAlreadyProcessed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Audited
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectSample(sample)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs transition transform active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Audit Call</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
