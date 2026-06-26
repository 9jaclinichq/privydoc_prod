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

    const systemPrompt = `You are a clinical safety auditor and assistant for PrivyDoc, a men's telemedicine platform.
Your task is to review a patient's medical intake form and provide a JSON response containing:
1. "summary": A professional, concise 2-3 sentence clinical summary/brief for the reviewing doctor. Mention key demographics, condition duration, and any notable answers.
2. "red_flag": A boolean (true or false). Set to true if the patient has any severe cardiovascular contraindications, active chest pain, heart disease (angina, previous heart attack, stroke), severe uncontrolled palpitations, or other symptoms that make online remote prescribing of vasoactive therapies (like PDE5 inhibitors for Erectile Dysfunction) highly unsafe.

You MUST respond with a valid, parseable JSON object ONLY, in this exact format:
{
  "summary": "Patient is a 34-year-old reporting Erectile Dysfunction of 3-6 months. No cardiovascular contraindications reported.",
  "red_flag": false
}

Do not include any greeting, explanation, markdown blocks, or other text outside the JSON object. Just the JSON object.`;

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

    return json({
      summary: parsed.summary || "Clinical details submitted. Please review answers manually.",
      red_flag: !!parsed.red_flag,
      ok: true
    });

  } catch (e) {
    console.error("ai-summary error:", String(e));
    return json({ error: String(e) }, 500);
  }
});
