import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "";

export interface DiarizedEntry {
  speaker_id: string;
  transcript: string;
  start_time_seconds: number;
  end_time_seconds: number;
}

export interface GroundedEvidence {
  claim: string;
  category: "pricing" | "project_details" | "customer_budget" | "objection" | "commitment" | "action_item";
  speaker: "Representative" | "Customer" | "Unknown";
  speaker_id: string;
  verbatim_quote: string;
  start_time_seconds: number;
  end_time_seconds: number;
  confidence: number;
  grounding_notes?: string;
}

export interface CallIntelligenceReport {
  speaker_roles?: {
    representative_speaker_id: string;
    representative_name: string;
    customer_speaker_id: string;
    customer_name: string;
  };
  summary: {
    executive_summary: string;
    call_outcome: "Interested" | "Follow-up Required" | "Not Interested" | "Site Visit Scheduled" | "Under Consideration";
    lead_sentiment: "Positive" | "Neutral" | "Skeptical" | "Negative";
    language_mix: string;
  };
  entities: {
    projects_mentioned: string[];
    locations_mentioned: string[];
    budget_or_pricing: string[];
    configuration_sought: string[];
  };
  claims_and_evidence: GroundedEvidence[];
  action_items: {
    task: string;
    assignee: "Representative" | "Customer";
    timestamp_reference?: number;
    deadline_or_urgency?: string;
  }[];
  representative_audit: {
    overall_judgment: string;
    positive_points: string[];
    neutral_points: string[];
    negative_points: string[];
    scope_of_improvement: string[];
    behavioral_flags: {
      flag_type: "Arrogance" | "Misleading Information" | "Ignorance / Lack of Knowledge" | "Premature Price Concession" | "Unprofessional Tone" | "None";
      severity: "High" | "Medium" | "Low" | "Clean";
      description: string;
      timestamp_reference?: number;
    }[];
  };
  sales_performance?: {
    feedback: string;
  };
}

/**
 * Run structured evidence-first call intelligence on a diarized transcript
 */
export async function analyzeCallWithGemini(
  diarizedEntries: DiarizedEntry[],
  fullTranscriptText?: string
): Promise<CallIntelligenceReport> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare numbered evidence segments for the prompt
  const transcriptSegments = diarizedEntries.map((e, idx) => {
    const start = e.start_time_seconds.toFixed(2);
    const end = e.end_time_seconds.toFixed(2);
    return `[#${idx} | ${start}s - ${end}s | Speaker ${e.speaker_id}]: ${e.transcript}`;
  }).join("\n");

  const systemInstruction = `
You are an expert Real Estate Call Intelligence & Quality Assurance Auditor.
Your core principle is TRACEABILITY & EVIDENCE GROUNDING:
Every extracted claim, price, commitment, or customer preference MUST be tied back to an exact transcript segment with its verbatim quote and precise start_time_seconds and end_time_seconds. Do not hallucinate or extrapolate details that were never uttered.

Output your analysis in strictly valid JSON conforming to the schema requested.
`;

  const prompt = `
Analyze the following diarized real estate sales call transcript. Identify speakers (one is typically the Sales Representative, the other is the Prospective Buyer/Customer).

TRANSCRIPT WITH TIMESTAMPS:
${transcriptSegments}

Produce a comprehensive JSON object with this exact structure:
{
  "summary": {
    "executive_summary": "2-3 concise sentences summarizing the call purpose, discussion, and status.",
    "call_outcome": "Interested" | "Follow-up Required" | "Not Interested" | "Site Visit Scheduled" | "Under Consideration",
    "lead_sentiment": "Positive" | "Neutral" | "Skeptical" | "Negative",
    "language_mix": "e.g. Hindi, Marathi & English codemix"
  },
  "entities": {
    "projects_mentioned": ["list of project or property names"],
    "locations_mentioned": ["list of areas/localities like Wagholi"],
    "budget_or_pricing": ["quoted rates, budgets, e.g. 2000/sqft, 1.5 Cr"],
    "configuration_sought": ["e.g. 4 BHK bungalow, 1000 sq ft plot"]
  },
  "claims_and_evidence": [
    {
      "claim": "Clear concise claim statement in English",
      "category": "pricing" | "project_details" | "customer_budget" | "objection" | "commitment" | "action_item",
      "speaker": "Representative" | "Customer" | "Unknown",
      "speaker_id": "0 or 1",
      "verbatim_quote": "exact sentence from transcript in the original language spoken",
      "start_time_seconds": 12.34,
      "end_time_seconds": 18.50,
      "confidence": 0.95,
      "grounding_notes": "Context explaining why this claim matters"
    }
  ],
  "action_items": [
    {
      "task": "Specific task, e.g. Send brochure & rate card on WhatsApp",
      "assignee": "Representative" | "Customer",
      "timestamp_reference": 180.5,
      "deadline_or_urgency": "Immediate / Next 24 hours"
    }
  ],
  "sales_performance": {
    "greeting_and_rapport": 8,
    "product_knowledge": 7,
    "listening_and_discovery": 9,
    "objection_handling": 6,
    "closing_clarity": 8,
    "feedback": "Constructive evaluation of rep's pitch, customer qualification, and clarity of next steps."
  }
}

Return ONLY valid JSON.
`;

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
  try {
    return JSON.parse(responseText) as CallIntelligenceReport;
  } catch (err) {
    // Strip markdown code fences if present
    const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleaned) as CallIntelligenceReport;
  }
}
