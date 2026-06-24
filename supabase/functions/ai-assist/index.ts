// ============================================================
// PRIVYDOC — AI ASSIST (Supabase Edge Function)
// Deploy as function name: ai-assist
// Returns a complete structured physician draft response
// for the doctor to edit and personalise before sending.
//
// HOW TO SET SECRETS IN SUPABASE:
// Run in your terminal:
// supabase secrets set CLAUDE_API_KEY=your_actual_anthropic_api_key
//
// HOW TO DEPLOY:
// Run in your terminal:
// supabase functions deploy ai-assist
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONDITION_NAMES: Record<string, string> = {
  ED: "Erectile Dysfunction",
  PE: "Premature Ejaculation",
  STI: "STI and Genital Symptoms",
  LSD: "Low Sex Drive / Low Libido",
  GHC: "General Health Check-Up",
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
    const { condition, form_data, draft_response, response_format } = body;

    const claudeKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeKey) {
      console.error("Missing CLAUDE_API_KEY in Deno environment.");
      return json({ 
        error: "CLAUDE_API_KEY is not configured on this Supabase project. Please set it using 'supabase secrets set CLAUDE_API_KEY=your_key'" 
      }, 500);
    }

    // Format form keys cleanly for the LLM
    const intakeFormatted = Object.entries(form_data || {})
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

    // ── BRANCH: Health Profile Summary ──────────────────────────
    if (response_format === "health_profile_summary") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system: `You are a health summariser for a men's telehealth app. Based on patient intake answers, write a 3–4 sentence plain-English health summary the patient can read about themselves. Do NOT give medical advice, diagnoses, or treatment recommendations. Tone: calm, factual, supportive. Write in second person ("You reported..."). Output plain text only — no headings, no bullet points.`,
          messages: [{
            role: "user",
            content: `Summarise this patient's health profile in 3–4 plain-English sentences:\n\n${intakeFormatted || "No intake data provided."}`,
          }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Anthropic API Error (${response.status}):`, errorText);
        return json({ error: `Anthropic API responded with ${response.status}: ${errorText}` }, response.status);
      }

      const data = await response.json();
      const summary = data.content?.[0]?.text || "";

      if (!summary) return json({ error: "No summary text returned by the model" }, 500);
      return json({ summary, ok: true });
    }

    // ── BRANCH: GHC Physician Draft ─────────────────────────────
    if (condition === "GHC") {
      const conditionName = CONDITION_NAMES["GHC"];

      const systemPrompt = `You are a clinical assistant helping a licensed Nigerian doctor on PrivyDoc, a men's health telemedicine platform.

The patient has requested a General Health Check-Up. Generate a complete physician draft response that the doctor will review, personalise, and sign off before sending.

RESPONSE FORMAT — Include only clinically relevant sections, in this order:

1. ASSESSMENT — Overall health picture. Lead with the most important finding. State working impressions clearly. Avoid unwarranted certainty.
2. KEY FINDINGS — Bullet-point summary of intake findings that drive the assessment. Reference specific patient answers (age, family history, lifestyle, screening gaps).
3. IMMEDIATE ACTIONS — What the patient must do now. Priority investigations, urgent lifestyle changes, medications if indicated. Format prominently.
4. INVESTIGATIONS — Full recommended list with one-line rationale per test. Format using separator lines. Tier by priority. Reference patient's stated budget preference.
5. LIFESTYLE ADVICE — Specific, individualised recommendations based on this patient's intake. No generic lists.
6. FOLLOW-UP PLAN — ✓ today, □ Day 2, □ Day 5.
7. DETAILED EXPLANATION — Full clinical reasoning. Why these findings matter for this specific patient. Conditions considered.
8. PATIENT EDUCATION — Relevant health information for this patient's age, risk profile, and presenting concerns.
9. ADDITIONAL CONTEXT — Nigerian lab/pharmacy context, cost tiers, red flags, emergency advice. Include only when clinically indicated.

RULE: Sections 1–6 must always appear first and be actionable on their own.

INVESTIGATION FORMAT:
──────────────────────────────
INVESTIGATIONS RECOMMENDED
[Test name] — [One sentence why]
──────────────────────────────

MEDICATION FORMAT (if prescribing):
──────────────────────────────
MEDICATION PRESCRIBED
[Drug name (Brand)] [Dose]
[Dosing instructions]
[Key safety information]
──────────────────────────────

SIGNATURE (always end with):
──────────────────────────────
PrivyDoc Medical Team
Reviewed by a licensed Nigerian doctor (MDCN registered)
privydoc.com.ng
──────────────────────────────

TONE RULES:
- Write as a consultant physician who owns this case
- Reference specific intake answers — family history, lifestyle, screening gaps, medications
- Nigerian context: mention lab availability and approximate cost tiers where relevant
- Use [EDIT: description] placeholders for sections requiring the doctor's clinical judgment
- Do NOT use generic AI-style language or health blog tone
- Investigation recommendations should be individualised — not a fixed package`;

      const userPrompt = `Generate a physician draft response for this GHC consultation.

CONDITION: ${conditionName}

PATIENT INTAKE ANSWERS:
${intakeFormatted || "No intake data provided."}

${draft_response ? `DOCTOR'S PARTIAL DRAFT (incorporate if useful):\n${draft_response}` : "No draft started yet."}

Generate the structured physician draft now. Follow the section order exactly: Assessment → Key Findings → Immediate Actions → Investigations → Lifestyle Advice → Follow-Up Plan → Detailed Explanation → Patient Education → Additional Context. Use [EDIT: ...] placeholders where the doctor needs to personalise. Actionable sections first.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 3000,
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
      const draft = data.content?.[0]?.text || "";

      if (!draft) return json({ error: "No draft text returned by the model" }, 500);
      return json({ draft, ok: true });
    }

    // ── DEFAULT BRANCH: Physician Draft (ED, PE, STI, LSD) ──────
    const conditionName = CONDITION_NAMES[condition] || condition || "men's health concern";

    const systemPrompt = `You are a clinical assistant helping a licensed Nigerian doctor on PrivyDoc, a men's health telemedicine platform.

Your task is to generate a complete physician draft response that the doctor will review, personalise, and sign off before sending to the patient.

RESPONSE FORMAT:
Generate an adaptive structured response using the sections below. Include ONLY sections that are clinically relevant. Do NOT include all sections every time.

SECTION ORDER — always follow this sequence (omit sections not clinically relevant):
1. ASSESSMENT — Working diagnosis in plain language. Lead with the most actionable conclusion. Avoid presenting uncertain diagnoses as facts.
2. KEY FINDINGS — Bullet-point summary of the clinical findings from the intake that drive your assessment. Reference specific patient answers.
3. IMMEDIATE ACTIONS — What the patient must do now. Medications, urgent tests, lifestyle changes that cannot wait. Format prominently.
4. INVESTIGATIONS — Tests requested, with one-line rationale per test. Format using separator lines.
5. LIFESTYLE ADVICE — Specific, individualised recommendations. No generic wellness lists.
6. FOLLOW-UP PLAN — Exactly what happens next: ✓ today, □ Day 2, □ Day 5.
7. DETAILED EXPLANATION — Clinical reasoning in full. Why you think this, what you considered, what you ruled out. Make the patient feel "a doctor actually reviewed my case."
8. PATIENT EDUCATION — Condition-specific information relevant to this patient's situation. Keep brief and specific.
9. ADDITIONAL CONTEXT — Nigerian pharmacy/lab context, cost tiers, red flags, emergency advice. Include only when clinically indicated.

RULE: Sections 1–6 must always appear first and be actionable on their own. A patient who reads only the first 6 sections should have everything they need to act.

MEDICATION FORMAT (when prescribing):
──────────────────────────────
MEDICATION PRESCRIBED
[Drug name (Brand name)] [Dose]
[Clear dosing instructions]
[Key safety information / contraindications]
──────────────────────────────

INVESTIGATION FORMAT (when requesting tests):
──────────────────────────────
[Test name] — [One sentence why this test is being requested]
──────────────────────────────

SIGNATURE (always end with):
──────────────────────────────
PrivyDoc Medical Team
Reviewed by a licensed Nigerian doctor (MDCN registered)
privydoc.com.ng
──────────────────────────────

TONE RULES:
- Write as a consultant physician who owns this case
- Do NOT use generic AI-style motivational language
- Do NOT sound like a health blog
- Do NOT use excessive empathy ("I understand how difficult this must be...")
- DO reference specific details from the patient's intake
- DO use Nigerian drug availability context (mention Nigerian pharmacies where relevant)
- Use [EDIT: description] placeholders for sections that require the doctor's specific clinical judgment
- The overall feel should be: "a specialist has reviewed this case and is monitoring it"`;

    const userPrompt = `Generate a physician draft response for this consultation.

CONDITION: ${conditionName}

PATIENT INTAKE ANSWERS:
${intakeFormatted || "No intake data provided."}

${draft_response ? `DOCTOR'S PARTIAL DRAFT (incorporate if useful):\n${draft_response}` : "No draft started yet."}

Generate the structured physician draft response now. Follow the section order exactly: Assessment → Key Findings → Immediate Actions → Investigations → Lifestyle Advice → Follow-Up Plan → Detailed Explanation → Patient Education → Additional Context. Use [EDIT: ...] placeholders where the doctor needs to personalise. Actionable sections first — demonstrate physician reasoning, not volume.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
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
    const draft = data.content?.[0]?.text || "";

    if (!draft) {
      return json({ error: "No draft text returned by the model" }, 500);
    }

    return json({ draft, ok: true });

  } catch (e) {
    console.error("ai-assist error:", String(e));
    return json({ error: String(e) }, 500);
  }
});
