import { INTAKE_QUESTIONS_BANK, IntakeQuestion } from "../data/intakeQuestions";

/**
 * Returns Phase 1 questions for a track in the correct clinical order:
 * universal demographics → track presenting → track history → universal lifestyle → track cardiovascular/safety
 *
 * Excludes branch targets (which are inserted dynamically based on answers).
 */
export function getPhase1Questions(track: string): IntakeQuestion[] {
  // Identify all branch targets globally to exclude them from the base list
  const branchTargetIds = new Set<string>();
  for (const q of INTAKE_QUESTIONS_BANK) {
    if (q.branches) {
      for (const branch of q.branches) {
        for (const showId of branch.showQuestions) {
          branchTargetIds.add(showId);
        }
      }
    }
  }

  // Helper to filter base questions (excluding branch targets)
  const getBaseQuestions = (filterFn: (q: IntakeQuestion) => boolean) => {
    return INTAKE_QUESTIONS_BANK.filter(
      (q) => filterFn(q) && !branchTargetIds.has(q.id)
    );
  };

  // 1. Universal Demographics (track: ALL, phase: 1, category: demographics)
  const demographics = getBaseQuestions(
    (q) => q.track === "ALL" && q.phase === 1 && q.category === "demographics"
  );

  // 2. Track Presenting (track: current, phase: 1, category: presenting)
  const trackPresenting = getBaseQuestions(
    (q) => q.track === track && q.phase === 1 && q.category === "presenting"
  );

  // 3. Track History / Universal History (phase: 1, category: history)
  const history = getBaseQuestions(
    (q) =>
      (q.track === track || q.track === "ALL") &&
      q.phase === 1 &&
      q.category === "history"
  );

  // 4. Universal Lifestyle (track: ALL, phase: 1, category: lifestyle)
  const lifestyle = getBaseQuestions(
    (q) => q.track === "ALL" && q.phase === 1 && q.category === "lifestyle"
  );

  // 5. Track Cardiovascular/Safety (track: current, phase: 1, category: cardiovascular | safety)
  const safety = getBaseQuestions(
    (q) =>
      q.track === track &&
      q.phase === 1 &&
      (q.category === "cardiovascular" || q.category === "safety")
  );

  return [...demographics, ...trackPresenting, ...history, ...lifestyle, ...safety];
}

/**
 * Returns Phase 2 questions for a track:
 * track history, lifestyle, partner, safety → consent block last.
 *
 * Excludes branch targets.
 */
export function getPhase2Questions(track: string): IntakeQuestion[] {
  const branchTargetIds = new Set<string>();
  for (const q of INTAKE_QUESTIONS_BANK) {
    if (q.branches) {
      for (const branch of q.branches) {
        for (const showId of branch.showQuestions) {
          branchTargetIds.add(showId);
        }
      }
    }
  }

  const getBaseQuestions = (filterFn: (q: IntakeQuestion) => boolean) => {
    return INTAKE_QUESTIONS_BANK.filter(
      (q) => filterFn(q) && !branchTargetIds.has(q.id)
    );
  };

  // Track specific Phase 2 questions
  const trackPhase2 = getBaseQuestions(
    (q) => q.track === track && q.phase === 2 && q.category !== "consent"
  );

  // Consent Block (track: ALL, phase: 2, category: consent)
  const consent = getBaseQuestions(
    (q) => q.track === "ALL" && q.phase === 2 && q.category === "consent"
  );

  return [...trackPhase2, ...consent];
}

/**
 * Expands a list of base questions with dynamically unlocked branch questions,
 * placed immediately following their triggering question. Supports nested branches.
 */
export function getBranchedQuestions(
  baseQuestions: IntakeQuestion[],
  answers: Record<string, any>
): IntakeQuestion[] {
  const result: IntakeQuestion[] = [];
  const processed = new Set<string>();

  const isMatch = (ansValue: any, target: string | string[]): boolean => {
    if (ansValue === undefined || ansValue === null) return false;
    const valStr = String(ansValue).toLowerCase();

    if (Array.isArray(target)) {
      const targetLower = target.map((t) => String(t).toLowerCase());
      if (Array.isArray(ansValue)) {
        return ansValue.some((v) => targetLower.includes(String(v).toLowerCase()));
      }
      return targetLower.includes(valStr);
    }

    if (Array.isArray(ansValue)) {
      return ansValue.map((v) => String(v).toLowerCase()).includes(String(target).toLowerCase());
    }

    // Direct mapping match or true/yes false/no
    const targetStr = String(target).toLowerCase();
    if (targetStr === "true" && (valStr === "yes" || valStr === "true")) return true;
    if (targetStr === "false" && (valStr === "no" || valStr === "false")) return true;

    return valStr === targetStr;
  };

  const traverse = (q: IntakeQuestion) => {
    if (processed.has(q.id)) return;
    result.push(q);
    processed.add(q.id);

    if (q.branches) {
      const qAnswer = answers[q.id];
      for (const branch of q.branches) {
        if (isMatch(qAnswer, branch.ifAnswer)) {
          for (const targetId of branch.showQuestions) {
            const targetQ = INTAKE_QUESTIONS_BANK.find((bankQ) => bankQ.id === targetId);
            if (targetQ) {
              traverse(targetQ);
            }
          }
        }
      }
    }
  };

  for (const q of baseQuestions) {
    traverse(q);
  }

  return result;
}

/**
 * Sums the IIEF-5 (SHIM) scores for erectile dysfunction assessment.
 */
export function calculateShimScore(
  answers: Record<string, any>
): { score: number; severity: string } {
  const shimQuestions = ["q_shim1", "q_shim2", "q_shim3", "q_shim4", "q_shim5"];
  let score = 0;
  let answeredCount = 0;

  for (const qId of shimQuestions) {
    const ans = answers[qId];
    if (ans !== undefined && ans !== null) {
      const question = INTAKE_QUESTIONS_BANK.find((q) => q.id === qId);
      if (question && question.iifScore && question.iifScore.value) {
        const val = question.iifScore.value[String(ans)];
        if (val !== undefined) {
          score += val;
          answeredCount++;
        }
      }
    }
  }

  if (answeredCount === 0) {
    return { score: 0, severity: "No Assessment" };
  }

  let severity = "No ED";
  if (score >= 22 && score <= 25) severity = "No ED";
  else if (score >= 17 && score <= 21) severity = "Mild";
  else if (score >= 12 && score <= 16) severity = "Mild-to-Moderate";
  else if (score >= 8 && score <= 11) severity = "Moderate";
  else if (score >= 5 && score <= 7) severity = "Severe";

  return { score, severity };
}

/**
 * Checks answered questions against red flag triggers.
 */
export function detectRedFlags(
  answers: Record<string, any>,
  questions: IntakeQuestion[]
): { triggered: boolean; messages: string[] } {
  const messages: string[] = [];

  for (const q of questions) {
    const ans = answers[q.id];
    if (ans !== undefined && ans !== null && q.redFlag) {
      const valStr = String(ans).toLowerCase();
      const triggerMatches = q.redFlag.triggerValues.some((tv) => {
        const tvStr = String(tv).toLowerCase();
        if (tvStr === "true" && (valStr === "yes" || valStr === "true")) return true;
        if (tvStr === "false" && (valStr === "no" || valStr === "false")) return true;
        return valStr === tvStr;
      });

      if (triggerMatches) {
        messages.push(q.redFlag.message);
      }
    }
  }

  return {
    triggered: messages.length > 0,
    messages
  };
}

/**
 * Compiles a rich clinical pre-payment summary based on Phase 1 answers.
 */
export function getPhase1Summary(
  track: string,
  answers: Record<string, any>,
  shimScore?: { score: number; severity: string }
): { severityLabel: string; factors: string[]; cta: string } {
  const factors: string[] = [];
  let severityLabel = "";
  let cta = "";

  // Helper to safely check multi-select answers
  const hasHistory = (condition: string): boolean => {
    const pmhx = answers["q_pmhx"];
    if (Array.isArray(pmhx)) {
      return pmhx.some((c) => String(c).toLowerCase() === condition.toLowerCase());
    }
    if (typeof pmhx === "string") {
      return pmhx.toLowerCase().includes(condition.toLowerCase());
    }
    return false;
  };

  // Gather generic health factors
  if (hasHistory("Diabetes")) {
    factors.push("Diabetes can affect blood flow and nerve function linked to erections");
  }
  if (hasHistory("High blood pressure") || hasHistory("Heart disease")) {
    factors.push("High blood pressure or heart disease can reduce blood flow needed for erections");
  }
  if (hasHistory("Depression/anxiety")) {
    factors.push("Low mood and anxiety can affect the nerve signals needed for physical arousal");
  }
  if (String(answers["q_smoke"]).includes("Yes")) {
    factors.push("Smoking reduces blood flow throughout the body including to sexual organs");
  }
  if (String(answers["q_alcohol"]).match(/(Daily|Several times)/i)) {
    factors.push("Heavy alcohol use affects the nervous system and sexual function");
  }
  if (Number(answers["q_stress"]) > 6) {
    factors.push("High stress levels can significantly impact sexual function and energy");
  }
  if (answers["q_exercise"] === "Not active at all") {
    factors.push("A sedentary lifestyle can reduce stamina and affect overall blood flow");
  }

  switch (track) {
    case "ED": {
      const sev = shimScore?.severity || "Moderate";
      severityLabel = `${sev} Erectile Dysfunction`;

      // Specific factors
      const dur = answers["q_ed_duration"] || "Not specified";
      factors.push(`You have been experiencing erection difficulties for ${dur.toLowerCase()}`);

      const morning = answers["q_ed_morning"];
      if (morning === "Rarely" || morning === "Never") {
        factors.push("Absent morning erections suggests a physical cause rather than purely psychological");
      } else if (morning === "Yes regularly") {
        factors.push("Morning erections still present suggests stress or anxiety may be the main factor");
      }

      if (answers["q_ed_onset"] === "Suddenly") {
        factors.push("Sudden onset of erection issues is often linked to performance anxiety or sudden stress");
      }

      cta = "Based on what you have shared, there are clear, treatable factors behind what you are experiencing. Our doctors specialise in exactly this. Complete payment to get your personalised treatment plan reviewed within 24 hours — completely confidential.";
      break;
    }

    case "PE": {
      const latency = answers["q_pe_ielt"];
      const control = answers["q_pe_control"];

      let sev = "Moderate";
      if (latency === "Under 30 seconds" || latency === "30 seconds to 1 minute") {
        sev = "Severe";
      } else if (latency === "1-2 minutes") {
        sev = "Moderate";
      } else {
        sev = "Mild";
      }

      severityLabel = `${sev} Premature Ejaculation`;

      const duration = answers["q_pe_duration"];
      if (duration === "Always been this way") {
        factors.push("This has been your natural pattern since you became sexually active");
      } else {
        factors.push("This developed at some point after a period of normal ejaculatory control");
      }

      if (control === "No control at all" || control === "Very little control") {
        factors.push("You have very little control over the timing of ejaculation");
      }

      if (String(answers["q_pe_ed_coexist"]) === "true" || String(answers["q_pe_ed_coexist"]) === "Yes") {
        factors.push("Erection difficulties alongside early ejaculation often need to be treated together");
      }

      cta = "Premature ejaculation is one of the most common and most treatable men's health concerns. You do not have to manage this alone. Pay to connect with your doctor and get a plan that works for you.";
      break;
    }

    case "STI": {
      const symptoms = answers["q_sti_symptoms"];
      const hasSymptoms = Array.isArray(symptoms)
        ? symptoms.some((s) => s !== "None of the above")
        : typeof symptoms === "string" && symptoms !== "None of the above" && symptoms !== "";

      severityLabel = hasSymptoms ? "Symptomatic Genitourinary Profile" : "Preventive STI Screening Profile";

      if (String(answers["q_sti_exposure"]) === "true" || String(answers["q_sti_exposure"]) === "Yes") {
        factors.push("You have had unprotected sex recently which increases STI risk");
      }
      if (String(answers["q_sti_partner_symptoms"]) === "true" || String(answers["q_sti_partner_symptoms"]) === "Yes") {
        factors.push("A partner with symptoms or a known STI significantly increases your risk");
      }

      const count = answers["q_sti_partners"];
      if (count && count !== "None" && count !== "1") {
        factors.push(`Having multiple sexual partners (${count}) increases the risk of STI exposure`);
      }

      cta = "Getting checked is the responsible thing to do and the sooner the better. Complete payment to get expert guidance, testing recommendations and treatment if needed — all handled with complete discretion.";
      break;
    }

    case "LSD": {
      const severityScore = Number(answers["q_lsd_severity"]) || 5;
      let sev = "Moderate";
      if (severityScore <= 3) sev = "Severe";
      else if (severityScore <= 6) sev = "Moderate";
      else sev = "Mild";

      severityLabel = `${sev} Loss of Libido / Sex Drive`;

      if (answers["q_lsd_onset"] === "Gradual") {
        factors.push("A gradual decline in sex drive often points to long-term physical or hormonal changes");
      }

      const mood = answers["q_lsd_mood"];
      if (mood === "Noticeably low/sad" || mood === "Very low/depressed") {
        factors.push("Low mood and depression commonly reduce sex drive");
      }

      if (String(answers["q_lsd_ed_coexist"]) === "true" || String(answers["q_lsd_ed_coexist"]) === "Yes") {
        factors.push("Erection difficulties and low desire often occur together and reinforce each other");
      }

      cta = "Low sex drive is more common than most men admit and there are real, effective solutions. Pay to have a doctor review your full picture and recommend a personalised approach.";
      break;
    }

    case "GHC": {
      severityLabel = "Comprehensive Wellness & Prevention Check";
      factors.push("Proactive attitude towards managing your physical health");

      const reason = answers["q_ghc_reason"];
      if (Array.isArray(reason)) {
        factors.push(`Your focus areas for this health check are: ${reason.join(", ")}`);
      }

      cta = "Taking charge of your health before problems arise is one of the smartest things you can do. Complete payment to get your personalised men's health assessment reviewed by a certified doctor.";
      break;
    }

    default:
      severityLabel = "Clinical Telemedicine Evaluation";
      cta = "Complete your secure payment to finalize your intake. Our certified doctors will review your history and consult notes within 24 hours.";
  }

  // Fallback if no specific factors identified
  if (factors.length === 0) {
    factors.push("General health baseline evaluation");
  }

  return {
    severityLabel,
    factors,
    cta
  };
}
