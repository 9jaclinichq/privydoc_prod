import { Doctor, Consultation } from "./types";

export interface IntakeQuestion {
  id: string;
  text: string;
  type: "text" | "radio" | "checkbox";
  options?: string[];
  placeholder?: string;
  category: string;
}

export const MEN_HEALTH_CONDITIONS = [
  {
    id: "GHC",
    title: "General Health Check-Up",
    description: "Proactive review of metabolic health, sleep, lifestyle, and potential risk factors.",
    durationOptions: ["Routine Screen"],
    basePrice: 7500
  },
  {
    id: "ED",
    title: "Erectile Dysfunction (ED)",
    description: "Difficulty achieving or maintaining an erection firm enough for intercourse.",
    durationOptions: ["Less than 1 month", "1-3 months", "3-6 months", "Over 6 months"],
    basePrice: 7500
  },
  {
    id: "PE",
    title: "Premature Ejaculation (PE)",
    description: "Ejaculation occurring sooner than desired, often within a minute of penetration.",
    durationOptions: ["Less than 1 month", "1-6 months", "Over 6 months", "Always has been an issue"],
    basePrice: 7500
  },
  {
    id: "STI",
    title: "STI & Genital Symptoms",
    description: "Discharge, sores, burning on urination, or exposure concern.",
    durationOptions: ["Less than 3 days", "3-7 days", "1-2 weeks", "Over 2 weeks"],
    basePrice: 7500
  },
  {
    id: "LSD",
    title: "Low Sex Drive & Libido",
    description: "Reduced sexual desire, low energy levels, or general vitality concerns.",
    durationOptions: ["Less than 1 month", "1-6 months", "Over 6 months"],
    basePrice: 7500
  }
];

export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  // General
  {
    id: "age",
    text: "What is your current age?",
    type: "text",
    placeholder: "e.g. 34",
    category: "general"
  },
  {
    id: "duration",
    text: "How long have you been experiencing this issue?",
    type: "radio",
    options: ["Less than 1 month", "1-3 months", "3-6 months", "Over 6 months"],
    category: "general"
  },
  
  // ED Specific (IIEF-5 clinical standards)
  {
    id: "ed_confidence",
    text: "How do you rate your confidence that you can get and keep an erection?",
    type: "radio",
    options: [
      "1 - Very low confidence",
      "2 - Low confidence",
      "3 - Moderate confidence",
      "4 - High confidence",
      "5 - Very high confidence"
    ],
    category: "ED"
  },
  {
    id: "ed_firmness",
    text: "When you have erections with sexual stimulation, how often are they hard enough for penetration?",
    type: "radio",
    options: [
      "1 - Almost never or never",
      "2 - A few times (much less than half the time)",
      "3 - Sometimes (about half the time)",
      "4 - Most times (much more than half the time)",
      "5 - Almost always or always"
    ],
    category: "ED"
  },
  {
    id: "ed_maintenance",
    text: "During sexual intercourse, how often are you able to maintain your erection after penetration?",
    type: "radio",
    options: [
      "1 - Almost never or never",
      "2 - A few times (much less than half the time)",
      "3 - Sometimes (about half the time)",
      "4 - Most times (much more than half the time)",
      "5 - Almost always or always"
    ],
    category: "ED"
  },
  {
    id: "ed_difficulty",
    text: "During sexual intercourse, how difficult is it to maintain your erection to completion of intercourse?",
    type: "radio",
    options: [
      "1 - Extremely difficult",
      "2 - Very difficult",
      "3 - Difficult",
      "4 - Slightly difficult",
      "5 - Not difficult"
    ],
    category: "ED"
  },
  {
    id: "ed_satisfaction",
    text: "When you attempt sexual intercourse, how often is it satisfactory for you?",
    type: "radio",
    options: [
      "1 - Almost never or never",
      "2 - A few times (much less than half the time)",
      "3 - Sometimes (about half the time)",
      "4 - Most times (much more than half the time)",
      "5 - Almost always or always"
    ],
    category: "ED"
  },
  {
    id: "ed_morning",
    text: "Do you experience normal morning or nocturnal erections?",
    type: "radio",
    options: ["Yes, regularly", "Occasionally", "No, rarely or never"],
    category: "ED"
  },

  // PE Specific (PEDT clinical standards)
  {
    id: "pe_time",
    text: "On average, how quickly do you ejaculate after penetration?",
    type: "radio",
    options: ["Under 1 minute", "1-2 minutes", "3-5 minutes", "More than 5 minutes"],
    category: "PE"
  },
  {
    id: "pe_control",
    text: "How difficult is it for you to delay or control ejaculation during intercourse?",
    type: "radio",
    options: [
      "1 - Extremely difficult / Almost impossible",
      "2 - Very difficult",
      "3 - Difficult",
      "4 - Slightly difficult",
      "5 - Not difficult"
    ],
    category: "PE"
  },
  {
    id: "pe_distress",
    text: "How much personal distress, frustration, or anxiety does this ejaculation speed cause you?",
    type: "radio",
    options: [
      "Severe distress",
      "Moderate distress",
      "Mild distress",
      "No distress"
    ],
    category: "PE"
  },
  {
    id: "pe_partner_distress",
    text: "How much distress or frustration do you perceive this causes your sexual partner?",
    type: "radio",
    options: [
      "Severe distress",
      "Moderate distress",
      "Mild distress",
      "No distress"
    ],
    category: "PE"
  },
  {
    id: "pe_trigger",
    text: "Does ejaculation occur with very minimal sexual stimulation or prior to penetration?",
    type: "radio",
    options: [
      "Yes, frequently prior to penetration",
      "Yes, with minimal stimulation",
      "Occasionally",
      "No, only after active intercourse"
    ],
    category: "PE"
  },

  // STI Specific (Comprehensive clinical screen)
  {
    id: "sti_discharge",
    text: "Are you experiencing any abnormal discharge from the penis?",
    type: "radio",
    options: [
      "No discharge",
      "Yes, thick yellow or white discharge",
      "Yes, green or cloudy discharge",
      "Yes, watery or clear discharge",
      "Yes, blood-stained discharge"
    ],
    category: "STI"
  },
  {
    id: "sti_pain",
    text: "How would you rate the severity of burning or pain when urinating (dysuria)?",
    type: "radio",
    options: [
      "No pain",
      "Mild irritation / tickle",
      "Moderate burning",
      "Severe, intense burning ('broken glass' sensation)"
    ],
    category: "STI"
  },
  {
    id: "sti_lesions",
    text: "Do you have any visible sores, blisters, ulcers, or warts on your genitals or groin?",
    type: "radio",
    options: [
      "No lesions or sores",
      "Yes, painful blisters or sores",
      "Yes, painless ulcers or open sores",
      "Yes, small painless bumps or warts",
      "Yes, rash or itching redness"
    ],
    category: "STI"
  },
  {
    id: "sti_exposure",
    text: "Have you had a high-risk sexual encounter or a partner with a known infection?",
    type: "radio",
    options: [
      "No known exposure",
      "Yes, within the last 3 days",
      "Yes, 3 to 14 days ago",
      "Yes, 2 to 4 weeks ago",
      "Yes, more than 4 weeks ago"
    ],
    category: "STI"
  },

  // LSD Specific (Hormonal / Libido screen)
  {
    id: "lsd_desire",
    text: "How would you describe your level of sexual desire (libido) compared to your historical baseline?",
    type: "radio",
    options: [
      "Completely absent",
      "Severely reduced",
      "Moderately reduced",
      "Slightly reduced",
      "Normal or optimal"
    ],
    category: "LSD"
  },
  {
    id: "lsd_energy",
    text: "Do you experience general low energy, severe daytime fatigue, or lack of motivation?",
    type: "radio",
    options: [
      "Yes, chronic and severe fatigue",
      "Yes, moderate daily fatigue",
      "Occasionally tired",
      "No, good energy levels"
    ],
    category: "LSD"
  },
  {
    id: "lsd_physical",
    text: "Have you noticed sudden changes in body composition (e.g., loss of muscle, increased abdominal fat)?",
    type: "radio",
    options: [
      "Yes, significant muscle loss and fat gain",
      "Yes, mild changes",
      "No noticeable changes"
    ],
    category: "LSD"
  },
  {
    id: "lsd_mood",
    text: "Are you experiencing persistent low mood, irritability, or brain fog?",
    type: "radio",
    options: [
      "Yes, severe mood changes and brain fog",
      "Yes, moderate irritability",
      "Mild/occasional",
      "No, stable mood"
    ],
    category: "LSD"
  },

  // GHC Specific (General Health Screen)
  {
    id: "ghc_pressure",
    text: "What is your typical or most recent blood pressure range, if known?",
    type: "radio",
    options: [
      "Normal (Below 120/80 mmHg)",
      "Elevated (120-129/80 mmHg)",
      "High / Hypertensive (Above 130/80 mmHg)",
      "Low (Below 90/60 mmHg)",
      "Unknown (Have not checked recently)"
    ],
    category: "GHC"
  },
  {
    id: "ghc_sugar",
    text: "What is your fasting blood sugar status, if known?",
    type: "radio",
    options: [
      "Normal / Non-diabetic",
      "Pre-diabetic",
      "Diabetic (under control)",
      "Diabetic (poorly controlled)",
      "Unknown"
    ],
    category: "GHC"
  },
  {
    id: "ghc_sleep",
    text: "How would you rate your average nightly sleep quality?",
    type: "radio",
    options: [
      "Excellent, restful (7-8 hours)",
      "Average, sleep is decent (5-6 hours)",
      "Poor, suffer from insomnia or frequent waking",
      "Severely disrupted / less than 4 hours"
    ],
    category: "GHC"
  },
  {
    id: "ghc_cardio",
    text: "Do you experience abnormal shortness of breath or dizziness when climbing stairs or walking briskly?",
    type: "radio",
    options: [
      "No, never",
      "Yes, mild shortness of breath",
      "Yes, severe breathlessness or dizziness"
    ],
    category: "GHC"
  },

  // Lifestyle & Safety (Applied to all)
  {
    id: "medications",
    text: "List all regular medications, supplements, or treatments you are currently taking:",
    type: "text",
    placeholder: "e.g., Blood pressure meds, multivitamins, None, etc.",
    category: "safety"
  },
  {
    id: "comorbidities",
    text: "Do you have any of the following diagnosed medical conditions? (Select all that apply)",
    type: "checkbox",
    options: [
      "High Blood Pressure",
      "Diabetes Mellitus",
      "Heart Disease / Angina",
      "Sickle Cell Disease or Trait",
      "Peyronie's Disease (Penile curvature)",
      "Liver or Kidney disease",
      "None of the above"
    ],
    category: "safety"
  },
  {
    id: "lifestyle_habits",
    text: "What are your habits regarding alcohol, smoking, and recreational substances?",
    type: "radio",
    options: [
      "None / Clean habits",
      "Occasional alcohol, non-smoker",
      "Regular alcohol, active smoker",
      "Regular shisha/vape or substances"
    ],
    category: "safety"
  },
  {
    id: "allergies",
    text: "Do you have any known medical or drug allergies? (e.g., Penicillin, Sildenafil, etc.)",
    type: "text",
    placeholder: "e.g., None, Penicillin allergy, Sildenafil headache, etc.",
    category: "safety"
  },
  {
    id: "chest_pain",
    text: "Do you experience any sudden chest pain, chest tightness, or racing pulse during physical exertion?",
    type: "radio",
    options: ["No, never", "Yes, occasional chest tightness", "Yes, frequent chest pain/tightness (Emergency warning)"],
    category: "safety"
  }
];

export const SYMPTOM_ADVICE = {
  GHC: [
    "Check your blood pressure at a pharmacy or clinic — it takes 5 minutes and is usually free.",
    "Reduce processed carbohydrates and sugar — these are the fastest dietary changes for metabolic health.",
    "Ensure 7-8 hours of quality sleep nightly to regulate endocrine and cardiovascular systems.",
    "Discuss your medical and family health history in detail with a physician."
  ],
  ED: [
    "Reduce processed carbohydrates and sugar — these are the fastest dietary change for metabolic risk and vascular health.",
    "Engage in pelvic floor (Kegel) exercises to improve localized blood flow and muscle tone.",
    "Prioritize 7-8 hours of quality sleep as testosterone peaks during deep sleep cycles.",
    "Limit alcohol intake and avoid smoking, which restricts blood flow to peripheral blood vessels."
  ],
  PE: [
    "Practice the 'squeeze' or 'start-stop' technique during intercourse to improve arousal control.",
    "Consider using climax-control or thicker condoms to decrease penile hypersensitivity.",
    "Incorporate breathing exercises to lower pelvic floor tension and physical anxiety during sex.",
    "Consult your physician regarding pelvic floor physical therapy or clinical delay options."
  ],
  STI: [
    "Abstain from sexual activity until your doctor has fully evaluated your intake answers.",
    "Do not share towels, clothing, or personal hygiene products.",
    "Drink plenty of water to help flush the urinary tract and decrease pain on urination.",
    "Avoid self-treatment with over-the-counter antibiotics before consulting a physician."
  ],
  LSD: [
    "Incorporate resistance or strength training 3-4 times a week, which is clinically proven to boost natural testosterone production.",
    "Ensure adequate intake of healthy fats, Vitamin D, and Zinc.",
    "Implement daily stress-reduction practices (mindfulness, breathing) as high cortisol directly suppresses testosterone."
  ]
};

export const DEMO_DOCTORS: Doctor[] = [
  {
    id: "doc_1",
    name: "Dr. Babajide Alao",
    phone: "+2348031234567",
    mdcn_folio: "M/10234",
    apl_year: 2026,
    pin_hash: "1234", // Simple default PIN
    status: "active",
    verified: true,
    bank_name: "Access Bank",
    account_number: "0123456789",
    payout_balance: 150000
  },
  {
    id: "doc_2",
    name: "Dr. Chioma Nwachukwu",
    phone: "+2348123456789",
    mdcn_folio: "M/09451",
    apl_year: 2026,
    pin_hash: "1234",
    status: "active",
    verified: true,
    bank_name: "Guaranty Trust Bank (GTB)",
    account_number: "0987654321",
    payout_balance: 75000
  }
];

export const DEMO_CONSULTATIONS: Consultation[] = [
  {
    id: "cons_1",
    patient_id: "pat_1",
    patient_name: "Kunle Adebayo",
    patient_phone: "+2348055554444",
    patient_age: 41,
    condition: "Erectile Dysfunction (ED)",
    duration: "3-6 months",
    symptoms: [
      "Erection firmness: Hard but not enough for penetration",
      "Morning erections: No, rarely or never",
      "Medications: None",
      "Comorbidities: High Blood Pressure",
      "Lifestyle: High stress, office job, minimal exercise"
    ],
    raw_answers: [
      { question: "What is your current age?", answer: "41" },
      { question: "How long have you been experiencing this issue?", answer: "3-6 months" },
      { question: "Rate your current erection firmness on a scale of 1-4", answer: "2 - Hard but not hard enough for penetration" },
      { question: "Do you experience normal morning or nocturnal erections?", answer: "No, rarely or never" },
      { question: "Are you currently taking any regular medications?", answer: "None" },
      { question: "Do you have any existing chronic conditions?", answer: "High Blood Pressure" },
      { question: "Briefly describe your general lifestyle", answer: "High stress, office job, minimal exercise" },
      { question: "Do you experience sudden chest pain or shortness of breath?", answer: "No, never" }
    ],
    status: "pending",
    amount_paid: 7500,
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    messages: []
  },
  {
    id: "cons_2",
    patient_id: "pat_2",
    patient_name: "Chidi Okafor",
    patient_phone: "+2349077778888",
    patient_age: 29,
    condition: "Premature Ejaculation (PE)",
    duration: "Over 6 months",
    symptoms: [
      "Ejaculate time: Under 1 minute",
      "Medications: Multivitamins",
      "Comorbidities: None of the above",
      "Lifestyle: Active, moderate stress"
    ],
    raw_answers: [
      { question: "What is your current age?", answer: "29" },
      { question: "How long have you been experiencing this issue?", answer: "Over 6 months" },
      { question: "On average, how quickly do you ejaculate after penetration?", answer: "Under 1 minute" },
      { question: "Are you currently taking any regular medications?", answer: "Multivitamins" },
      { question: "Do you have any existing chronic conditions?", answer: "None of the above" },
      { question: "Briefly describe your general lifestyle", answer: "Active, moderate stress" },
      { question: "Do you experience sudden chest pain or shortness of breath?", answer: "No, never" }
    ],
    status: "active",
    doctor_id: "doc_1",
    doctor_name: "Dr. Babajide Alao",
    ai_summary: "SUMMARY OF PRESENTING COMPLAINT:\nPrimary complaint of long-standing premature ejaculation (duration >6 months). Ejaculation consistently occurring in under 1 minute post-penetration, matching clinical criteria for lifelong/acquired PE.\n\nHISTORIC PREVALENCE:\nDuration indicates chronic presentation. Patient is 29 years old. No significant medications or chronic comorbidities noted.\n\nRISK FACTORS:\nModerate anxiety or performance-related stress may be present, standard for active lifestyle in urban hubs.\n\nCLINICAL RECOMMENDATION:\nConsider psychological and cognitive behavioral techniques (squeeze or stop-start method) paired with pelvic floor control exercises. Initiate consultation dialog to rule out localized infections or hypersensitivity. Avoid immediate drug prescription without conversational history.",
    amount_paid: 7500,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 24 hours ago
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    messages: [
      {
        id: "msg_1",
        sender: "system",
        sender_name: "System",
        text: "Consultation initiated and assigned to Dr. Babajide Alao.",
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: "msg_2",
        sender: "doctor",
        sender_name: "Dr. Babajide Alao",
        text: "Hello Chidi, I have reviewed your case details regarding premature ejaculation. Let's talk more. Do you notice if this happens only during certain situations, or is it consistent across all encounters?",
        timestamp: new Date(Date.now() - 1.9 * 3600 * 1000).toISOString()
      },
      {
        id: "msg_3",
        sender: "patient",
        sender_name: "Chidi Okafor",
        text: "Hello Doctor, thank you. Yes, it is pretty consistent with all sexual partners. It makes me a bit anxious.",
        timestamp: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString()
      }
    ]
  }
];
