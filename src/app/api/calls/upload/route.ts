import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getDb, createCallRecord, saveTranscripts, saveAnalysis, saveEvidenceClaims, saveActionItems, updateCallStatus } from "@/lib/db";
import { transcribeAudioWithSarvam } from "@/lib/sarvam";
import { analyzeCallWithLlmPipeline } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const representativeName = (formData.get("representative") as string) || "Sales Representative";

    if (!file) {
      return NextResponse.json({ success: false, error: "No audio file provided" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const originalName = file.name;
    const safeFileName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const targetFilePath = path.join(uploadsDir, safeFileName);
    fs.writeFileSync(targetFilePath, buffer);

    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const relativePath = path.relative(process.cwd(), targetFilePath).replace(/\\/g, "/");

    // Create Call Record
    createCallRecord({
      id: callId,
      file_name: originalName,
      file_path: relativePath,
      duration_seconds: 0,
      representative_name: representativeName,
      status: "transcribing",
    });

    // 1. Transcribe with Sarvam STT
    console.log(`[Upload] Transcribing ${originalName}...`);
    const transcription = await transcribeAudioWithSarvam(targetFilePath, {
      mode: "codemix",
      withDiarization: true,
    });

    updateCallStatus(callId, "transcribed");

    // Save transcripts
    saveTranscripts(
      callId,
      transcription.diarizedEntries.map((e) => ({
        speaker_id: e.speaker_id,
        text: e.transcript,
        start_time: e.start_time_seconds,
        end_time: e.end_time_seconds,
      }))
    );

    // 2. Analyze with Sarvam 105B LLM (Fallback: Gemini)
    updateCallStatus(callId, "analyzing");
    console.log(`[Upload] Analyzing with LLM pipeline...`);
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
      (c) => c.speaker?.toLowerCase() === "representative"
    )?.speaker_id;

    if (repSpeakerId !== undefined && repSpeakerId !== null) {
      const db = getDb();
      db.prepare(`UPDATE transcripts SET speaker_role = 'Representative' WHERE call_id = ? AND speaker_id = ?`).run(callId, String(repSpeakerId));
      db.prepare(`UPDATE transcripts SET speaker_role = 'Customer' WHERE call_id = ? AND speaker_id != ?`).run(callId, String(repSpeakerId));
    }

    // Save Grounded Evidence Claims
    saveEvidenceClaims(
      callId,
      (analysisResult.report.claims_and_evidence || []).map((c) => ({
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
      (analysisResult.report.action_items || []).map((a) => ({
        task: a.task,
        assignee: a.assignee,
        timestamp_ref: a.timestamp_reference,
        urgency: a.deadline_or_urgency,
      }))
    );

    updateCallStatus(callId, "completed");

    return NextResponse.json({
      success: true,
      callId,
      provider: analysisResult.provider,
      model: analysisResult.model,
      claimsCount: analysisResult.report.claims_and_evidence?.length || 0,
    });
  } catch (error: any) {
    console.error("[Upload Error]", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
