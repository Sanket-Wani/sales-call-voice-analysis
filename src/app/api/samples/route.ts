import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, createCallRecord, saveTranscripts, saveAnalysis, saveEvidenceClaims, saveActionItems, updateCallStatus } from "@/lib/db";
import { transcribeAudioWithSarvam } from "@/lib/sarvam";
import { analyzeCallWithLlmPipeline } from "@/lib/llm";

export async function GET() {
  try {
    const audioRootDir = path.join(process.cwd(), "audio_ file");
    const samples: Array<{
      id: string;
      fileName: string;
      relativePath: string;
      representative: string;
      sizeBytes: number;
      sizeMb: string;
      format: string;
      isAlreadyProcessed: boolean;
    }> = [];

    const db = getDb();
    const existingCalls = db.prepare("SELECT file_path FROM calls").all() as Array<{ file_path: string }>;
    const processedPaths = new Set(existingCalls.map(c => c.file_path.replace(/\\/g, "/")));

    function scanDir(dir: string, rep: string) {
      if (!fs.existsSync(dir)) return;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          scanDir(fullPath, item.name);
        } else if (item.isFile() && (item.name.endsWith(".mp3") || item.name.endsWith(".mp4"))) {
          const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, "/");
          const stats = fs.statSync(fullPath);
          const ext = path.extname(item.name).toUpperCase().replace(".", "");
          
          samples.push({
            id: relPath.replace(/[^a-zA-Z0-9_-]/g, "_"),
            fileName: item.name,
            relativePath: relPath,
            representative: rep,
            sizeBytes: stats.size,
            sizeMb: (stats.size / 1024 / 1024).toFixed(2),
            format: ext,
            isAlreadyProcessed: processedPaths.has(relPath),
          });
        }
      }
    }

    scanDir(audioRootDir, "Root");

    return NextResponse.json({
      success: true,
      totalCount: samples.length,
      samples,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { samplePath, representativeName } = body;

    if (!samplePath) {
      return NextResponse.json({ success: false, error: "samplePath is required" }, { status: 400 });
    }

    const fullPath = path.join(process.cwd(), samplePath);
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ success: false, error: `File not found at ${samplePath}` }, { status: 404 });
    }

    const fileName = path.basename(fullPath);
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create initial record
    createCallRecord({
      id: callId,
      file_name: fileName,
      file_path: samplePath.replace(/\\/g, "/"),
      duration_seconds: 0,
      representative_name: representativeName || "Representative",
      status: "transcribing",
    });

    // Step 1: Transcribe with Sarvam STT
    console.log(`[Processing Sample] Starting Sarvam STT for: ${fileName}`);
    const transcription = await transcribeAudioWithSarvam(fullPath, {
      mode: "codemix",
      withDiarization: true,
    });

    updateCallStatus(callId, "transcribed");

    // Save transcripts
    saveTranscripts(
      callId,
      transcription.diarizedEntries.map(e => ({
        speaker_id: e.speaker_id,
        text: e.transcript,
        start_time: e.start_time_seconds,
        end_time: e.end_time_seconds,
      }))
    );

    // Step 2: Run LLM Analysis (Sarvam 105b primary, Gemini fallback)
    updateCallStatus(callId, "analyzing");
    console.log(`[Processing Sample] Running LLM Pipeline for call: ${callId}`);
    const analysisResult = await analyzeCallWithLlmPipeline(transcription.diarizedEntries);

    // Save Analysis
    saveAnalysis(callId, {
      llm_provider: analysisResult.provider,
      llm_model: analysisResult.model,
      executive_summary: analysisResult.report.summary?.executive_summary || "",
      call_outcome: analysisResult.report.summary?.call_outcome || "Follow-up Required",
      lead_sentiment: analysisResult.report.summary?.lead_sentiment || "Neutral",
      language_mix: analysisResult.report.summary?.language_mix || "Hindi / Marathi / English",
      entities_json: JSON.stringify(analysisResult.report.entities || {}),
      sales_performance_json: JSON.stringify(
        analysisResult.report.representative_audit ||
        analysisResult.report.sales_performance ||
        {}
      ),
    });

    // Update transcript speaker roles from LLM grounded evidence
    const repSpeakerId = (analysisResult.report.claims_and_evidence || []).find(
      c => c.speaker?.toLowerCase() === "representative"
    )?.speaker_id;

    if (repSpeakerId !== undefined && repSpeakerId !== null) {
      const db = getDb();
      db.prepare(`UPDATE transcripts SET speaker_role = 'Representative' WHERE call_id = ? AND speaker_id = ?`).run(callId, String(repSpeakerId));
      db.prepare(`UPDATE transcripts SET speaker_role = 'Customer' WHERE call_id = ? AND speaker_id != ?`).run(callId, String(repSpeakerId));
    }

    // Save Grounded Evidence Claims
    saveEvidenceClaims(
      callId,
      (analysisResult.report.claims_and_evidence || []).map(c => ({
        claim: c.claim,
        category: c.category,
        speaker_role: c.speaker,
        speaker_id: String(c.speaker_id),
        verbatim_quote: c.verbatim_quote,
        start_time: c.start_time_seconds,
        end_time: c.end_time_seconds,
        confidence: c.confidence || 0.95,
        grounding_notes: c.grounding_notes || "",
      }))
    );

    // Save Action Items
    saveActionItems(
      callId,
      (analysisResult.report.action_items || []).map(a => ({
        task: a.task,
        assignee: a.assignee,
        timestamp_ref: a.timestamp_reference,
        urgency: a.deadline_or_urgency,
      }))
    );

    // Update final call status
    updateCallStatus(callId, "completed");

    return NextResponse.json({
      success: true,
      callId,
      provider: analysisResult.provider,
      model: analysisResult.model,
      claimsCount: analysisResult.report.claims_and_evidence?.length || 0,
    });
  } catch (error: any) {
    console.error("[Process Sample Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
