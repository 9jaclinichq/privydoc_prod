import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Initialize Gemini SDK lazily to prevent startup crashes if key is missing
let aiInstance: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required for AI features but was not found in environment.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Simple in-memory rate limiter to prevent API abuse
const rateLimits: Record<string, { timestamps: number[] }> = {};
function rateLimiter(endpoint: string, limit: number, windowMs: number, message: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "anonymous";
    const key = `${endpoint}:${ip}`;
    const now = Date.now();

    if (!rateLimits[key]) {
      rateLimits[key] = { timestamps: [] };
    }

    // Filter out expired timestamps
    rateLimits[key].timestamps = rateLimits[key].timestamps.filter(t => now - t < windowMs);

    if (rateLimits[key].timestamps.length >= limit) {
      const oldest = rateLimits[key].timestamps[0];
      const timeLeft = Math.ceil((windowMs - (now - oldest)) / 1000);
      res.status(429).json({ error: `${message} Please try again in ${timeLeft} seconds.` });
      return;
    }

    rateLimits[key].timestamps.push(now);
    next();
  };
}

// API endpoint for AI Summary (Clinical brief & safety check)
app.post(
  "/api/ai-summary", 
  rateLimiter("aiSummary", 15, 3 * 60 * 1000, "Too many AI summaries requested. Please wait."), 
  async (req, res) => {
    try {
      const { condition, form_data } = req.body;
      if (!condition || !form_data) {
        res.status(400).json({ error: "Missing required fields: condition and form_data." });
        return;
      }

      const prompt = `
        You are an expert clinical consultant and safety advisor for PrivyDoc, a confidential men's health telemedicine platform in Nigeria.
        Analyze the following patient intake responses and draft a concise, structured Clinical Brief & Safety Assessment for the review doctor.

        PATIENT PRESENTING COMPLAINT: ${condition}
        DURATION: ${form_data.duration || "unspecified"}
        PATIENT AGE: ${form_data.age || "unspecified"}
        
        RAW ANSWERS:
        ${JSON.stringify(form_data.answers || [], null, 2)}

        Generate a highly professional, clinical summary with the following sections (use clear medical terminology):
        1. CLINICAL PRESENTATION SUMMARY: Summarize the primary concern, duration, and severity based on answers.
        2. SAFETY & CONTRAINDICATIONS: Evaluate answers for red flags, medications (especially nitrates or blood pressure pills), and cardiovascular risk factors.
        3. DIAGNOSTIC HYPOTHESES: Outline potential medical etiologies (e.g. psychogenic vs organic ED, primary vs secondary PE, etc.).
        4. CLINICAL DISCUSSION GUIDE: Suggest 2-3 specific, polite follow-up questions the reviewing doctor should ask the patient in the chat to refine their assessment.
      `;

      const response = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      res.json({ summary: response.text });
    } catch (error: any) {
      console.error("AI Summary generation failed:", error);
      res.status(500).json({ 
        error: "AI analysis unavailable.", 
        summary: `CLINICAL BRIEF (OFFLINE GENERATOR): Patient reports history of ${req.body.condition || "condition"} for ${req.body.form_data?.duration || "unspecified period"}. Age: ${req.body.form_data?.age || "unspecified"}. Verify raw questionnaires to rule out cardiac contraindications before issuing prescriptions.`
      });
    }
  }
);

// API endpoint for AI Assist (Help doctor write/draft clinical response)
app.post(
  "/api/ai-assist", 
  rateLimiter("aiAssist", 20, 3 * 60 * 1000, "Too many AI assist requests. Please wait."), 
  async (req, res) => {
    try {
      const { case_details, chat_history, prompt: userPrompt } = req.body;
      if (!case_details || !userPrompt) {
        res.status(400).json({ error: "Missing case details or prompt." });
        return;
      }

      const prompt = `
        You are an AI Clinical Assistant built for PrivyDoc, assisting licensed Nigerian clinicians in reviewing cases.
        Draft a clinically sound, polite, and reassuring response for the doctor to send to the patient.
        Ensure you speak as a professional medical doctor. Do not make definitive diagnoses before checking safety questions.
        
        CASE DETAILS:
        - Condition: ${case_details.condition}
        - Patient Age: ${case_details.patient_age}
        - Symptoms/Answers: ${JSON.stringify(case_details.symptoms || [])}
        - AI Summary: ${case_details.ai_summary || "None"}
        
        REASON FOR GENERATING DRAFT (DOCTOR'S INSTRUCTION):
        "${userPrompt}"

        CHAT HISTORY SO FAR:
        ${JSON.stringify(chat_history || [])}

        Return ONLY a draft message in a natural, caring, and professional medical tone. Do not include any intros or outros, just the message itself.
      `;

      const response = await getAI().models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      res.json({ draft: response.text });
    } catch (error: any) {
      console.error("AI Assist generation failed:", error);
      res.status(500).json({ error: "AI draft generation failed. Please compose manually." });
    }
  }
);

// Serve Static Assets & SPA Handling
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  const distPath = path.resolve(__dirname, "dist");
  app.use(express.static(distPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
} else {
  // Setup Vite development server middleware
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`PrivyDoc full-stack server running at http://localhost:${port}`);
});
