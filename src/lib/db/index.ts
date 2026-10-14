import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Backward-compatible getDb returning prisma client
export function getDb() {
  return prisma;
}

// Data access operations & types
export interface CallRecord {
  id: string;
  file_name: string;
  file_path: string;
  duration_seconds: number;
  representative_name?: string;
  customer_name?: string;
  customer_phone?: string;
  status: "uploaded" | "transcribing" | "transcribed" | "analyzing" | "completed" | "failed";
  sarvam_job_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptRecord {
  id: string;
  call_id: string;
  speaker_id: string;
  speaker_role: string;
  text: string;
  start_time: number;
  end_time: number;
  sequence_order: number;
}

export interface EvidenceRecord {
  id: string;
  call_id: string;
  claim: string;
  category: string;
  speaker_role?: string;
  speaker_id?: string;
  verbatim_quote: string;
  start_time: number;
  end_time: number;
  confidence: number;
  grounding_notes?: string;
  status: string;
}

export interface ActionItemRecord {
  id: string;
  call_id: string;
  task: string;
  assignee?: string;
  timestamp_ref?: number;
  urgency?: string;
  completed: number;
}

export interface AnalysisRecord {
  id: string;
  call_id: string;
  llm_provider: string;
  llm_model: string;
  executive_summary?: string;
  call_outcome?: string;
  lead_sentiment?: string;
  language_mix?: string;
  entities_json?: string;
  sales_performance_json?: string;
  created_at: string;
}

export async function createCallRecord(call: Omit<CallRecord, "created_at" | "updated_at">): Promise<void> {
  await prisma.call.upsert({
    where: { id: call.id },
    create: {
      id: call.id,
      fileName: call.file_name,
      filePath: call.file_path,
      durationSeconds: call.duration_seconds || 0,
      representativeName: call.representative_name || null,
      customerName: call.customer_name || null,
      customerPhone: call.customer_phone || null,
      status: call.status,
      sarvamJobId: call.sarvam_job_id || null,
      errorMessage: call.error_message || null,
    },
    update: {
      status: call.status,
      durationSeconds: call.duration_seconds || 0,
      representativeName: call.representative_name || null,
      customerName: call.customer_name || null,
      customerPhone: call.customer_phone || null,
    },
  });
}

export async function updateCallStatus(id: string, status: CallRecord["status"], errorMessage?: string): Promise<void> {
  await prisma.call.update({
    where: { id },
    data: {
      status,
      errorMessage: errorMessage || null,
    },
  });
}

export async function updateCallMetadata(id: string, updates: Partial<CallRecord>): Promise<void> {
  const data: any = {};
  if (updates.duration_seconds !== undefined) data.durationSeconds = updates.duration_seconds;
  if (updates.representative_name !== undefined) data.representativeName = updates.representative_name;
  if (updates.customer_name !== undefined) data.customerName = updates.customer_name;
  if (updates.customer_phone !== undefined) data.customerPhone = updates.customer_phone;
  if (updates.status !== undefined) data.status = updates.status;
  if (updates.sarvam_job_id !== undefined) data.sarvamJobId = updates.sarvam_job_id;
  if (updates.error_message !== undefined) data.errorMessage = updates.error_message;

  await prisma.call.update({
    where: { id },
    data,
  });
}

export async function getAllCalls(): Promise<CallRecord[]> {
  const calls = await prisma.call.findMany({
    orderBy: { createdAt: "desc" },
  });

  return calls.map((c) => ({
    id: c.id,
    file_name: c.fileName,
    file_path: c.filePath,
    duration_seconds: c.durationSeconds,
    representative_name: c.representativeName || undefined,
    customer_name: c.customerName || undefined,
    customer_phone: c.customerPhone || undefined,
    status: c.status as CallRecord["status"],
    sarvam_job_id: c.sarvamJobId || undefined,
    error_message: c.errorMessage || undefined,
    created_at: typeof c.createdAt === "string" ? c.createdAt : String(c.createdAt),
    updated_at: typeof c.updatedAt === "string" ? c.updatedAt : String(c.updatedAt),
  }));
}

export async function getCallById(id: string): Promise<CallRecord | null> {
  const c = await prisma.call.findUnique({
    where: { id },
  });
  if (!c) return null;

  return {
    id: c.id,
    file_name: c.fileName,
    file_path: c.filePath,
    duration_seconds: c.durationSeconds,
    representative_name: c.representativeName || undefined,
    customer_name: c.customerName || undefined,
    customer_phone: c.customerPhone || undefined,
    status: c.status as CallRecord["status"],
    sarvam_job_id: c.sarvamJobId || undefined,
    error_message: c.errorMessage || undefined,
    created_at: typeof c.createdAt === "string" ? c.createdAt : String(c.createdAt),
    updated_at: typeof c.updatedAt === "string" ? c.updatedAt : String(c.updatedAt),
  };
}

export async function saveTranscripts(
  callId: string,
  entries: Array<{ speaker_id: string; speaker_role?: string; text: string; start_time: number; end_time: number }>
): Promise<void> {
  await prisma.$transaction([
    prisma.transcript.deleteMany({ where: { callId } }),
    prisma.transcript.createMany({
      data: entries.map((entry, idx) => ({
        id: `${callId}_t_${idx}`,
        callId,
        speakerId: String(entry.speaker_id),
        speakerRole: entry.speaker_role || "unknown",
        text: entry.text,
        startTime: entry.start_time,
        endTime: entry.end_time,
        sequenceOrder: idx,
      })),
    }),
  ]);
}

export async function getCallTranscripts(callId: string): Promise<TranscriptRecord[]> {
  const list = await prisma.transcript.findMany({
    where: { callId },
    orderBy: { sequenceOrder: "asc" },
  });

  return list.map((t) => ({
    id: t.id,
    call_id: t.callId,
    speaker_id: t.speakerId,
    speaker_role: t.speakerRole,
    text: t.text,
    start_time: t.startTime,
    end_time: t.endTime,
    sequence_order: t.sequenceOrder,
  }));
}

export async function saveAnalysis(
  callId: string,
  analysis: {
    llm_provider: string;
    llm_model: string;
    executive_summary: string;
    call_outcome: string;
    lead_sentiment: string;
    language_mix: string;
    entities_json: string;
    sales_performance_json: string;
  }
): Promise<void> {
  await prisma.$transaction([
    prisma.callAnalysis.deleteMany({ where: { callId } }),
    prisma.callAnalysis.create({
      data: {
        id: `${callId}_analysis_${Date.now()}`,
        callId,
        llmProvider: analysis.llm_provider,
        llmModel: analysis.llm_model,
        executiveSummary: analysis.executive_summary,
        callOutcome: analysis.call_outcome,
        leadSentiment: analysis.lead_sentiment,
        languageMix: analysis.language_mix,
        entitiesJson: analysis.entities_json,
        salesPerformanceJson: analysis.sales_performance_json,
      },
    }),
  ]);
}

export async function getCallAnalysis(callId: string): Promise<AnalysisRecord | null> {
  const row = await prisma.callAnalysis.findFirst({
    where: { callId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;

  return {
    id: row.id,
    call_id: row.callId,
    llm_provider: row.llmProvider,
    llm_model: row.llmModel,
    executive_summary: row.executiveSummary || undefined,
    call_outcome: row.callOutcome || undefined,
    lead_sentiment: row.leadSentiment || undefined,
    language_mix: row.languageMix || undefined,
    entities_json: row.entitiesJson || undefined,
    sales_performance_json: row.salesPerformanceJson || undefined,
    created_at: typeof row.createdAt === "string" ? row.createdAt : String(row.createdAt),
  };
}

export async function saveEvidenceClaims(
  callId: string,
  claims: Array<{
    claim: string;
    category: string;
    speaker_role?: string;
    speaker_id?: string;
    verbatim_quote: string;
    start_time: number;
    end_time: number;
    confidence: number;
    grounding_notes?: string;
  }>
): Promise<void> {
  await prisma.$transaction([
    prisma.evidenceClaim.deleteMany({ where: { callId } }),
    prisma.evidenceClaim.createMany({
      data: claims.map((c, idx) => ({
        id: `${callId}_claim_${idx}`,
        callId,
        claim: c.claim,
        category: c.category,
        speakerRole: c.speaker_role || "Unknown",
        speakerId: c.speaker_id || "",
        verbatimQuote: c.verbatim_quote,
        startTime: c.start_time,
        endTime: c.end_time,
        confidence: c.confidence || 1.0,
        groundingNotes: c.grounding_notes || "",
        status: "verified",
      })),
    }),
  ]);
}

export async function getCallEvidence(callId: string): Promise<EvidenceRecord[]> {
  const list = await prisma.evidenceClaim.findMany({
    where: { callId },
    orderBy: { startTime: "asc" },
  });

  return list.map((c) => ({
    id: c.id,
    call_id: c.callId,
    claim: c.claim,
    category: c.category,
    speaker_role: c.speakerRole || undefined,
    speaker_id: c.speakerId || undefined,
    verbatim_quote: c.verbatimQuote,
    start_time: c.startTime,
    end_time: c.endTime,
    confidence: c.confidence,
    grounding_notes: c.groundingNotes || undefined,
    status: c.status || "verified",
  }));
}

export async function saveActionItems(
  callId: string,
  items: Array<{
    task: string;
    assignee?: string;
    timestamp_ref?: number;
    urgency?: string;
  }>
): Promise<void> {
  await prisma.$transaction([
    prisma.actionItem.deleteMany({ where: { callId } }),
    prisma.actionItem.createMany({
      data: items.map((item, idx) => ({
        id: `${callId}_act_${idx}`,
        callId,
        task: item.task,
        assignee: item.assignee || "Representative",
        timestampRef: item.timestamp_ref || 0,
        urgency: item.urgency || "Normal",
        completed: 0,
      })),
    }),
  ]);
}

export async function getCallActionItems(callId: string): Promise<ActionItemRecord[]> {
  const list = await prisma.actionItem.findMany({
    where: { callId },
    orderBy: { id: "asc" },
  });

  return list.map((a) => ({
    id: a.id,
    call_id: a.callId,
    task: a.task,
    assignee: a.assignee || undefined,
    timestamp_ref: a.timestampRef || undefined,
    urgency: a.urgency || undefined,
    completed: a.completed,
  }));
}

export async function updateTranscriptSpeakerRoles(callId: string, repSpeakerId: string): Promise<void> {
  await prisma.transcript.updateMany({
    where: { callId, speakerId: String(repSpeakerId) },
    data: { speakerRole: "Representative" },
  });
  await prisma.transcript.updateMany({
    where: { callId, speakerId: { not: String(repSpeakerId) } },
    data: { speakerRole: "Customer" },
  });
}

export async function getFullCallDetails(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: {
      transcripts: { orderBy: { sequenceOrder: "asc" } },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      evidenceClaims: { orderBy: { startTime: "asc" } },
      actionItems: { orderBy: { id: "asc" } },
    },
  });

  if (!call) return null;

  return {
    call: {
      id: call.id,
      file_name: call.fileName,
      file_path: call.filePath,
      duration_seconds: call.durationSeconds,
      representative_name: call.representativeName || undefined,
      customer_name: call.customerName || undefined,
      customer_phone: call.customerPhone || undefined,
      status: call.status as CallRecord["status"],
      sarvam_job_id: call.sarvamJobId || undefined,
      error_message: call.errorMessage || undefined,
      created_at: typeof call.createdAt === "string" ? call.createdAt : String(call.createdAt),
      updated_at: typeof call.updatedAt === "string" ? call.updatedAt : String(call.updatedAt),
    },
    transcripts: call.transcripts.map((t) => ({
      id: t.id,
      call_id: t.callId,
      speaker_id: t.speakerId,
      speaker_role: t.speakerRole,
      text: t.text,
      start_time: t.startTime,
      end_time: t.endTime,
      sequence_order: t.sequenceOrder,
    })),
    analysis: call.analyses[0]
      ? {
          id: call.analyses[0].id,
          call_id: call.analyses[0].callId,
          llm_provider: call.analyses[0].llmProvider,
          llm_model: call.analyses[0].llmModel,
          executive_summary: call.analyses[0].executiveSummary || "",
          call_outcome: call.analyses[0].callOutcome || "",
          lead_sentiment: call.analyses[0].leadSentiment || "",
          language_mix: call.analyses[0].languageMix || "",
          entities_json: call.analyses[0].entitiesJson || "",
          sales_performance_json: call.analyses[0].salesPerformanceJson || "",
          created_at: typeof call.analyses[0].createdAt === "string" ? call.analyses[0].createdAt : String(call.analyses[0].createdAt),
        }
      : null,
    evidence: call.evidenceClaims.map((e) => ({
      id: e.id,
      call_id: e.callId,
      claim: e.claim,
      category: e.category,
      speaker_role: e.speakerRole || "Unknown",
      speaker_id: e.speakerId || "",
      verbatim_quote: e.verbatimQuote,
      start_time: e.startTime,
      end_time: e.endTime,
      confidence: e.confidence,
      grounding_notes: e.groundingNotes || "",
      status: e.status || "verified",
    })),
    actionItems: call.actionItems.map((a) => ({
      id: a.id,
      call_id: a.callId,
      task: a.task,
      assignee: a.assignee || "Representative",
      timestamp_ref: a.timestampRef || 0,
      urgency: a.urgency || "Normal",
      completed: a.completed,
    })),
  };
}
