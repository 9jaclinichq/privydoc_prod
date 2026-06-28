// ============================================================
// PRIVYDOC — AI SUMMARY & SAFETY SWEEP (Supabase Edge Function)
// Deploy as function name: ai-summary
// Returns a concise clinical brief and safety check boolean
// ============================================================

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  function json(obj: unknown, status = 200) {
    return new Response(JSON.stringify(obj), {
      status, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { condition, form_data } = body;

    const claudeKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeKey) {
      console.error("Missing CLAUDE_API_KEY in Deno environment.");
      return json({ 
        error: "CLAUDE_API_KEY is not configured on this Supabase project. Please set it using 'supabase secrets set CLAUDE_API_KEY=your_key'" 
      }, 500);
    }

    // Format intake data cleanly for the LLM
    let intakeFormatted = "";
    if (form_data && form_data.answers && Array.isArray(form_data.answers)) {
      intakeFormatted = form_data.answers
        .map((ans: any) => `- ${ans.question || ans.id || "Question"}: ${ans.answer || "Not specified"}`)
        .join("\n");
    } else if (form_data && typeof form_data === "object") {
      intakeFormatted = Object.entries(form_data)
        .map(([k, v]) => {
          let valStr = "";
          if (Array.isArray(v)) {
            valStr = v.join(", ");
          } else if (v && typeof v === "object") {
            valStr = JSON.stringify(v);
          } else {
            valStr = String(v ?? "Not answered");
          }
          const label = k.replace(/_/g, " ");
          return `- ${label}: ${valStr}`;
        })
        .join("\n");
    }

    const systemPrompt = `You are an expert clinical decision 
support assistant for PrivyDoc, a confidential men's 
telemedicine platform in Nigeria.

Analyze the patient's complete intake responses and 
generate a structured clinical summary for the reviewing 
physician in this exact JSON format:

{
  "summary": "2-3 sentence clinical overview mentioning 
    age, condition, duration, key risk factors",
  "presenting_complaint": "One sentence description of 
    the main presenting complaint",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "risk_factors": ["risk 1", "risk 2"],
  "shim_score": null or { "score": number, "severity": 
    "Mild|Moderate|Severe|No ED" },
  "red_flag": false,
  "red_flag_reasons": [],
  "suggested_approach": "One paragraph of evidence-based 
    management suggestions for the doctor to consider. 
    Not a prescription. For doctor review only.",
  "differential_considerations": ["possible 1", 
    "possible 2"],
  "contraindication_alert": null or "specific warning"
}

Rules:
- red_flag true ONLY for: active chest pain, nitrate use 
  with ED, recent MI/stroke <6 months, priapism, 
  suicidal ideation, testicular torsion symptoms
- suggested_approach must end with: "All management 
  decisions remain with the reviewing clinician."
- Use Nigerian clinical context where relevant
- Never use patient-facing language — this is for 
  the doctor only
- Respond with valid JSON only, no markdown`;

    const userPrompt = `Condition: ${condition || "unspecified"}
Intake Answers:
${intakeFormatted || "None provided"}

Analyze the above intake and return the clinical brief and safety check boolean.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API Error (${response.status}):`, errorText);
      return json({ error: `Anthropic API responded with ${response.status}: ${errorText}` }, response.status);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse JSON safely
    let parsed;
    try {
      // Find JSON block if present, or parse raw
      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
      } else {
        parsed = JSON.parse(text);
      }
    } catch (e) {
      console.error("Failed to parse Claude JSON response for safety check:", text, e);
      parsed = {
        summary: "Error parsing clinical brief. Please review raw questionnaires manually.",
        red_flag: false
      };
    }

    let formattedSummary = "";
    if (parsed && typeof parsed === "object") {
      const parts: string[] = [];
      if (parsed.summary) {
        parts.push(`SUMMARY:\n${parsed.summary}`);
      }
      if (parsed.presenting_complaint) {
        parts.push(`PRESENTING COMPLAINT:\n${parsed.presenting_complaint}`);
      }
      if (parsed.key_findings && Array.isArray(parsed.key_findings) && parsed.key_findings.length > 0) {
        parts.push(`KEY FINDINGS:\n${parsed.key_findings.map((f: string) => `- ${f}`).join("\n")}`);
      }
      if (parsed.risk_factors && Array.isArray(parsed.risk_factors) && parsed.risk_factors.length > 0) {
        parts.push(`RISK FACTORS:\n${parsed.risk_factors.map((r: string) => `- ${r}`).join("\n")}`);
      }
      if (parsed.shim_score) {
        const shim = typeof parsed.shim_score === "object" && parsed.shim_score !== null
          ? `Score: ${parsed.shim_score.score}, Severity: ${parsed.shim_score.severity}`
          : String(parsed.shim_score);
        parts.push(`SHIM SCORE:\n${shim}`);
      }
      if (parsed.suggested_approach) {
        parts.push(`SUGGESTED CLINICAL APPROACH:\n${parsed.suggested_approach}`);
      }
      if (parsed.differential_considerations && Array.isArray(parsed.differential_considerations) && parsed.differential_considerations.length > 0) {
        parts.push(`DIFFERENTIAL CONSIDERATIONS:\n${parsed.differential_considerations.map((d: string) => `- ${d}`).join("\n")}`);
      }
      if (parsed.contraindication_alert) {
        parts.push(`⚠ CONTRAINDICATION ALERT:\n${parsed.contraindication_alert}`);
      }
      formattedSummary = parts.join("\n\n");
    }

    return json({
      summary: formattedSummary || parsed.summary || "Clinical details submitted. Please review answers manually.",
      red_flag: !!parsed.red_flag,
      ok: true
    });

  } catch (e) {
    console.error("ai-summary error:", String(e));
    return json({ error: String(e) }, 500);
  }
});
