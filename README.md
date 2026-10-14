# Real Estate Call Intelligence & Voice Analysis Platform

An evidence-first, zero-hallucination conversational intelligence platform for Indian real estate sales calls (Marathi, Hindi, and English codemix).

Built with Next.js 14, Tailwind CSS, Sarvam AI (`saaras:v4` STT & `sarvam-105b` LLM), Google Gemini 3.x Multimodal Fallback, and an embedded high-performance SQLite engine.

---

## Key Features

- **Traceable Evidence Grounding**: Every extracted claim, pricing mention, customer objection, and action item is bound to exact start/end timestamps and verbatim transcripts.
- **Synchronized Audio & Live Autoscroll**: Spotify-style lyrics autoscroll for live call playback. Click any dialogue or claim to instantly jump audio playback.
- **Sales Coaching & Behavioral Audit**: Qualitative evaluation of representative performance (strengths, neutral observations, improvement areas) and behavioral flags (*Arrogance, Misleading Information, Ignorance*) with 1-click **"Verify Proof"** audio playback.
- **Wrapping Evidence Tabs**: Dynamic claim counts per tab with clean wrapping and zero horizontal scrollbar overflow.
- **Resilient AI Pipeline**: Primary Indic LLM via Sarvam 105B with cascading fallback to Google Gemini 3.x models (`gemini-3.8-flash` / `gemini-3.1-flash-lite`) and multimodal audio transcription fallback.
- **Embedded SQLite Engine**: Zero network latency, WAL mode persistence with instant sub-millisecond writes.

---

## Tech Stack

- **Framework**: Next.js 14 / React 19 / TypeScript
- **Styling**: Tailwind CSS & Lucide Icons
- **Speech-to-Text (STT)**: Sarvam AI Batch STT (`saaras:v4` with native diarization & custom keyterms)
- **Primary LLM**: Sarvam AI (`sarvam-105b-conversations`)
- **Fallback LLM & Multimodal Audio**: Google Gemini 3.x (`gemini-3.8-flash` & `gemini-3.1-flash-lite`)
- **Database**: Local SQLite via `better-sqlite3` in WAL mode

---

## Getting Started

### 1. Prerequisites
- Node.js >= 18.18.0 or 20.x
- npm or pnpm

### 2. Environment Variables
Copy `.env.example` to `.env` and supply your API keys:
```bash
cp .env.example .env
```

```env
SARVAM_API_KEY=your_sarvam_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=file:./data/sales_call.db
```

### 3. Installation
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## License
ISC
