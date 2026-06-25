import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(cors());
app.use(express.json());

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

// API endpoint for AI Summary (Proxy to Supabase Edge Function: ai-summary)
app.post(
  "/api/ai-summary", 
  rateLimiter("aiSummary", 15, 3 * 60 * 1000, "Too many AI summaries requested. Please wait."), 
  async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          condition: req.body.condition,
          form_data: req.body.form_data
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase Edge Function responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      res.json({ summary: data.summary, red_flag: data.red_flag });
    } catch (error: any) {
      console.error("AI Summary Proxy failed:", error);
      res.status(500).json({ 
        error: "AI analysis summary offline.",
        summary: `CLINICAL BRIEF (LOCAL FALLBACK): Patient reports history of ${req.body.condition || "condition"} for ${req.body.form_data?.duration || "unspecified period"}. Age: ${req.body.form_data?.age || "unspecified"}. Verify raw questionnaires to rule out cardiac contraindications before issuing prescriptions.`
      });
    }
  }
);

// API endpoint for AI Assist (Proxy to Supabase Edge Function: ai-assist)
app.post(
  "/api/ai-assist", 
  rateLimiter("aiAssist", 20, 3 * 60 * 1000, "Too many AI assist requests. Please wait."), 
  async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

      // Translate local Express payload to match the Supabase Edge Function's expected schema
      const { case_details, prompt: draftPrompt } = req.body;

      const response = await fetch(`${supabaseUrl}/functions/v1/ai-assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          condition: case_details?.condition || "GHC",
          form_data: case_details?.symptoms || {},
          draft_response: draftPrompt || ""
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase Edge Function responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      res.json({ draft: data.draft });
    } catch (error: any) {
      console.error("AI Assist Proxy failed:", error);
      res.status(500).json({ error: "Draft generation failed. Please draft manually." });
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

app.listen(port, "0.0.0.0", () => {
  console.log(`PrivyDoc full-stack server running at http://0.0.0.0:${port}`);
});
