// PrivyDoc Clinical Templates System
// Covers 4 built-in categories (Initial, Day 2, Day 5, Review) + Custom templates
// Filters templates dynamically by clinical stage and condition.

export interface ResponseTemplate {
  id: string;
  doctor_id?: string;
  title: string;
  content: string;
  condition: string; // "Erectile Dysfunction" | "Premature Ejaculation" | "STI" | "Low Sexual Desire" | "General Health Check-up" | "All"
  stage: "initial" | "day2" | "day5" | "review";
  is_custom?: boolean;
}

// 1. Initial Clinical Templates (BUILTIN_TEMPLATES)
export const BUILTIN_TEMPLATES: ResponseTemplate[] = [
  {
    id: "builtin_ed_sildenafil",
    title: "Sildenafil (Viagra) Standard Protocol",
    condition: "Erectile Dysfunction",
    stage: "initial",
    content: `CLINICAL ASSESSMENT
Based on your clinical intake questionnaire, you present with mild-to-moderate Erectile Dysfunction (ED). You report no history of angina, uncontrolled hypertension, or recent cardiac events. Your resting exercise tolerance is fully intact, and you are not taking organic nitrates. Sildenafil therapy is clinically indicated and appropriate.

WHY I THINK THIS
- You report a consistent difficulty in maintaining rigid erections suitable for intercourse.
- Absence of cardiovascular contraindications or nitro-compound medications makes vasoactive therapy safe for your profile.

PERSONALISED ACTION PLAN
- Recommended: Sildenafil (Viagra) 50mg Tablets.
- Instructions: Take [DOSAGE_INSTRUCTION] orally on an empty stomach approximately [TIMING] before scheduled intimate activity.
- Maximum dosing frequency: 1 tablet per 24 hours.
- Lifestyle: Reduce processed sugars, maintain regular cardiovascular exercise (30 mins daily), and avoid heavy alcohol intake near dosing.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Initial evaluation and setup of digital record.
- □ Day 2: Early compliance check-in via secure chat to review initial response and tolerability.
- □ Day 5: Care closing sign-off and safety audit.

[SPECIFIC REQUEST]
Please confirm if you have ever had high or low blood pressure during physical activity.`
  },
  {
    id: "builtin_ed_tadalafil",
    title: "Tadalafil (Cialis) Daily Protocol",
    condition: "Erectile Dysfunction",
    stage: "initial",
    content: `CLINICAL ASSESSMENT
Your intake assessment indicates symptoms consistent with Erectile Dysfunction (ED). For patients seeking stable, continuous coverage without the need for pre-activity planning, a daily low-dose Tadalafil protocol is highly effective. You have no cardiac safety contraindications.

WHY I THINK THIS
- Frequent intimate activity and a desire for spontaneous response are best suited to the long half-life of Tadalafil.
- Safety sweeps confirm no active chest pain or nitrate medication co-administration.

PERSONALISED ACTION PLAN
- Recommended: Tadalafil (Cialis) 5mg Tablets.
- Instructions: Take 1 tablet orally [TIMING_OF_DAY] at the same time each day, regardless of scheduled intimate activity.
- Do not double doses. Allow [DAYS_FOR_STABLE_STATE] days of continuous daily intake for stable systemic levels.
- Lifestyle: Gentle pelvic floor (Kegel) exercises and stress reduction.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Program activation.
- □ Day 2: Tolerability and timing review.
- □ Day 5: Closing care plan and safety audit.

[SPECIFIC REQUEST]
Let me know if you are currently using any alpha-blockers or blood pressure medications.`
  },
  {
    id: "builtin_pe_dapoxetine",
    title: "Dapoxetine (Priligy) On-Demand Protocol",
    condition: "Premature Ejaculation",
    stage: "initial",
    content: `CLINICAL ASSESSMENT
Based on your intake, you meet the clinical criteria for Premature Ejaculation (PE) with a shortened intravaginal ejaculatory latency time. You do not report any history of mania, severe depression, or active cardiac conditions. Short-acting SSRI therapy with Dapoxetine is indicated.

WHY I THINK THIS
- Stated onset of ejaculation occurs in less than [MINUTES] minutes from penetration, creating mild performance anxiety.
- No history of syncopal episodes or hepatic impairment reported during screening.

PERSONALISED ACTION PLAN
- Recommended: Dapoxetine (Priligy) 30mg Tablets.
- Instructions: Take 1 tablet orally with a full glass of water [TIMING] hours prior to expected activity.
- Limit intake to a maximum of 1 tablet in any 24-hour period.
- Avoid co-administration with active alcohol or other serotonergic agents.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Treatment initiated.
- □ Day 2: Initial safety check-in.
- □ Day 5: Closing review of therapeutic response.

[SPECIFIC REQUEST]
Please confirm if you have ever experienced dizziness, lightheadedness, or fainting when standing up quickly.`
  },
  {
    id: "builtin_sti_dual_therapy",
    title: "Broad Spectrum STI Protocol",
    condition: "Sexually Transmitted Infections",
    stage: "initial",
    content: `CLINICAL ASSESSMENT
Your questionnaire indicates active genital or urinary symptoms highly suggestive of an uncomplicated Sexually Transmitted Infection (STI) / urethritis. Empirical dual-antibiotic therapy targeting Chlamydia and Gonorrhoea is clinically indicated to prevent ascending pelvic tract complications.

WHY I THINK THIS
- Stated symptoms of [SYMPTOMS_LIST] with [DURATION] duration match typical bacterial urethritis presentation.
- No reported history of severe antibiotic allergies (penicillins/macrolides).

PERSONALISED ACTION PLAN
- Recommended: Azithromycin 1g (single dose) combined with Cefixime 400mg (single dose) as directed.
- Partner Management: It is absolutely mandatory that all recent sexual partners receive simultaneous treatment to prevent re-infection.
- Abstain from all sexual activity for [ABSTINENCE_DAYS] days following completion of therapy.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Script authorized.
- □ Day 2: Symptoms tracking check-in.
- □ Day 5: Complete safety resolution and test of cure plan.

[SPECIFIC REQUEST]
Please confirm that you have no allergies to Macrolide antibiotics or Cephalosporins.`
  },
  {
    id: "builtin_lsd_testosterone_support",
    title: "Low Desire / Testosterone Optimization Protocol",
    condition: "Low Sexual Desire",
    stage: "initial",
    content: `CLINICAL ASSESSMENT
Your clinical questionnaire outlines symptoms of Hypoactive Sexual Desire Disorder (HSDD) / Low Sexual Desire. Screening indicates a gradual reduction in libido accompanied by mild fatigue. A dual-action lifestyle and metabolic support protocol is indicated.

WHY I THINK THIS
- Reported drop in subjective desire and energy with no history of severe cardiovascular blockages or untreated prostate disease.

PERSONALISED ACTION PLAN
- Recommended: [SUPPLEMENT_OR_DRUG] daily.
- Lifestyle adjustments: Aim for [SLEEP_HOURS] hours of sleep, increase zinc-rich foods, and engage in progressive resistance strength training.
- Check baseline early-morning Serum Free Testosterone levels at a local accredited laboratory.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Initial diagnostic support plan.
- □ Day 2: Adaptability check-in.
- □ Day 5: Final support closure and lab evaluation review.

[SPECIFIC REQUEST]
Let me know if you have a recent prostate-specific antigen (PSA) test result.`
  },
  {
    id: "builtin_ghc_wellness",
    title: "General Health Check-up Protocol",
    condition: "General Health Check-up",
    stage: "initial",
    content: `CLINICAL ASSESSMENT
Your digital intake indicates a request for a comprehensive preventative General Health Check-Up. Given your age of [PATIENT_AGE] and reported lifestyle factors, we have structured a baseline panel of screening investigations and preventative metabolic guidelines to optimize your health.

WHY I THINK THIS
- Preventative diagnostic review is highly recommended for males over [AGE_THRESHOLD] to detect early cardiovascular, renal, or metabolic shifts.

PERSONALISED ACTION PLAN
- Recommended Diagnostics: Fasting Lipid Panel, HbA1c, Full Blood Count, and Urinalysis.
- Check baseline blood pressure twice over the next [BP_DAYS] days and record the average.
- Lifestyle: Increase fiber intake, reduce sodium below [SODIUM_LIMIT]mg/day, and aim for 150 minutes of moderate-intensity exercise weekly.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Panel setup and baseline coaching.
- □ Day 2: Panel confirmation check-in.
- □ Day 5: closing care plan review.

[SPECIFIC REQUEST]
Please share if you have a family history of premature heart disease, diabetes, or stroke.`
  }
];

// 2. Day 2 Follow-Up Templates (DAY2_TEMPLATES)
export const DAY2_TEMPLATES: ResponseTemplate[] = [
  {
    id: "builtin_day2_ed_tolerability",
    title: "ED Day 2 Tolerability Check",
    condition: "Erectile Dysfunction",
    stage: "day2",
    content: `CLINICAL ASSESSMENT
This is your scheduled Day 2 clinical check-in. Having started your vasoactive protocol, we must review your initial therapeutic response, assess for any mild side effects, and verify safety profile compliance.

WHY I THINK THIS
- Early-stage monitoring ensures dosage suitability and rules out headaches, nasal congestion, or flushing before full program progression.

PERSONALISED ACTION PLAN
- Monitor for headache, facial flushing, or mild dyspepsia (indigestion).
- Ensure medication is taken strictly as instructed: empty stomach for Sildenafil; consistent daily timing for Tadalafil.
- Maintain hydration with at least [WATER_GLASSES] glasses of water around dosing.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Day 2 check-in completed.
- □ Day 5: Program closure, safety sign-off, and prescription extension audit.

[SPECIFIC REQUEST]
Have you taken your first dose yet, and if so, did you experience any mild flushing, headache, or other sensations?`
  },
  {
    id: "builtin_day2_pe_latency",
    title: "PE Day 2 Latency & Safety Review",
    condition: "Premature Ejaculation",
    stage: "day2",
    content: `CLINICAL ASSESSMENT
We are conducting your mandatory Day 2 clinical follow-up for your Premature Ejaculation protocol. Our immediate goal is to track response latency, assess any initial dizziness, and ensure you are taking the dose with sufficient water.

WHY I THINK THIS
- Short-acting SSRIs require early monitoring to verify that orthostatic safety parameters are preserved and that syncopal symptoms are completely absent.

PERSONALISED ACTION PLAN
- Ensure you always take Dapoxetine with a full [VOLUME] glass of water to reduce lightheadedness.
- Do not combine with alcohol under any circumstances during this phase.
- Incorporate sensory focus exercises and [EXERCISE_TYPE] techniques to assist latency control.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Day 2 latency parameters recorded.
- □ Day 5: Closure review and future program extension.

[SPECIFIC REQUEST]
How are you feeling after taking your dose? Did you notice any lightheadedness, nausea, or sweating?`
  },
  {
    id: "builtin_day2_sti_adherence",
    title: "STI Day 2 Adherence & Symptom Monitor",
    condition: "Sexually Transmitted Infections",
    stage: "day2",
    content: `CLINICAL ASSESSMENT
Your Day 2 clinical check-in is now active. We must verify complete adherence to your dual-antibiotic prescription and monitor for initial symptom resolution or any gastrointestinal sensitivity.

WHY I THINK THIS
- Completing the full course of antibiotics and maintaining strict sexual abstinence are critical to prevent drug resistance and re-infection.

PERSONALISED ACTION PLAN
- Complete [ALL_MEDICATIONS] as directed, even if symptoms have entirely resolved today.
- Abstain fully from all intimate contact. Ensure your partner is undergoing concurrent treatment.
- Support gut flora with probiotics or yoghurt [HOURS] hours after your dose.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Day 2 adherence checked.
- □ Day 5: Clinical clearing audit and follow-up advice.

[SPECIFIC REQUEST]
Have you or your partner experienced any severe stomach upset or diarrhea since commencing the antibiotic protocol?`
  }
];

// 3. Day 5 Closure Templates (DAY5_TEMPLATES)
export const DAY5_TEMPLATES: ResponseTemplate[] = [
  {
    id: "builtin_day5_ed_closure",
    title: "ED Day 5 Success & Maintenance Plan",
    condition: "Erectile Dysfunction",
    stage: "day5",
    content: `CLINICAL ASSESSMENT
We have reached Day 5 of your clinical care program. Based on your Day 2 feedback and initial tolerance, your vasoactive protocol is successfully authorized for ongoing maintenance. Your digital file is certified complete.

WHY I THINK THIS
- Normal tolerability and positive therapeutic response confirm that the current dosage is appropriate and safe for chronic maintenance.

PERSONALISED ACTION PLAN
- Maintenance plan: Continue your current prescription protocol as outlined on-demand or daily.
- Schedule a physical check-up with a local physician every [MONTHS] months to monitor resting blood pressure and metabolic markers.
- Download your official e-prescription and clinical notes from the Reports tab for your records.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Day 5 program closure. Case file is officially marked COMPLETED.
- □ Future: You can initiate a Review Consultation in [WEEKS] weeks if a dosage adjustment or refill is needed.

[SPECIFIC REQUEST]
Please rate your overall response to the treatment on a scale from 1 (poor) to 5 (excellent).`
  },
  {
    id: "builtin_day5_pe_closure",
    title: "PE Day 5 Efficacy & Care Sign-off",
    condition: "Premature Ejaculation",
    stage: "day5",
    content: `CLINICAL ASSESSMENT
This is your Day 5 care closure and safety sign-off. Your Premature Ejaculation treatment cycle is complete, demonstrating good clinical tolerance and improved performance latency.

WHY I THINK THIS
- Negative screens for side effects and positive feedback on control parameters indicate the short-acting SSRI protocol is highly compatible with your profile.

PERSONALISED ACTION PLAN
- Recommended maintenance: Continue Dapoxetine 30mg strictly on-demand.
- Pair treatment with progressive start-stop exercises.
- Keep a digital log of your control times to track long-term neuro-chemical adaptation.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Day 5 clinical sign-off. Consultation closed.
- □ Future: File remains open for reviews or repeat prescription refills.

[SPECIFIC REQUEST]
Let me know if you would like us to issue a long-term maintenance prescription in your reports.`
  },
  {
    id: "builtin_day5_sti_clearance",
    title: "STI Day 5 Resolution & Test of Cure",
    condition: "Sexually Transmitted Infections",
    stage: "day5",
    content: `CLINICAL ASSESSMENT
Your Day 5 clinical cycle is complete. Having completed your antibiotic dual therapy, we are finalizing your care and establishing your test-of-cure guidelines.

WHY I THINK THIS
- Complete antibiotic course adherence and clinical resolution of presenting symptoms indicate successful empirical clearing of the infection.

PERSONALISED ACTION PLAN
- Test of Cure: It is highly recommended to perform a repeat urethral swab or urine PCR test in [WEEKS] weeks to confirm complete bacterial eradication.
- Safe intimacy: Do not engage in unprotected sexual intercourse unless both you and your partner have confirmed negative test results.
- Practice consistent barrier contraception.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Day 5 STI protocol completed. File closed.
- □ Future: Contact our team if symptoms recur or partners test positive.

[SPECIFIC REQUEST]
Have all urinary symptoms (discharging, burning) completely cleared as of today?`
  }
];

// 4. Clinical Review Templates (REVIEW_TEMPLATES)
export const REVIEW_TEMPLATES: ResponseTemplate[] = [
  {
    id: "builtin_review_dosage_adj",
    title: "Vasoactive Dosage Adjustment",
    condition: "Erectile Dysfunction",
    stage: "review",
    content: `CLINICAL ASSESSMENT
We have reviewed your request for a therapeutic dosage adjustment of your Erectile Dysfunction protocol. Based on your reported response, we are safely adjusting your dosage to optimize efficacy while preserving safety.

WHY I THINK THIS
- Sub-optimal response at the initial dose without significant adverse events warrants a controlled, clinical dose titration.

PERSONALISED ACTION PLAN
- Adjusted Prescription: [DRUG_NAME] [ADJUSTED_DOSE] as directed.
- Continue taking strictly on an empty stomach with a full glass of water.
- Do not combine with any vasodilators, alcohol, or blood pressure compounds.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Dosage review and clinical adjustment authorized.
- □ Day 2: Tolerability and response verification.
- □ Day 5: Final maintenance seal.

[SPECIFIC REQUEST]
Please confirm that you have not experienced any dizziness or chest pressure during activity since starting this program.`
  },
  {
    id: "builtin_review_general",
    title: "Standard Clinical Review Resolution",
    condition: "General Health Check-up",
    stage: "review",
    content: `CLINICAL ASSESSMENT
This clinical review addresses your recent diagnostic laboratory results and lifestyle queries. We have synthesized your markers to update your active preventative plan.

WHY I THINK THIS
- Stated lab parameters of [LAB_MARKERS] fall within [STATUS] ranges, necessitating targeted metabolic support.

PERSONALISED ACTION PLAN
- Focus: Improve [TARGET_METABOLIC_MARKER] through directed dietary interventions.
- Supplementation: Introduce [SUPPLEMENT_OR_DRUG] daily for [DURATION].
- Schedule a re-test in [RETEST_MONTHS] months at an accredited diagnostic centre.

FOLLOW-UP PLAN (MANDATORY)
- ✓ today: Review session completed and documented.
- □ Future: Initiate a review consultation as lab reports or lifestyle changes arise.

[SPECIFIC REQUEST]
Would you like me to recommend specific local laboratories for your follow-up blood work?`
  }
];

// Helper to get custom templates saved by doctor in LocalStorage
export function getCustomTemplates(doctorId?: string): ResponseTemplate[] {
  try {
    const raw = localStorage.getItem("privydoc_response_templates");
    if (!raw) return [];
    const parsed: ResponseTemplate[] = JSON.parse(raw);
    if (doctorId) {
      return parsed.filter(t => t.doctor_id === doctorId);
    }
    return parsed;
  } catch (e) {
    console.error("Failed to load custom templates:", e);
    return [];
  }
}

// Helper to save a custom response template
export function saveCustomTemplate(template: Omit<ResponseTemplate, "id">): ResponseTemplate {
  const customTemplates = getCustomTemplates();
  const newTemplate: ResponseTemplate = {
    ...template,
    id: "custom_" + Math.random().toString(36).substr(2, 9),
    is_custom: true
  };
  customTemplates.push(newTemplate);
  localStorage.setItem("privydoc_response_templates", JSON.stringify(customTemplates));
  return newTemplate;
}

// Helper to delete a custom template
export function deleteCustomTemplate(id: string) {
  const customTemplates = getCustomTemplates();
  const filtered = customTemplates.filter(t => t.id !== id);
  localStorage.setItem("privydoc_response_templates", JSON.stringify(filtered));
}

// Main filtering logic used by the Doctor Picker
export function getTemplates(
  stage: "initial" | "day2" | "day5" | "review",
  condition: string,
  doctorId?: string
): ResponseTemplate[] {
  // Determine builtin collection based on stage
  let list: ResponseTemplate[] = [];
  if (stage === "initial") list = BUILTIN_TEMPLATES;
  else if (stage === "day2") list = DAY2_TEMPLATES;
  else if (stage === "day5") list = DAY5_TEMPLATES;
  else if (stage === "review") list = REVIEW_TEMPLATES;

  // Load custom templates for this doctor
  const customs = getCustomTemplates(doctorId).filter(t => t.stage === stage);

  const combined = [...list, ...customs];

  // Filter by condition
  // If the template has condition "All" or matches the selected case condition, include it.
  // We do a soft substring match or lowercase check to ensure compatibility.
  return combined.filter(t => {
    if (t.condition === "All") return true;
    const condLower = t.condition.toLowerCase();
    const targetLower = condition.toLowerCase();
    return condLower.includes(targetLower) || targetLower.includes(condLower);
  });
}

// Strict placeholder validation rule:
// 5+ uppercase bracket tokens block send except [SPECIFIC REQUEST] and [CONDITION].
// Example tokens: [DRUG_NAME], [DOSAGE], [PATIENT_NAME], [TIMING].
export function validateTemplatePlaceholders(text: string): {
  ok: boolean;
  count: number;
  tokens: string[];
  error?: string;
} {
  const regex = /\[[A-Z0-9_]+\]/g;
  const matches = text.match(regex) || [];
  
  // Filter out permitted tokens [SPECIFIC REQUEST] and [CONDITION]
  const forbiddenMatches = matches.filter(token => {
    return token !== "[SPECIFIC REQUEST]" && token !== "[CONDITION]";
  });

  const uniqueForbidden = Array.from(new Set(forbiddenMatches));

  if (forbiddenMatches.length >= 5) {
    return {
      ok: false,
      count: forbiddenMatches.length,
      tokens: uniqueForbidden,
      error: `Validation Blocked: Your response contains ${forbiddenMatches.length} unedited placeholder tokens (${uniqueForbidden.join(", ")}). You must replace these placeholders with real clinical directions before submitting.`
    };
  }

  return {
    ok: true,
    count: forbiddenMatches.length,
    tokens: uniqueForbidden
  };
}
