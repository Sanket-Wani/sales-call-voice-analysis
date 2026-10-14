import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const rawUrl = process.env.DATABASE_URL || "";
const DB_PATH = rawUrl.startsWith("file:")
  ? path.resolve(process.cwd(), rawUrl.replace(/^file:/, ""))
  : path.join(DATA_DIR, "sales_call.db");

// Singleton database instance
let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      duration_seconds REAL DEFAULT 0,
      representative_name TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded, transcribing, transcribed, analyzing, completed, failed
      sarvam_job_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transcripts (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
      speaker_id TEXT NOT NULL,
      speaker_role TEXT DEFAULT 'unknown', -- representative, customer, unknown
      text TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      sequence_order INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
    CREATE INDEX IF NOT EXISTS idx_transcripts_times ON transcripts(call_id, start_time);

    CREATE TABLE IF NOT EXISTS call_analyses (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
      llm_provider TEXT NOT NULL, -- sarvam, gemini
      llm_model TEXT NOT NULL,    -- sarvam-105b, gemini-2.5-flash
      executive_summary TEXT,
      call_outcome TEXT,
      lead_sentiment TEXT,
      language_mix TEXT,
      entities_json TEXT,         -- JSON string
      sales_performance_json TEXT,-- JSON string
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_analyses_call_id ON call_analyses(call_id);

    CREATE TABLE IF NOT EXISTS evidence_claims (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
      claim TEXT NOT NULL,
      category TEXT NOT NULL,     -- pricing, project_details, customer_budget, objection, commitment, action_item
      speaker_role TEXT,          -- Representative, Customer, Unknown
      speaker_id TEXT,
      verbatim_quote TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      confidence REAL DEFAULT 1.0,
      grounding_notes TEXT,
      status TEXT DEFAULT 'verified' -- verified, flagged, reviewed
    );

    CREATE INDEX IF NOT EXISTS idx_claims_call_id ON evidence_claims(call_id);

    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY,
      call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
      task TEXT NOT NULL,
      assignee TEXT,              -- Representative, Customer
      timestamp_ref REAL,
      urgency TEXT,
      completed INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_actions_call_id ON action_items(call_id);
  `);
}

// Data access operations
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

export function createCallRecord(call: Omit<CallRecord, "created_at" | "updated_at">): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO calls (id, file_name, file_path, duration_seconds, representative_name, customer_name, customer_phone, status, sarvam_job_id)
    VALUES (@id, @file_name, @file_path, @duration_seconds, @representative_name, @customer_name, @customer_phone, @status, @sarvam_job_id)
  `);
  stmt.run(call);
}

export function updateCallStatus(id: string, status: CallRecord["status"], errorMessage?: string): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE calls 
    SET status = ?, error_message = ?, updated_at = datetime('now')
    WHERE id = ?
  `);
  stmt.run(status, errorMessage || null, id);
}

export function updateCallMetadata(id: string, updates: Partial<CallRecord>): void {
  const db = getDb();
  const fields = Object.keys(updates)
    .filter(k => k !== "id")
    .map(k => `${k} = @${k}`)
    .join(", ");
  if (!fields) return;

  const stmt = db.prepare(`
    UPDATE calls 
    SET ${fields}, updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({ ...updates, id });
}

export function getAllCalls(): CallRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM calls ORDER BY created_at DESC").all() as CallRecord[];
}

export function getCallById(id: string): CallRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM calls WHERE id = ?").get(id);
  return (row as CallRecord) || null;
}

export function saveTranscripts(callId: string, entries: Array<{ speaker_id: string; speaker_role?: string; text: string; start_time: number; end_time: number }>): void {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO transcripts (id, call_id, speaker_id, speaker_role, text, start_time, end_time, sequence_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteExisting = db.prepare("DELETE FROM transcripts WHERE call_id = ?");

  const transaction = db.transaction(() => {
    deleteExisting.run(callId);
    entries.forEach((entry, idx) => {
      const id = `${callId}_t_${idx}`;
      insert.run(id, callId, entry.speaker_id, entry.speaker_role || "unknown", entry.text, entry.start_time, entry.end_time, idx);
    });
  });

  transaction();
}

export function getCallTranscripts(callId: string): TranscriptRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM transcripts WHERE call_id = ? ORDER BY sequence_order ASC").all(callId) as TranscriptRecord[];
}

export function saveAnalysis(callId: string, analysis: {
  llm_provider: string;
  llm_model: string;
  executive_summary: string;
  call_outcome: string;
  lead_sentiment: string;
  language_mix: string;
  entities_json: string;
  sales_performance_json: string;
}): void {
  const db = getDb();
  const id = `${callId}_analysis_${Date.now()}`;
  const deleteExisting = db.prepare("DELETE FROM call_analyses WHERE call_id = ?");
  const insert = db.prepare(`
    INSERT INTO call_analyses (id, call_id, llm_provider, llm_model, executive_summary, call_outcome, lead_sentiment, language_mix, entities_json, sales_performance_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    deleteExisting.run(callId);
    insert.run(
      id,
      callId,
      analysis.llm_provider,
      analysis.llm_model,
      analysis.executive_summary,
      analysis.call_outcome,
      analysis.lead_sentiment,
      analysis.language_mix,
      analysis.entities_json,
      analysis.sales_performance_json
    );
  });

  transaction();
}

export function getCallAnalysis(callId: string): AnalysisRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM call_analyses WHERE call_id = ? ORDER BY created_at DESC LIMIT 1").get(callId);
  return (row as AnalysisRecord) || null;
}

export function saveEvidenceClaims(callId: string, claims: Array<{
  claim: string;
  category: string;
  speaker_role?: string;
  speaker_id?: string;
  verbatim_quote: string;
  start_time: number;
  end_time: number;
  confidence: number;
  grounding_notes?: string;
}>): void {
  const db = getDb();
  const deleteExisting = db.prepare("DELETE FROM evidence_claims WHERE call_id = ?");
  const insert = db.prepare(`
    INSERT INTO evidence_claims (id, call_id, claim, category, speaker_role, speaker_id, verbatim_quote, start_time, end_time, confidence, grounding_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified')
  `);

  const transaction = db.transaction(() => {
    deleteExisting.run(callId);
    claims.forEach((c, idx) => {
      const id = `${callId}_claim_${idx}`;
      insert.run(
        id,
        callId,
        c.claim,
        c.category,
        c.speaker_role || "Unknown",
        c.speaker_id || "",
        c.verbatim_quote,
        c.start_time,
        c.end_time,
        c.confidence || 1.0,
        c.grounding_notes || ""
      );
    });
  });

  transaction();
}

export function getCallEvidence(callId: string): EvidenceRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM evidence_claims WHERE call_id = ? ORDER BY start_time ASC").all(callId) as EvidenceRecord[];
}

export function saveActionItems(callId: string, items: Array<{
  task: string;
  assignee?: string;
  timestamp_ref?: number;
  urgency?: string;
}>): void {
  const db = getDb();
  const deleteExisting = db.prepare("DELETE FROM action_items WHERE call_id = ?");
  const insert = db.prepare(`
    INSERT INTO action_items (id, call_id, task, assignee, timestamp_ref, urgency, completed)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `);

  const transaction = db.transaction(() => {
    deleteExisting.run(callId);
    items.forEach((item, idx) => {
      const id = `${callId}_act_${idx}`;
      insert.run(id, callId, item.task, item.assignee || "Representative", item.timestamp_ref || 0, item.urgency || "Normal");
    });
  });

  transaction();
}

export function getCallActionItems(callId: string): ActionItemRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM action_items WHERE call_id = ?").all(callId) as ActionItemRecord[];
}

export function getFullCallDetails(callId: string) {
  const call = getCallById(callId);
  if (!call) return null;
  const transcripts = getCallTranscripts(callId);
  const analysis = getCallAnalysis(callId);
  const evidence = getCallEvidence(callId);
  const actionItems = getCallActionItems(callId);

  return {
    call,
    transcripts,
    analysis,
    evidence,
    actionItems,
  };
}
