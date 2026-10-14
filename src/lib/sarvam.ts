import { SarvamAIClient } from "sarvamai";
import fs from "fs";
import path from "path";
import { DiarizedEntry } from "./gemini";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "sk_03mty6as_VULONdGTCeAGnuqtBO4IqlSx";

export const REAL_ESTATE_KEYTERMS = [
  "BHK", "carpet area", "super built-up", "RERA", "possession", "EMI",
  "Nivan Skylark", "Nivan Meadows", "Wagholi", "bungalow plot",
  "stamp duty", "registration", "token amount", "booking amount",
  "Godrej", "Kolte Patil", "Kalpataru", "Shapoorji", "negotiable",
  "amenities", "collector", "handover", "maintenance"
];

export interface TranscriptionResult {
  jobId?: string;
  transcriptText: string;
  languageCode?: string;
  durationSeconds: number;
  diarizedEntries: DiarizedEntry[];
  timestamps?: {
    chunks: string[];
    start_time_seconds: number[];
    end_time_seconds: number[];
  };
}

/**
 * Transcribe an audio file using Sarvam Batch STT API (saaras:v4 + diarization + codemix)
 */
export async function transcribeAudioWithSarvam(
  filePath: string,
  options?: {
    mode?: "codemix" | "transcribe" | "verbatim";
    withDiarization?: boolean;
    numSpeakers?: number;
    keyterms?: string[];
  }
): Promise<TranscriptionResult> {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY is not configured.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found at: ${filePath}`);
  }

  const client = new SarvamAIClient({
    apiSubscriptionKey: SARVAM_API_KEY,
  });

  const tempOutputDir = path.join(process.cwd(), "data", "transcripts_temp", `job_${Date.now()}`);
  if (!fs.existsSync(tempOutputDir)) {
    fs.mkdirSync(tempOutputDir, { recursive: true });
  }

  console.log(`[Sarvam STT] Creating batch job for ${path.basename(filePath)}...`);

  const jobParams: any = {
    model: "saaras:v4",
    mode: options?.mode || "codemix",
    languageCode: "hi-IN",
    withDiarization: options?.withDiarization !== false,
    withTimestamps: true,
    numSpeakers: options?.numSpeakers || 2,
    keyterms: options?.keyterms || REAL_ESTATE_KEYTERMS,
  };

  const job = await client.speechToTextJob.createJob(jobParams);
  console.log("[Sarvam STT] Job created. Uploading audio file...");
  await job.uploadFiles([filePath]);

  console.log("[Sarvam STT] Starting job and waiting for completion...");
  await job.start();

  await (job as any).waitUntilComplete(5);
  console.log("[Sarvam STT] Job completed. Downloading outputs...");

  await job.downloadOutputs(tempOutputDir);

  // Read output JSON
  const files = fs.readdirSync(tempOutputDir);
  const jsonFile = files.find(f => f.endsWith(".json"));
  if (!jsonFile) {
    throw new Error("Sarvam output did not contain a result JSON file");
  }

  const resultPath = path.join(tempOutputDir, jsonFile);
  const data = JSON.parse(fs.readFileSync(resultPath, "utf-8"));

  const diarizedEntries: DiarizedEntry[] = (data.diarized_transcript?.entries || []).map((e: any) => ({
    speaker_id: String(e.speaker_id ?? "0"),
    transcript: String(e.transcript ?? ""),
    start_time_seconds: Number(e.start_time_seconds ?? 0),
    end_time_seconds: Number(e.end_time_seconds ?? 0),
  }));

  let maxDuration = 0;
  if (diarizedEntries.length > 0) {
    maxDuration = diarizedEntries[diarizedEntries.length - 1].end_time_seconds;
  }

  return {
    transcriptText: data.transcript || "",
    languageCode: data.language_code,
    durationSeconds: maxDuration,
    diarizedEntries,
    timestamps: data.timestamps,
  };
}
