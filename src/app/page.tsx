"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { AudioPlayerWithEvidence } from "@/components/AudioPlayerWithEvidence";
import { TranscriptViewer, TranscriptItem } from "@/components/TranscriptViewer";
import { EvidenceCards, EvidenceClaimItem } from "@/components/EvidenceCards";
import { LaserScanner } from "@/components/LaserScanner";
import { FloatingScanButton } from "@/components/FloatingScanButton";
import { SamplePickerModal } from "@/components/SamplePickerModal";
import {
  PhoneCall,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Building2,
  MapPin,
  IndianRupee,
  Home,
  CheckCircle,
  CheckCircle2,
  Calendar,
  User,
  Award,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Info,
  Flag,
  UserCheck,
  ChevronRight,
  Play,
  Quote,
} from "lucide-react";

interface CallSummaryItem {
  id: string;
  file_name: string;
  file_path: string;
  duration_seconds: number;
  representative_name?: string;
  customer_name?: string;
  customer_phone?: string;
  status: string;
  claims_count: number;
  transcript_count: number;
  outcome: string;
  sentiment: string;
  llm_provider: string;
  llm_model: string;
  summary_preview: string;
  created_at: string;
}

interface FullCallDetails {
  call: CallSummaryItem;
  transcripts: TranscriptItem[];
  analysis: {
    llm_provider: string;
    llm_model: string;
    executive_summary: string;
    call_outcome: string;
    lead_sentiment: string;
    language_mix: string;
    entities: {
      projects_mentioned?: string[];
      locations_mentioned?: string[];
      budget_or_pricing?: string[];
      configuration_sought?: string[];
    };
    sales_performance?: {
      greeting_and_rapport?: number;
      product_knowledge?: number;
      listening_and_discovery?: number;
      objection_handling?: number;
      closing_clarity?: number;
      feedback?: string;
    };
    representative_audit?: {
      overall_judgment?: string;
      positive_points?: string[];
      neutral_points?: string[];
      negative_points?: string[];
      scope_of_improvement?: string[];
      behavioral_flags?: Array<{
        flag_type: string;
        severity: string;
        description: string;
        timestamp_reference?: number;
        timestamp_ref?: number;
        time_span?: string;
        verbatim_quote?: string;
        claim_linked?: string;
      }>;
    };
  };
  evidence: EvidenceClaimItem[];
  actionItems: Array<{
    id: string;
    task: string;
    assignee?: string;
    timestamp_ref?: number;
    urgency?: string;
    completed: number;
  }>;
}

export default function HomeDashboard() {
  const [calls, setCalls] = useState<CallSummaryItem[]>([]);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [callDetails, setCallDetails] = useState<FullCallDetails | null>(null);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Audio Playback Sync
  const [currentTime, setCurrentTime] = useState(0);
  const [targetJumpTime, setTargetJumpTime] = useState<number | null>(null);

  // Laser Scanner State
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [stepMessage, setStepMessage] = useState("");

  // Sample Picker Modal
  const [isSamplePickerOpen, setIsSamplePickerOpen] = useState(false);

  // Fetch Calls List
  const fetchCalls = async () => {
    try {
      setLoadingCalls(true);
      const res = await fetch("/api/calls");
      const data = await res.json();
      if (data.success && data.calls.length > 0) {
        setCalls(data.calls);
        if (!selectedCallId) {
          setSelectedCallId(data.calls[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load calls:", err);
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  // Fetch Full Call Details when selected
  useEffect(() => {
    if (!selectedCallId) return;

    const fetchDetails = async () => {
      try {
        setLoadingDetails(true);
        setCurrentTime(0);
        const res = await fetch(`/api/calls/${selectedCallId}`);
        const data = await res.json();
        if (data.success) {
          setCallDetails(data);
        }
      } catch (err) {
        console.error("Failed to load call details:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedCallId]);

  const handleJumpToTime = (seconds: number) => {
    setTargetJumpTime(seconds);
    const playerSection = document.getElementById("audio-player-section");
    if (playerSection) {
      playerSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Trigger processing for a selected sample from the 24 audio files
  const handleSelectSample = async (sample: any) => {
    setIsSamplePickerOpen(false);
    setIsProcessing(true);
    setStatusMessage(`Transcribing ${sample.fileName} with Sarvam Batch STT (saaras:v4)...`);
    setStepMessage("Speech-to-Text & Diarization in progress");

    try {
      const res = await fetch("/api/samples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          samplePath: sample.relativePath,
          representativeName: sample.representative !== "Root" ? sample.representative : "Representative",
        }),
      });

      setStatusMessage("Extracting Evidence Claims with Sarvam 105B LLM...");
      setStepMessage("Evidence Grounding & Verification");

      const data = await res.json();
      if (data.success) {
        await fetchCalls();
        setSelectedCallId(data.callId);
      } else {
        alert(`Audit failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error during processing: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle direct file upload
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setStatusMessage(`Uploading & Transcribing ${file.name}...`);
    setStepMessage("Sarvam STT + Diarization");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("representative", "Sales Representative");

      const res = await fetch("/api/calls/upload", {
        method: "POST",
        body: formData,
      });

      setStatusMessage("Analyzing call with Sarvam 105B LLM & Grounding Claims...");
      setStepMessage("Quality Audit & Traceability");

      const data = await res.json();
      if (data.success) {
        await fetchCalls();
        setSelectedCallId(data.callId);
      } else {
        alert(`Upload audit failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const rem = Math.floor(s % 60);
    return `${mins}m ${rem}s`;
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
      case "skeptical":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "negative":
        return "bg-red-50 text-red-800 border-red-200";
      default:
        return "bg-neutral-100 text-neutral-800 border-neutral-200";
    }
  };

  const totalClaimsCount = calls.reduce((acc, c) => acc + (c.claims_count || 0), 0);

  return (
    <div className="min-h-screen bg-neutral-50/50 text-neutral-900 flex flex-col font-sans">
      <Navbar totalCallsCount={calls.length} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Call Selector Strip */}
        <div className="bg-white border border-neutral-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Audited Calls Strip
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSamplePickerOpen(true)}
              className="text-xs font-semibold text-neutral-900 hover:text-emerald-700 inline-flex items-center gap-1 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit Another Sample ({24 - calls.length} left)</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
            {calls.map((c) => {
              const isSelected = c.id === selectedCallId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCallId(c.id)}
                  className={`min-w-[240px] max-w-[280px] p-2.5 rounded-lg border text-left transition shrink-0 ${
                    isSelected
                      ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                      : "bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold truncate">
                      {c.customer_name || c.representative_name || c.file_name}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        isSelected
                          ? "bg-neutral-800 text-emerald-400"
                          : "bg-white text-neutral-600 border border-neutral-200"
                      }`}
                    >
                      {c.outcome}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 text-[10px] font-mono ${
                      isSelected ? "text-neutral-300" : "text-neutral-500"
                    }`}
                  >
                    <span>{formatSecs(c.duration_seconds)}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      {c.claims_count} claims
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Call Workspace */}
        {loadingDetails ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center space-y-3 shadow-xs">
            <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-neutral-500 font-mono">Loading call intelligence details...</p>
          </div>
        ) : callDetails ? (
          <div className="space-y-6">
            {/* Call Header Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-base font-bold text-neutral-900 tracking-tight">
                      {callDetails.call.customer_name || "Prospective Buyer"}
                    </h2>
                    <span className="text-xs font-mono text-neutral-500">
                      ({callDetails.call.customer_phone || "Phone call"})
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getSentimentBadge(
                        callDetails.analysis?.lead_sentiment
                      )}`}
                    >
                      {callDetails.analysis?.lead_sentiment || "Neutral"} Sentiment
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-white">
                      Outcome: {callDetails.analysis?.call_outcome || "In Discussion"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 flex items-center gap-2">
                    <span className="font-semibold text-neutral-700">Representative:</span>
                    <span>{callDetails.call.representative_name || "Sales Rep"}</span>
                    <span>•</span>
                    <span className="font-mono">{formatSecs(callDetails.call.duration_seconds)}</span>
                    <span>•</span>
                    <span className="font-mono text-neutral-400">{callDetails.call.file_name}</span>
                  </p>
                </div>
              </div>

              {/* Synchronized Audio Player */}
              <div id="audio-player-section">
                <AudioPlayerWithEvidence
                  audioSrc={`/api/audio/${callDetails.call.file_path}`}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  targetJumpTime={targetJumpTime}
                  onJumpHandled={() => setTargetJumpTime(null)}
                />
              </div>

              {/* Executive Summary */}
              <div className="pt-2">
                <div className="space-y-2.5">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900 block">
                    Executive Call Summary
                  </h3>
                  <p className="text-base sm:text-lg font-bold text-neutral-900 leading-relaxed bg-neutral-50 p-4 sm:p-5 rounded-xl border border-neutral-200 font-sans shadow-xs">
                    {callDetails.analysis?.executive_summary || "No executive summary available."}
                  </p>
                </div>
              </div>

              {/* Action Items & Next Commitments - Positioned directly below Executive Call Summary */}
              <div className="pt-4 border-t border-neutral-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                      Action Items & Next Commitments
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                    {callDetails.actionItems.length} {callDetails.actionItems.length === 1 ? "task" : "tasks"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {callDetails.actionItems.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic py-1">No pending action items from this call.</p>
                  ) : (
                    callDetails.actionItems.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-lg border border-neutral-200 bg-neutral-50/60 hover:bg-neutral-50 transition flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-neutral-900 leading-snug">{act.task}</p>
                          <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-medium">
                            <span className="font-semibold text-neutral-700">Assignee: {act.assignee || "Representative"}</span>
                            <span>•</span>
                            <span>Urgency: {act.urgency || "Normal"}</span>
                          </div>
                        </div>

                        {act.timestamp_ref ? (
                          <button
                            type="button"
                            onClick={() => handleJumpToTime(act.timestamp_ref!)}
                            className="px-2.5 py-1 rounded text-[11px] font-mono font-semibold bg-white border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white text-neutral-700 transition shrink-0 shadow-2xs"
                            title="Jump audio to when this task was agreed"
                          >
                            Jump
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Split Screen Hub: Diarized Transcript (Left) + Traceable Claims (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Interactive Diarized Transcript */}
              <TranscriptViewer
                transcripts={callDetails.transcripts}
                currentTime={currentTime}
                onJumpToTime={handleJumpToTime}
                representativeName={callDetails.call.representative_name || "Sales Rep"}
                customerName={callDetails.call.customer_name || "Customer"}
              />

              {/* Right Column: Traceable Evidence Claims */}
              <EvidenceCards
                claims={callDetails.evidence}
                currentTime={currentTime}
                onJumpToTime={handleJumpToTime}
              />
            </div>

            {/* Sales Representative Audit & Conversation Review (Purely Text-Based Evaluation) */}
            {(() => {
              const audit = callDetails.analysis?.representative_audit ||
                            (callDetails.analysis?.sales_performance as any)?.representative_audit ||
                            (callDetails.analysis?.sales_performance as any) || {};

              const repName = callDetails.call.representative_name || "Sales Representative";

              const overallJudgment =
                audit.overall_judgment ||
                (typeof audit.feedback === "string" ? audit.feedback : "") ||
                `Qualitative performance evaluation dynamically synthesized from the conversation recording for ${repName}.`;

              const positivePoints: string[] = Array.isArray(audit.positive_points)
                ? audit.positive_points
                : [];

              const neutralPoints: string[] = Array.isArray(audit.neutral_points)
                ? audit.neutral_points
                : [];

              const negativePoints: string[] = Array.isArray(audit.negative_points)
                ? audit.negative_points
                : [];

              const scopeOfImprovement: string[] = Array.isArray(audit.scope_of_improvement)
                ? audit.scope_of_improvement
                : [];

              const behavioralFlags: Array<{
                flag_type: string;
                severity: string;
                description: string;
                timestamp_reference?: number;
                timestamp_ref?: number;
                time_span?: string;
                verbatim_quote?: string;
                claim_linked?: string;
              }> = Array.isArray(audit.behavioral_flags) ? audit.behavioral_flags : [];

              // Check if any flag has an active issue (not "None" or "Clean")
              const activeFlags = behavioralFlags.filter(
                (f) =>
                  f.flag_type &&
                  f.flag_type.toLowerCase() !== "none" &&
                  f.severity &&
                  f.severity.toLowerCase() !== "clean"
              );

              return (
                <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-100 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-neutral-900">
                          Sales Coaching & Conversation Review
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-500">
                        Qualitative representative audit, conduct review, and tactical coaching playbook for {repName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 border border-neutral-200 text-neutral-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-neutral-600" />
                        Representative Evaluation
                      </span>
                    </div>
                  </div>

                  {/* Behavioral Conduct & Event Flags (Arrogance, Misleading, Ignorance, etc.) */}
                  {activeFlags.length > 0 ? (
                    <div className="space-y-3">
                      {activeFlags.map((flag, idx) => {
                        const targetSeconds =
                          flag.timestamp_reference ??
                          flag.timestamp_ref ??
                          (callDetails.evidence?.[0]?.start_time ?? 0);

                        const timeBadge = flag.time_span
                          ? flag.time_span
                          : formatSecs(targetSeconds);

                        const proofQuote =
                          flag.verbatim_quote ||
                          flag.claim_linked ||
                          flag.description;

                        return (
                          <div
                            key={idx}
                            onClick={() => handleJumpToTime(targetSeconds)}
                            className="p-4 sm:p-5 rounded-xl border border-amber-300 bg-amber-50/80 hover:bg-amber-100/90 hover:border-amber-400 transition-all cursor-pointer shadow-xs group"
                            title="Click anywhere to play audio and verify proof from this exact timestamp"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 border border-amber-200">
                                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                                </div>
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                                      <Flag className="w-3.5 h-3.5 text-amber-600" />
                                      Flagged Event: {flag.flag_type}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200/90 text-amber-900 uppercase tracking-wider">
                                      {flag.severity} Priority
                                    </span>
                                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      {timeBadge}
                                    </span>
                                  </div>

                                  <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                                    {flag.description}
                                  </p>

                                  {/* Recorded Audio Proof & Verbatim Quote */}
                                  {proofQuote && (
                                    <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-200/90 text-xs text-amber-950 flex items-start gap-2 shadow-2xs">
                                      <Quote className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0 opacity-80" />
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-[11px] text-amber-900 block">
                                          Recorded Audio Evidence & Verbatim Quote:
                                        </span>
                                        <p className="italic font-sans text-amber-950 font-medium leading-relaxed">
                                          &ldquo;{proofQuote}&rdquo;
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Action: Verify Proof Button */}
                              <div className="self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleJumpToTime(targetSeconds);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs transition transform active:scale-95 group/btn"
                                  title="Play audio directly from where this event occurred"
                                >
                                  <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400 group-hover/btn:scale-110 transition-transform" />
                                  <span>Verify Proof</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                          Conduct Audit: Clean & Professional
                        </div>
                        <p className="text-xs text-emerald-900 leading-snug">
                          {behavioralFlags[0]?.description ||
                            "No arrogance, misleading statements, or ignorance detected. The representative maintained professional etiquette throughout the call."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Representative Overall Judgment */}
                  <div className="p-4 sm:p-5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Executive Representative Judgment</span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-normal">
                      {overallJudgment}
                    </p>
                  </div>

                  {/* 3-Pillar Points Grid: Positive, Neutral, Negative */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Positive Points */}
                    <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3 flex flex-col">
                      <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/60">
                        <ThumbsUp className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-950">
                          Positive Points
                        </h4>
                      </div>
                      <ul className="space-y-2.5 flex-1">
                        {positivePoints.length > 0 ? (
                          positivePoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-emerald-950 leading-relaxed">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-neutral-500 italic py-1">
                            No specific positive highlights recorded for this interaction.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Neutral Points */}
                    <div className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200 space-y-3 flex flex-col">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                        <Info className="w-4 h-4 text-neutral-600" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-800">
                          Neutral Points
                        </h4>
                      </div>
                      <ul className="space-y-2.5 flex-1">
                        {neutralPoints.length > 0 ? (
                          neutralPoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 leading-relaxed">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-xs text-neutral-500 italic py-1">
                            No neutral observations noted.
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Negative Points */}
                    <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200/80 space-y-3 flex flex-col">
                      <div className="flex items-center gap-2 pb-2 border-b border-rose-200/60">
                        <ThumbsDown className="w-4 h-4 text-rose-700" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-950">
                          Negative Points
                        </h4>
                      </div>
                      <ul className="space-y-2.5 flex-1">
                        {negativePoints.length > 0 ? (
                          negativePoints.map((pt, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-rose-950 leading-relaxed">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                              <span>{pt}</span>
                            </li>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Clean execution — no critical negative points or protocol breaches observed.</span>
                          </div>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Scope of Improvement & Mentorship Guide */}
                  <div className="p-4 sm:p-5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-200">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600" />
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">
                          Scope of Improvement & Actionable Coaching
                        </h4>
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-500">
                        Manager Mentorship Playbook
                      </span>
                    </div>

                    {scopeOfImprovement.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {scopeOfImprovement.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-white border border-neutral-200 flex items-start gap-2.5 shadow-2xs"
                          >
                            <div className="p-1 rounded bg-amber-50 text-amber-700 mt-0.5 shrink-0">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </div>
                            <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-white border border-neutral-200 text-xs text-neutral-600 italic">
                        Representative adhered to targeted sales protocol; no corrective coaching actions required.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ) : null}
      </main>

      {/* Laser Scanner Fullscreen Overlay */}
      <LaserScanner
        isProcessing={isProcessing}
        statusMessage={statusMessage}
        stepMessage={stepMessage}
      />

      {/* Floating Action Button (FAB) */}
      <FloatingScanButton
        onOpenSamplePicker={() => setIsSamplePickerOpen(true)}
        onFileUpload={handleFileUpload}
      />

      {/* Audio Sample Picker Modal */}
      <SamplePickerModal
        isOpen={isSamplePickerOpen}
        onClose={() => setIsSamplePickerOpen(false)}
        onSelectSample={handleSelectSample}
      />
    </div>
  );
}
