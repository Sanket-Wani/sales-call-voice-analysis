import { NextRequest, NextResponse } from "next/server";
import { getFullCallDetails } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const details = await getFullCallDetails(id);

    if (!details) {
      return NextResponse.json({ success: false, error: "Call not found" }, { status: 404 });
    }

    // Parse JSON strings in analysis
    let parsedEntities: any = {};
    let parsedPerformance: any = {};
    if (details.analysis) {
      try {
        parsedEntities = details.analysis.entities_json ? JSON.parse(details.analysis.entities_json) : {};
      } catch (e) {}
      try {
        parsedPerformance = details.analysis.sales_performance_json ? JSON.parse(details.analysis.sales_performance_json) : {};
      } catch (e) {}
    }

    const repAudit = parsedPerformance?.representative_audit || parsedPerformance || {};

    return NextResponse.json({
      success: true,
      call: details.call,
      transcripts: details.transcripts,
      analysis: details.analysis
        ? {
            ...details.analysis,
            entities: parsedEntities,
            sales_performance: parsedPerformance,
            representative_audit: repAudit,
          }
        : null,
      evidence: details.evidence,
      actionItems: details.actionItems,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
