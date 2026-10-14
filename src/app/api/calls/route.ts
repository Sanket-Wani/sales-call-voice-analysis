import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const calls = await prisma.call.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            evidenceClaims: true,
            transcripts: true,
          },
        },
        analyses: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            callOutcome: true,
            leadSentiment: true,
            llmProvider: true,
            llmModel: true,
            executiveSummary: true,
          },
        },
      },
    });

    const enriched = calls.map((c) => {
      const analysis = c.analyses[0];
      return {
        id: c.id,
        file_name: c.fileName,
        file_path: c.filePath,
        duration_seconds: c.durationSeconds,
        representative_name: c.representativeName || undefined,
        customer_name: c.customerName || undefined,
        customer_phone: c.customerPhone || undefined,
        status: c.status,
        sarvam_job_id: c.sarvamJobId || undefined,
        error_message: c.errorMessage || undefined,
        created_at: typeof c.createdAt === "string" ? c.createdAt : String(c.createdAt),
        updated_at: typeof c.updatedAt === "string" ? c.updatedAt : String(c.updatedAt),
        claims_count: c._count.evidenceClaims,
        transcript_count: c._count.transcripts,
        outcome: analysis?.callOutcome || "Pending",
        sentiment: analysis?.leadSentiment || "Neutral",
        llm_provider: analysis?.llmProvider || "sarvam",
        llm_model: analysis?.llmModel || "sarvam-105b-conversations",
        summary_preview: analysis?.executiveSummary?.slice(0, 160) || "",
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
