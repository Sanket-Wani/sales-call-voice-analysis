import { NextResponse } from "next/server";
import { getAllCalls, getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const calls = getAllCalls();

    // Enrich calls with counts and analysis summary
    const enriched = calls.map((c) => {
      const claimsCount = (db.prepare("SELECT count(*) as count FROM evidence_claims WHERE call_id = ?").get(c.id) as any)?.count || 0;
      const transcriptCount = (db.prepare("SELECT count(*) as count FROM transcripts WHERE call_id = ?").get(c.id) as any)?.count || 0;
      const analysis = db.prepare("SELECT call_outcome, lead_sentiment, llm_provider, llm_model, executive_summary FROM call_analyses WHERE call_id = ? LIMIT 1").get(c.id) as any;

      return {
        ...c,
        claims_count: claimsCount,
        transcript_count: transcriptCount,
        outcome: analysis?.call_outcome || "Pending",
        sentiment: analysis?.lead_sentiment || "Neutral",
        llm_provider: analysis?.llm_provider || "sarvam",
        llm_model: analysis?.llm_model || "sarvam-105b-conversations",
        summary_preview: analysis?.executive_summary?.slice(0, 160) || "",
      };
    });

    return NextResponse.json({
      success: true,
      calls: enriched,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
