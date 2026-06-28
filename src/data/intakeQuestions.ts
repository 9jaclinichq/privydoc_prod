export interface IntakeQuestion {
  id: string;
  track: "ED" | "PE" | "STI" | "LSD" | "GHC" | "ALL";
  phase: 1 | 2;
  category:
    | "demographics"
    | "presenting"
    | "history"
    | "lifestyle"
    | "partner"
    | "cardiovascular"
    | "safety"
    | "consent";
  text: string;
  type: "single" | "multi" | "scale" | "text" | "number" | "boolean";
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  required: boolean;
  redFlag?: {
    triggerValues: string[];
    message: string;
  };
  branches?: {
    ifAnswer: string | string[];
    showQuestions: string[];
  }[];
  iifScore?: {
    value: Record<string, number>;
  };
  autoLoad?: "age" | "state" | "phone" | "name";
}

export const INTAKE_QUESTIONS_BANK: IntakeQuestion[] = [
  // ==========================================
  // UNIVERSAL QUESTIONS (track: "ALL")
  // ==========================================
  // Phase 1 Demographics
  {
    id: "q_name",
    track: "ALL",
    phase: 1,
    category: "demographics",
    text: "Full Name",
    type: "text",
    required: true,
    autoLoad: "name"
  },
  {
    id: "q_age",
    track: "ALL",
    phase: 1,
    category: "demographics",
    text: "Age in years (Must be 18 or older)",
    type: "number",
    required: true,
    autoLoad: "age"
  },
  {
    id: "q_state",
    track: "ALL",
    phase: 1,
    category: "demographics",
    text: "State of Residence",
    type: "text",
    required: true,
    autoLoad: "state"
  },
  {
    id: "q_occupation",
    track: "ALL",
    phase: 1,
    category: "demographics",
    text: "Occupation / Type of work",
    type: "text",
    required: true
  },
  {
    id: "q_height",
    track: "ALL",
    phase: 1,
    category: "demographics",
    text: "Height in cm",
    type: "number",
    required: false
  },
  {
    id: "q_weight",
    track: "ALL",
    phase: 1,
    category: "demographics",
    text: "Weight in kg",
    type: "number",
    required: false
  },

  // Phase 1 Medical Background
  {
    id: "q_pmhx",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Do you have any of these conditions?",
    type: "multi",
    options: [
      "Diabetes",
      "High blood pressure",
      "Heart disease",
      "Stroke",
      "Kidney disease",
      "Liver disease",
      "Depression/anxiety",
      "Thyroid problems",
      "Prostate problems",
      "Cancer",
      "None of the above"
    ],
    required: true
  },
  {
    id: "q_meds",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Are you currently taking any medications?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_meds_list"]
      }
    ]
  },
  {
    id: "q_meds_list",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Please list your current medications and dosages:",
    type: "text",
    required: true
  },
  {
    id: "q_allergies",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Do you have any known drug allergies?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_allergies_list"]
      }
    ]
  },
  {
    id: "q_allergies_list",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Please list the drugs you are allergic to and the type of reaction:",
    type: "text",
    required: true
  },
  {
    id: "q_surgery",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Have you had any previous surgeries?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_surgery_list"]
      }
    ]
  },
  {
    id: "q_surgery_list",
    track: "ALL",
    phase: 1,
    category: "history",
    text: "Please specify your previous surgeries and approximate dates:",
    type: "text",
    required: true
  },

  // Phase 1 Lifestyle
  {
    id: "q_smoke",
    track: "ALL",
    phase: 1,
    category: "lifestyle",
    text: "Do you smoke or use nicotine products?",
    type: "single",
    options: [
      "Never",
      "Previously but stopped",
      "Yes occasionally",
      "Yes daily"
    ],
    required: true
  },
  {
    id: "q_alcohol",
    track: "ALL",
    phase: 1,
    category: "lifestyle",
    text: "How often do you drink alcohol?",
    type: "single",
    options: [
      "Never",
      "Rarely",
      "Socially/weekends",
      "Several times a week",
      "Daily"
    ],
    required: true
  },
  {
    id: "q_exercise",
    track: "ALL",
    phase: 1,
    category: "lifestyle",
    text: "How active are you physically?",
    type: "single",
    options: [
      "Not active at all",
      "Light activity 1-2x/week",
      "Moderate activity 3-4x/week",
      "Very active 5+x/week"
    ],
    required: true
  },
  {
    id: "q_stress",
    track: "ALL",
    phase: 1,
    category: "lifestyle",
    text: "How would you rate your stress level recently?",
    type: "scale",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Very Low", max: "Very High" },
    required: true
  },

  // ==========================================
  // ED TRACK QUESTIONS
  // ==========================================
  // Phase 1 - Presenting Complaint
  {
    id: "q_ed_duration",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "How long have you had difficulty with erections?",
    type: "single",
    options: [
      "Less than 1 month",
      "1-3 months",
      "3-6 months",
      "6-12 months",
      "Over 1 year"
    ],
    required: true
  },
  {
    id: "q_ed_onset",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "Did your erection difficulties come on suddenly or gradually?",
    type: "single",
    options: ["Suddenly", "Gradually over time", "Not sure/can't remember"],
    required: true
  },
  {
    id: "q_ed_frequency",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "How often do you experience difficulty getting or keeping an erection?",
    type: "single",
    options: [
      "Occasionally (less than half the time)",
      "About half the time",
      "More than half the time",
      "Almost always or always"
    ],
    required: true
  },
  {
    id: "q_ed_situational",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "Does the erection difficulty happen in all situations or only some?",
    type: "single",
    options: [
      "All situations",
      "Only with a partner",
      "Only with a specific partner",
      "Only during certain times/situations"
    ],
    required: true,
    branches: [
      {
        ifAnswer: [
          "Only with a partner",
          "Only during certain times/situations",
          "Only with a specific partner"
        ],
        showQuestions: ["q_ed_anxiety", "q_ed_relationship"]
      }
    ]
  },
  {
    id: "q_ed_anxiety",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "How much does performance anxiety affect your erections?",
    type: "scale",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Not at all", max: "Extremely" },
    required: true
  },
  {
    id: "q_ed_relationship",
    track: "ED",
    phase: 1,
    category: "lifestyle",
    text: "Are relationship difficulties or communication issues with your partner contributing to this?",
    type: "boolean",
    required: true
  },

  // SHIM/IIEF-5 Questions
  {
    id: "q_shim1",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "Over the past 4 weeks, how do you rate your confidence that you could get and keep an erection?",
    type: "single",
    options: ["Very low", "Low", "Moderate", "High", "Very high"],
    iifScore: {
      value: {
        "Very low": 1,
        "Low": 2,
        "Moderate": 3,
        "High": 4,
        "Very high": 5
      }
    },
    required: true
  },
  {
    id: "q_shim2",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "When you had erections with sexual stimulation, how often were your erections hard enough for penetration?",
    type: "single",
    options: [
      "No sexual activity",
      "Almost never/never",
      "A few times",
      "Sometimes",
      "Most times",
      "Almost always/always"
    ],
    iifScore: {
      value: {
        "No sexual activity": 0,
        "Almost never/never": 1,
        "A few times": 2,
        "Sometimes": 3,
        "Most times": 4,
        "Almost always/always": 5
      }
    },
    required: true
  },
  {
    id: "q_shim3",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "During sexual intercourse, how often were you able to maintain your erection after you had penetrated your partner?",
    type: "single",
    options: [
      "No sexual activity",
      "Almost never/never",
      "A few times",
      "Sometimes",
      "Most times",
      "Almost always/always"
    ],
    iifScore: {
      value: {
        "No sexual activity": 0,
        "Almost never/never": 1,
        "A few times": 2,
        "Sometimes": 3,
        "Most times": 4,
        "Almost always/always": 5
      }
    },
    required: true
  },
  {
    id: "q_shim4",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "During sexual intercourse, how difficult was it to maintain your erection to completion?",
    type: "single",
    options: [
      "Did not attempt",
      "Extremely difficult",
      "Very difficult",
      "Difficult",
      "Slightly difficult",
      "Not difficult"
    ],
    iifScore: {
      value: {
        "Did not attempt": 0,
        "Extremely difficult": 1,
        "Very difficult": 2,
        "Difficult": 3,
        "Slightly difficult": 4,
        "Not difficult": 5
      }
    },
    required: true
  },
  {
    id: "q_shim5",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "When you attempted sexual intercourse, how often was it satisfactory for you?",
    type: "single",
    options: [
      "No sexual activity",
      "Almost never/never",
      "A few times",
      "Sometimes",
      "Most times",
      "Almost always/always"
    ],
    iifScore: {
      value: {
        "No sexual activity": 0,
        "Almost never/never": 1,
        "A few times": 2,
        "Sometimes": 3,
        "Most times": 4,
        "Almost always/always": 5
      }
    },
    required: true
  },

  {
    id: "q_ed_morning",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "Do you wake up with erections in the morning?",
    type: "single",
    options: ["Yes regularly", "Sometimes/occasionally", "Rarely", "Never"],
    required: true,
    branches: [
      {
        ifAnswer: ["Rarely", "Never"],
        showQuestions: ["q_ed_vascular", "q_ed_hormone"]
      }
    ]
  },
  {
    id: "q_ed_vascular",
    track: "ED",
    phase: 1,
    category: "history",
    text: "Do you have cold feet, pain in your calves when walking, or poor circulation?",
    type: "boolean",
    required: true
  },
  {
    id: "q_ed_hormone",
    track: "ED",
    phase: 1,
    category: "history",
    text: "Have you noticed any reduced muscle mass, increased fatigue, or hot flushes?",
    type: "boolean",
    required: true
  },
  {
    id: "q_ed_masturbation",
    track: "ED",
    phase: 1,
    category: "presenting",
    text: "Can you get a firm erection when masturbating?",
    type: "single",
    options: [
      "Yes easily",
      "Yes but not as firm as before",
      "With difficulty",
      "No"
    ],
    required: true
  },

  // Cardiovascular safety
  {
    id: "q_ed_chest",
    track: "ED",
    phase: 1,
    category: "cardiovascular",
    text: "Do you ever get chest pain, chest tightness or pressure — during sex, exercise or at rest?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "Chest pain needs urgent medical assessment before any treatment for erection problems. Please see a doctor in person."
    }
  },
  {
    id: "q_ed_breath",
    track: "ED",
    phase: 1,
    category: "cardiovascular",
    text: "Do you get unusually short of breath during mild activity or at rest?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Breathing difficulty needs urgent assessment."
    }
  },
  {
    id: "q_ed_nitrates",
    track: "ED",
    phase: 1,
    category: "cardiovascular",
    text: "Are you taking any nitrate medications? (e.g. GTN spray, Isosorbide, or chest pain medicines taken under the tongue)",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "Nitrate medications cannot be combined with ED treatments. You need an in-person review with your doctor."
    }
  },
  {
    id: "q_ed_heart",
    track: "ED",
    phase: 1,
    category: "cardiovascular",
    text: "Have you had a heart attack or stroke in the last 6 months?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "Recent heart attack or stroke requires in-person specialist review before any treatment."
    }
  },

  // ED Phase 2 Extended History
  {
    id: "q_ed_libido",
    track: "ED",
    phase: 2,
    category: "history",
    text: "How is your sex drive / interest in sex?",
    type: "single",
    options: [
      "Normal/unchanged",
      "Slightly reduced",
      "Significantly reduced",
      "No interest at all"
    ],
    required: true,
    branches: [
      {
        ifAnswer: ["Significantly reduced", "No interest at all"],
        showQuestions: [
          "q_lsd_duration",
          "q_lsd_onset",
          "q_lsd_severity",
          "q_lsd_mood"
        ]
      }
    ]
  },
  {
    id: "q_ed_pain",
    track: "ED",
    phase: 2,
    category: "presenting",
    text: "Any pain in the penis during erection or sex?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_ed_curvature"]
      }
    ]
  },
  {
    id: "q_ed_curvature",
    track: "ED",
    phase: 2,
    category: "presenting",
    text: "Have you noticed any bending or curvature of the penis?",
    type: "boolean",
    required: true
  },
  {
    id: "q_ed_previous_tx",
    track: "ED",
    phase: 2,
    category: "history",
    text: "Have you tried any treatments for this before?",
    type: "multi",
    options: [
      "Viagra/Sildenafil",
      "Cialis/Tadalafil",
      "Herbal remedies",
      "Traditional medicine",
      "Nothing yet"
    ],
    required: true,
    branches: [
      {
        ifAnswer: ["Viagra/Sildenafil", "Cialis/Tadalafil"],
        showQuestions: ["q_ed_pde5_response"]
      }
    ]
  },
  {
    id: "q_ed_pde5_response",
    track: "ED",
    phase: 2,
    category: "history",
    text: "Did the medication help?",
    type: "single",
    options: ["Yes fully", "Partially", "No effect", "Made things worse"],
    required: true
  },
  {
    id: "q_ed_fertility",
    track: "ED",
    phase: 2,
    category: "lifestyle",
    text: "Are you currently trying to have a child with your partner?",
    type: "boolean",
    required: true
  },
  {
    id: "q_ed_partner_stable",
    track: "ED",
    phase: 2,
    category: "partner",
    text: "Do you have a regular sexual partner?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_ed_partner_satisfaction", "q_ed_partner_difficulties"]
      }
    ]
  },
  {
    id: "q_ed_partner_satisfaction",
    track: "ED",
    phase: 2,
    category: "partner",
    text: "How satisfied are you with your sexual relationship?",
    type: "scale",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Not satisfied", max: "Extremely satisfied" },
    required: true
  },
  {
    id: "q_ed_partner_difficulties",
    track: "ED",
    phase: 2,
    category: "partner",
    text: "Does your partner have any sexual difficulties of their own?",
    type: "boolean",
    required: true
  },

  // ==========================================
  // PE TRACK QUESTIONS
  // ==========================================
  // Phase 1
  {
    id: "q_pe_duration",
    track: "PE",
    phase: 1,
    category: "presenting",
    text: "How long have you had concerns about early ejaculation?",
    type: "single",
    options: [
      "Always been this way",
      "Started recently less than 3 months",
      "3-12 months ago",
      "Over 1 year ago"
    ],
    required: true
  },
  {
    id: "q_pe_ielt",
    track: "PE",
    phase: 1,
    category: "presenting",
    text: "On average, how quickly do you ejaculate after penetration?",
    type: "single",
    options: [
      "Under 30 seconds",
      "30 seconds to 1 minute",
      "1-2 minutes",
      "2-4 minutes",
      "Over 4 minutes"
    ],
    required: true
  },
  {
    id: "q_pe_control",
    track: "PE",
    phase: 1,
    category: "presenting",
    text: "How much control do you feel you have over when you ejaculate?",
    type: "single",
    options: [
      "No control at all",
      "Very little control",
      "Some control",
      "Good control"
    ],
    required: true
  },
  {
    id: "q_pe_distress",
    track: "PE",
    phase: 1,
    category: "presenting",
    text: "How much does this early ejaculation affect you emotionally?",
    type: "scale",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Not at all", max: "Extremely distressing" },
    required: true
  },
  {
    id: "q_pe_partner_distress",
    track: "PE",
    phase: 1,
    category: "partner",
    text: "Has this caused difficulties in your relationship?",
    type: "single",
    options: [
      "No partner",
      "No difficulties",
      "Some difficulties",
      "Significant difficulties"
    ],
    required: true
  },
  {
    id: "q_pe_ed_coexist",
    track: "PE",
    phase: 1,
    category: "presenting",
    text: "Do you also have difficulty getting or keeping an erection?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_shim1", "q_shim2", "q_shim3", "q_shim4", "q_shim5"]
      }
    ]
  },

  // PE Safety
  {
    id: "q_pe_pain",
    track: "PE",
    phase: 1,
    category: "safety",
    text: "Do you experience any pain during ejaculation?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Painful ejaculation needs in-person assessment."
    }
  },
  {
    id: "q_pe_blood",
    track: "PE",
    phase: 1,
    category: "safety",
    text: "Have you noticed any blood in your semen?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Blood in semen needs urgent in-person assessment."
    }
  },
  {
    id: "q_pe_fever",
    track: "PE",
    phase: 1,
    category: "safety",
    text: "Have you had any fever, pain when urinating, or pelvic pain recently?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "These symptoms suggest possible infection that needs urgent in-person assessment."
    }
  },

  // Phase 2 PE
  {
    id: "q_pe_anxiety",
    track: "PE",
    phase: 2,
    category: "lifestyle",
    text: "Do you feel anxious or stressed before or during sex?",
    type: "scale",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Not at all", max: "Extremely anxious" },
    required: true
  },
  {
    id: "q_pe_thyroid",
    track: "PE",
    phase: 2,
    category: "history",
    text: "Do you have any of these symptoms: unexplained weight loss, always feeling hot, trembling hands, fast heartbeat?",
    type: "boolean",
    required: true
  },
  {
    id: "q_pe_prostatitis",
    track: "PE",
    phase: 2,
    category: "history",
    text: "Do you feel pain in the groin, perineum or testicles between sexual encounters?",
    type: "boolean",
    required: true
  },

  // ==========================================
  // STI TRACK QUESTIONS
  // ==========================================
  // Phase 1
  {
    id: "q_sti_symptoms",
    track: "STI",
    phase: 1,
    category: "presenting",
    text: "Which of these symptoms do you have?",
    type: "multi",
    options: [
      "Discharge from penis",
      "Burning/pain when urinating",
      "Sores or ulcers on genitals",
      "Rash on genitals or body",
      "Swelling in groin",
      "Itching around genitals",
      "None of the above"
    ],
    required: true
  },
  {
    id: "q_sti_duration",
    track: "STI",
    phase: 1,
    category: "presenting",
    text: "How long have you had these symptoms?",
    type: "single",
    options: [
      "Less than a week",
      "1-2 weeks",
      "2-4 weeks",
      "Over a month"
    ],
    required: true
  },
  {
    id: "q_sti_exposure",
    track: "STI",
    phase: 1,
    category: "presenting",
    text: "Have you had unprotected sex in the last 3 months?",
    type: "boolean",
    required: true
  },
  {
    id: "q_sti_partners",
    track: "STI",
    phase: 1,
    category: "partner",
    text: "Number of sexual partners in the last 3 months?",
    type: "single",
    options: ["None", "1", "2-3", "4 or more"],
    required: true
  },
  {
    id: "q_sti_partner_symptoms",
    track: "STI",
    phase: 1,
    category: "partner",
    text: "Has any of your partners mentioned having symptoms or a recent STI diagnosis?",
    type: "boolean",
    required: true
  },

  // STI Safety
  {
    id: "q_sti_testicular",
    track: "STI",
    phase: 1,
    category: "safety",
    text: "Do you have any swelling or severe pain in the testicles?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Testicular swelling/pain needs urgent in-person assessment today."
    }
  },
  {
    id: "q_sti_fever",
    track: "STI",
    phase: 1,
    category: "safety",
    text: "Do you have a fever above 38°C accompanying your genital symptoms?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Fever with genital symptoms needs urgent in-person assessment."
    }
  },
  {
    id: "q_sti_assault",
    track: "STI",
    phase: 1,
    category: "safety",
    text: "Did these symptoms follow a sexual assault?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "Please contact the police and go to the nearest emergency department. Support is available."
    }
  },

  // Phase 2 STI
  {
    id: "q_sti_hiv_risk",
    track: "STI",
    phase: 2,
    category: "history",
    text: "Have you had high-risk HIV exposure in the last 72 hours?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_sti_pep"]
      }
    ]
  },
  {
    id: "q_sti_pep",
    track: "STI",
    phase: 2,
    category: "safety",
    text: "Please read carefully: Post-Exposure Prophylaxis (PEP) can prevent HIV if started within 72 hours of exposure. You should immediately visit an emergency department or clinic to obtain PEP. Would you like to proceed with general STI consultation anyway?",
    type: "boolean",
    required: true
  },
  {
    id: "q_sti_previous_sti",
    track: "STI",
    phase: 2,
    category: "history",
    text: "Have you had a previous STI diagnosis?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_sti_previous_sti_which"]
      }
    ]
  },
  {
    id: "q_sti_previous_sti_which",
    track: "STI",
    phase: 2,
    category: "history",
    text: "Which STI diagnosis did you have previously and when?",
    type: "text",
    required: true
  },
  {
    id: "q_sti_urinary",
    track: "STI",
    phase: 2,
    category: "presenting",
    text: "Any difficulty passing urine or a poor/intermittent urine stream?",
    type: "boolean",
    required: true
  },

  // ==========================================
  // LSD TRACK QUESTIONS
  // ==========================================
  // Phase 1
  {
    id: "q_lsd_duration",
    track: "LSD",
    phase: 1,
    category: "presenting",
    text: "How long have you noticed a reduced sex drive?",
    type: "single",
    options: [
      "Less than 1 month",
      "1-3 months",
      "3-6 months",
      "6-12 months",
      "Over 1 year"
    ],
    required: true
  },
  {
    id: "q_lsd_onset",
    track: "LSD",
    phase: 1,
    category: "presenting",
    text: "Was the change in your sex drive sudden or gradual?",
    type: "single",
    options: ["Sudden", "Gradual", "Not sure"],
    required: true
  },
  {
    id: "q_lsd_severity",
    track: "LSD",
    phase: 1,
    category: "presenting",
    text: "Compared to your normal level, how would you rate your current sex drive?",
    type: "scale",
    scaleMin: 1,
    scaleMax: 10,
    scaleLabels: { min: "Completely gone", max: "Completely normal" },
    required: true
  },
  {
    id: "q_lsd_ed_coexist",
    track: "LSD",
    phase: 1,
    category: "presenting",
    text: "Do you also experience difficulty getting or keeping erections?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_shim1", "q_shim2", "q_shim3", "q_shim4", "q_shim5"]
      }
    ]
  },
  {
    id: "q_lsd_mood",
    track: "LSD",
    phase: 1,
    category: "lifestyle",
    text: "How has your mood been recently?",
    type: "single",
    options: [
      "Normal",
      "Slightly low",
      "Noticeably low/sad",
      "Very low/depressed"
    ],
    required: true,
    branches: [
      {
        ifAnswer: ["Very low/depressed"],
        showQuestions: ["q_lsd_safety"]
      }
    ]
  },

  // LSD Safety
  {
    id: "q_lsd_safety",
    track: "LSD",
    phase: 1,
    category: "safety",
    text: "Have you had any thoughts of harming yourself?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "Your wellbeing matters. Please speak to someone you trust or call a helpline. In an emergency call 199 or go to your nearest hospital."
    }
  },
  {
    id: "q_lsd_weightloss",
    track: "LSD",
    phase: 1,
    category: "safety",
    text: "Have you had unexplained weight loss recently?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Unexplained weight loss needs in-person assessment."
    }
  },

  // Phase 2 LSD
  {
    id: "q_lsd_pituitary",
    track: "LSD",
    phase: 2,
    category: "safety",
    text: "Have you had any persistent headaches, vision changes, or milky discharge from your nipples?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "These symptoms need urgent in-person assessment."
    }
  },
  {
    id: "q_lsd_relationship",
    track: "LSD",
    phase: 2,
    category: "partner",
    text: "Are relationship difficulties contributing to your reduced desire?",
    type: "boolean",
    required: true
  },
  {
    id: "q_lsd_hormone_meds",
    track: "LSD",
    phase: 2,
    category: "history",
    text: "Are you taking any of these medications: steroids, finasteride, anti-hypertensives, antidepressants, or opioid painkillers?",
    type: "boolean",
    required: true
  },

  // ==========================================
  // GHC TRACK QUESTIONS
  // ==========================================
  // Phase 1
  {
    id: "q_ghc_reason",
    track: "GHC",
    phase: 1,
    category: "presenting",
    text: "What brings you for a general health check today?",
    type: "multi",
    options: [
      "Annual health review",
      "Checking blood pressure",
      "Checking blood sugar",
      "Weight concerns",
      "Mental health check",
      "Family history concerns",
      "Just curious about my health",
      "Other"
    ],
    required: true
  },
  {
    id: "q_ghc_bp_known",
    track: "GHC",
    phase: 1,
    category: "history",
    text: "Do you know your typical blood pressure reading?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_ghc_bp_value"]
      }
    ]
  },
  {
    id: "q_ghc_bp_value",
    track: "GHC",
    phase: 1,
    category: "history",
    text: "What was your last blood pressure reading?",
    type: "text",
    required: true
  },
  {
    id: "q_ghc_sugar_known",
    track: "GHC",
    phase: 1,
    category: "history",
    text: "Do you know your typical blood sugar level?",
    type: "boolean",
    required: true,
    branches: [
      {
        ifAnswer: ["true", "Yes"],
        showQuestions: ["q_ghc_sugar_value"]
      }
    ]
  },
  {
    id: "q_ghc_sugar_value",
    track: "GHC",
    phase: 1,
    category: "history",
    text: "What was your last blood sugar reading and when was it taken?",
    type: "text",
    required: true
  },
  {
    id: "q_ghc_family_hx",
    track: "GHC",
    phase: 1,
    category: "history",
    text: "Is there a family history of any of these conditions?",
    type: "multi",
    options: [
      "Heart disease",
      "Diabetes",
      "Stroke",
      "Cancer",
      "Hypertension",
      "None known"
    ],
    required: true
  },

  // GHC Safety
  {
    id: "q_ghc_chest",
    track: "GHC",
    phase: 1,
    category: "safety",
    text: "Have you experienced any chest pain or pressure recently?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Chest pain needs urgent in-person assessment today."
    }
  },
  {
    id: "q_ghc_stroke_sx",
    track: "GHC",
    phase: 1,
    category: "safety",
    text: "Have you experienced any sudden weakness, face drooping, speech difficulty or vision changes?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "These could be stroke symptoms. Call 199 or go to the nearest emergency department immediately."
    }
  },
  {
    id: "q_ghc_syncope",
    track: "GHC",
    phase: 1,
    category: "safety",
    text: "Have you experienced any unexplained fainting or blackouts recently?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message: "Fainting needs urgent in-person assessment."
    }
  },
  {
    id: "q_ghc_mental",
    track: "GHC",
    phase: 1,
    category: "safety",
    text: "Have you had any thoughts of harming yourself?",
    type: "boolean",
    required: true,
    redFlag: {
      triggerValues: ["true", "Yes"],
      message:
        "Your wellbeing matters. Please speak to someone you trust or call a helpline. In an emergency call 199 or go to your nearest hospital."
    }
  },

  // Phase 2 GHC
  {
    id: "q_ghc_diet",
    track: "GHC",
    phase: 2,
    category: "lifestyle",
    text: "How would you describe your typical diet?",
    type: "single",
    options: ["Mostly healthy", "Mixed/average", "Mostly unhealthy", "Very poor"],
    required: true
  },
  {
    id: "q_ghc_sleep",
    track: "GHC",
    phase: 2,
    category: "lifestyle",
    text: "On average, how many hours of sleep do you get per night?",
    type: "single",
    options: ["Less than 5", "5-6", "7-8", "More than 8"],
    required: true
  },
  {
    id: "q_ghc_sleep_quality",
    track: "GHC",
    phase: 2,
    category: "lifestyle",
    text: "How would you rate your sleep quality?",
    type: "single",
    options: ["Good", "Fair", "Poor", "Very poor"],
    required: true
  },
  {
    id: "q_ghc_mental_screen",
    track: "GHC",
    phase: 2,
    category: "lifestyle",
    text: "Over the last 2 weeks, have you felt down, hopeless or had little interest in doing things you typically enjoy?",
    type: "single",
    options: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
    required: true
  },

  // ==========================================
  // UNIVERSAL PHASE 2 — CONSENT BLOCK (last 4 questions, all tracks)
  // ==========================================
  {
    id: "q_consent_tele",
    track: "ALL",
    phase: 2,
    category: "consent",
    text: "I understand this is an asynchronous telemedicine service. My doctor will review my responses and reply within 24 hours.",
    type: "boolean",
    required: true
  },
  {
    id: "q_consent_privacy",
    track: "ALL",
    phase: 2,
    category: "consent",
    text: "I understand my health information is stored securely and will only be shared with my assigned doctor.",
    type: "boolean",
    required: true
  },
  {
    id: "q_consent_emergency",
    track: "ALL",
    phase: 2,
    category: "consent",
    text: "I understand that if I have a medical emergency, I should call 199 or go to the nearest hospital immediately rather than wait for an online response.",
    type: "boolean",
    required: true
  },
  {
    id: "q_consent_cds",
    track: "ALL",
    phase: 2,
    category: "consent",
    text: "I understand that PrivyDoc uses a clinical decision support system to help organise my health information before my doctor reviews it. All clinical decisions are made by a qualified doctor.",
    type: "boolean",
    required: true
  }
];
