import { GoogleGenAI } from "@google/genai";
import { DiarizedEntry, GroundedEvidence, CallIntelligenceReport } from "./gemini";

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "sk_03mty6as_VULONdGTCeAGnuqtBO4IqlSx";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

export interface UnifiedAnalysisResult {
  report: CallIntelligenceReport;
  provider: "sarvam" | "gemini";
  model: string;
  executionTimeMs: number;
}

/**
 * Primary LLM: Sarvam AI (sarvam-105b-conversations)
 * Fallback LLM: Google Gemini (gemini-2.5-flash)
 */
export async function analyzeCallWithLlmPipeline(
  diarizedEntries: DiarizedEntry[],
  fullTranscriptText?: string
): Promise<UnifiedAnalysisResult> {
  const startTime = Date.now();

  // Try Primary: Sarvam AI
  try {
    console.log("[LLM Pipeline] Attempting primary LLM: Sarvam AI (sarvam-105b-conversations)...");
    const sarvamReport = await callSarvamLlm(diarizedEntries);
    const duration = Date.now() - startTime;
    console.log(`[LLM Pipeline] Primary LLM (Sarvam) succeeded in ${duration}ms`);
    return {
      report: sarvamReport,
      provider: "sarvam",
      model: "sarvam-105b-conversations",
      executionTimeMs: duration,
    };
  } catch (sarvamError: any) {
    console.warn("[LLM Pipeline] Primary Sarvam LLM failed or timed out:", sarvamError.message);
    console.log("[LLM Pipeline] Triggering automatic fallback: Google Gemini (gemini-2.5-flash)...");

    // Fallback: Google Gemini
    try {
      const geminiReport = await callGeminiLlm(diarizedEntries);
      const duration = Date.now() - startTime;
      console.log(`[LLM Pipeline] Fallback LLM (Gemini) succeeded in ${duration}ms`);
      return {
        report: geminiReport,
        provider: "gemini",
        model: "gemini-2.5-flash",
        executionTimeMs: duration,
      };
    } catch (geminiError: any) {
      console.error("[LLM Pipeline] Both primary and fallback LLMs failed:", geminiError.message);
      throw new Error(`Call analysis failed. Sarvam: ${sarvamError.message}. Gemini: ${geminiError.message}`);
    }
  }
}

/**
 * Sarvam Chat Completion implementation
 */
async function callSarvamLlm(entries: DiarizedEntry[]): Promise<CallIntelligenceReport> {
  if (!SARVAM_API_KEY) {
    throw new Error("SARVAM_API_KEY not configured");
  }

  const segments = entries.map((e, idx) => {
    const start = e.start_time_seconds.toFixed(2);
    const end = e.end_time_seconds.toFixed(2);
    return `[#${idx} | ${start}s - ${end}s | Speaker ${e.speaker_id}]: ${e.transcript}`;
  }).join("\n");

  const systemPrompt = `You are a specialized Real Estate Call Intelligence & QA Auditor for Indian real estate calls (Hindi, Marathi, English codemix).
Your core rule is EVIDENCE GROUNDING & TRACEABILITY:
Every claim, price, project detail, commitment, or objection MUST have an exact quote from the transcript and exact start_time_seconds and end_time_seconds.

CRITICAL SPEAKER IDENTIFICATION ACCURACY:
Carefully identify which speaker_id is the Sales Representative and which is the Customer:
- Representative: The salesperson calling or receiving the sales call (e.g., Asif from Vishal Chogre Properties, agent from Nivan Skylark), asking if they can schedule a family plot visit, quoting prices/rates, pitching bungalow construction.
- Customer: The prospective buyer (e.g., Nandan Sir, Rushikesh Dave) answering questions, saying they are traveling in Chennai or saw a hoarding, asking about launch date and rates.
DO NOT invert or confuse the Representative and Customer.
Output strictly valid JSON.`;

  const userPrompt = `Analyze this real estate sales call transcript with timestamps:

TRANSCRIPT:
${segments}

Return a valid JSON object matching this exact structure:
{
  "speaker_roles": {
    "representative_speaker_id": "0 or 1",
    "representative_name": "Name or title of rep (e.g. Asif)",
    "customer_speaker_id": "0 or 1",
    "customer_name": "Name of customer (e.g. Nandan Sir, Rushikesh Dave)"
  },
  "summary": {
    "executive_summary": "2-3 concise sentences summarizing purpose, discussion, and status.",
    "call_outcome": "Interested" | "Follow-up Required" | "Not Interested" | "Site Visit Scheduled" | "Under Consideration",
    "lead_sentiment": "Positive" | "Neutral" | "Skeptical" | "Negative",
    "language_mix": "e.g. Marathi, Hindi & English codemix"
  },
  "entities": {
    "projects_mentioned": ["string"],
    "locations_mentioned": ["string"],
    "budget_or_pricing": ["string"],
    "configuration_sought": ["string"]
  },
  "claims_and_evidence": [
    {
      "claim": "Clear claim statement in English",
      "category": "pricing" | "project_details" | "customer_budget" | "objection" | "commitment" | "action_item",
      "speaker": "Representative" | "Customer" | "Unknown",
      "speaker_id": "0 or 1",
      "verbatim_quote": "exact sentence from transcript in original language",
      "start_time_seconds": 12.34,
      "end_time_seconds": 18.50,
      "confidence": 0.95,
      "grounding_notes": "Context explaining significance"
    }
  ],
  "action_items": [
    {
      "task": "Specific task, e.g. Send project details on WhatsApp",
      "assignee": "Representative" | "Customer",
      "timestamp_reference": 180.5,
      "deadline_or_urgency": "Immediate / Next 24 hours"
    }
  ],
  "representative_audit": {
    "overall_judgment": "Comprehensive qualitative assessment evaluating the representative's sales performance, attitude, product delivery, and customer handling.",
    "positive_points": [
      "Specific strength 1",
      "Specific strength 2"
    ],
    "neutral_points": [
      "Factual observation 1"
    ],
    "negative_points": [
      "Specific weakness or missed opportunity 1",
      "Specific weakness or missed opportunity 2"
    ],
    "scope_of_improvement": [
      "Actionable coaching guidance 1",
      "Actionable coaching guidance 2"
    ],
    "behavioral_flags": [
      {
        "flag_type": "Arrogance" | "Misleading Information" | "Ignorance / Lack of Knowledge" | "Premature Price Concession" | "Unprofessional Tone" | "None",
        "severity": "High" | "Medium" | "Low" | "Clean",
        "description": "Explanation of flag or confirmation of clean conduct",
        "timestamp_reference": 133.5,
        "time_span": "2:13 - 2:17",
        "verbatim_quote": "Exact verbatim quote from the recording proving this flag"
      }
    ]
  }
}
Return JSON ONLY. No markdown or explanation outside JSON.`;

  const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": SARVAM_API_KEY,
    },
    body: JSON.stringify({
      model: "sarvam-105b-conversations",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam API HTTP ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Sarvam returned empty message content");
  }

  const cleaned = rawContent.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned) as CallIntelligenceReport;
}

/**
 * Google Gemini fallback implementation
 */
async function callGeminiLlm(entries: DiarizedEntry[]): Promise<CallIntelligenceReport> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const segments = entries.map((e, idx) => {
    const start = e.start_time_seconds.toFixed(2);
    const end = e.end_time_seconds.toFixed(2);
    return `[#${idx} | ${start}s - ${end}s | Speaker ${e.speaker_id}]: ${e.transcript}`;
  }).join("\n");

  const systemInstruction = `You are an expert Real Estate Call Intelligence & QA Auditor.
Your core principle is TRACEABILITY & EVIDENCE GROUNDING:
Every extracted claim, price, commitment, or customer preference MUST be tied back to an exact transcript segment with its verbatim quote and precise start_time_seconds and end_time_seconds. Do not hallucinate. Output strictly valid JSON.`;

  const prompt = `Analyze this real estate call transcript with timestamps:
${segments}

Return a valid JSON object matching the requested schema with summary, entities, claims_and_evidence, action_items, and sales_performance.
Return JSON ONLY.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const responseText = response.text || "{}";
  const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
  return JSON.parse(cleaned) as CallIntelligenceReport;
}
