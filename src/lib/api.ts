import { Doctor, Patient, Consultation, ChatMessage, PayoutRequest } from "../types";
import { DEMO_DOCTORS, DEMO_CONSULTATIONS } from "../data";
import { generateId } from "../utils";

// LocalStorage Keys
const KEYS = {
  DOCTORS: "privydoc_doctors",
  PATIENTS: "privydoc_patients",
  CONSULTATIONS: "privydoc_consultations",
  PAYOUT_REQUESTS: "privydoc_payout_requests",
  CURRENT_PATIENT: "privydoc_current_patient",
  CURRENT_DOCTOR: "privydoc_current_doctor",
  CURRENT_ADMIN: "privydoc_current_admin"
};

// Initialize LocalStorage with presets if empty
export function initializeStorage() {
  if (!localStorage.getItem(KEYS.DOCTORS)) {
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(DEMO_DOCTORS));
  }
  if (!localStorage.getItem(KEYS.CONSULTATIONS)) {
    localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(DEMO_CONSULTATIONS));
  }
  if (!localStorage.getItem(KEYS.PAYOUT_REQUESTS)) {
    localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify([]));
  }
}

// Ensure storage is initialized on import
initializeStorage();

// Doctor API
export const doctorApi = {
  getAll: (): Doctor[] => {
    return JSON.parse(localStorage.getItem(KEYS.DOCTORS) || "[]");
  },
  
  getById: (id: string): Doctor | undefined => {
    return doctorApi.getAll().find(d => d.id === id);
  },

  register: (name: string, phone: string, mdcn_folio: string, apl_year: number, pin: string): { success: boolean; error?: string; doctor?: Doctor } => {
    const doctors = doctorApi.getAll();
    if (doctors.some(d => d.mdcn_folio === mdcn_folio)) {
      return { success: false, error: "An account with this MDCN Folio Number already exists." };
    }

    const newDoc: Doctor = {
      id: generateId("doc"),
      name,
      phone,
      mdcn_folio,
      apl_year,
      pin_hash: pin, // simple mock pin hash
      status: "pending",
      verified: false,
      payout_balance: 0
    };

    doctors.push(newDoc);
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
    return { success: true, doctor: newDoc };
  },

  login: (mdcn_folio: string, pin: string): { success: boolean; error?: string; doctor?: Doctor } => {
    const doctors = doctorApi.getAll();
    const doc = doctors.find(d => d.mdcn_folio === mdcn_folio && d.pin_hash === pin);
    if (!doc) {
      return { success: false, error: "Invalid MDCN Folio Number or PIN." };
    }
    if (doc.status === "suspended") {
      return { success: false, error: "Your clinician account is suspended. Please contact Admin." };
    }
    return { success: true, doctor: doc };
  },

  updatePayoutDetails: (id: string, bankName: string, accountNumber: string): { success: boolean } => {
    const doctors = doctorApi.getAll();
    const index = doctors.findIndex(d => d.id === id);
    if (index !== -1) {
      doctors[index].bank_name = bankName;
      doctors[index].account_number = accountNumber;
      localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
      return { success: true };
    }
    return { success: false };
  }
};

// Consultations API
export const consultationApi = {
  getAll: (): Consultation[] => {
    return JSON.parse(localStorage.getItem(KEYS.CONSULTATIONS) || "[]");
  },

  getById: (id: string): Consultation | undefined => {
    return consultationApi.getAll().find(c => c.id === id);
  },

  getByPatientPhone: (phone: string): Consultation[] => {
    return consultationApi.getAll().filter(c => c.patient_phone === phone);
  },

  getByDoctorId: (docId: string): Consultation[] => {
    return consultationApi.getAll().filter(c => c.doctor_id === docId);
  },

  create: async (
    patientName: string,
    patientPhone: string,
    patientAge: number,
    condition: string,
    duration: string,
    rawAnswers: { question: string; answer: string }[],
    amountPaid: number
  ): Promise<Consultation> => {
    const consultations = consultationApi.getAll();

    // Map raw answers to readable symptom string array
    const symptoms = rawAnswers.map(ans => `${ans.question}: ${ans.answer}`);

    const newConsultation: Consultation = {
      id: generateId("cons"),
      patient_id: generateId("pat"),
      patient_name: patientName,
      patient_phone: patientPhone,
      patient_age: patientAge,
      condition,
      duration,
      symptoms,
      raw_answers: rawAnswers,
      status: "pending",
      amount_paid: amountPaid,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: []
    };

    // Request AI summary from the server backend
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condition,
          form_data: {
            duration,
            age: patientAge,
            answers: rawAnswers
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          newConsultation.ai_summary = data.summary;
        }
      }
    } catch (e) {
      console.warn("Could not retrieve server-side AI summary. Proceeding offline.", e);
    }

    consultations.push(newConsultation);
    localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));
    return newConsultation;
  },

  claim: (id: string, docId: string, docName: string): { success: boolean; consultation?: Consultation } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1 && consultations[index].status === "pending") {
      consultations[index].status = "active";
      consultations[index].doctor_id = docId;
      consultations[index].doctor_name = docName;
      consultations[index].updated_at = new Date().toISOString();
      
      const systemMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "system",
        sender_name: "System",
        text: `Consultation accepted by ${docName}. Live secure chat is now active.`,
        timestamp: new Date().toISOString()
      };
      consultations[index].messages.push(systemMsg);

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));
      return { success: true, consultation: consultations[index] };
    }
    return { success: false };
  },

  addMessage: (id: string, sender: "patient" | "doctor", senderName: string, text: string): { success: boolean; message?: ChatMessage } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1) {
      const newMsg: ChatMessage = {
        id: generateId("msg"),
        sender,
        sender_name: senderName,
        text,
        timestamp: new Date().toISOString()
      };
      consultations[index].messages.push(newMsg);
      consultations[index].updated_at = new Date().toISOString();
      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));
      return { success: true, message: newMsg };
    }
    return { success: false };
  },

  complete: (id: string, notes: string, prescription: string): { success: boolean; consultation?: Consultation } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1 && consultations[index].status === "active") {
      consultations[index].status = "completed";
      consultations[index].doctor_notes = notes;
      consultations[index].prescription = prescription;
      consultations[index].updated_at = new Date().toISOString();

      const systemMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "system",
        sender_name: "System",
        text: "Consultation closed. Clinical assessment, prescription, and patient care guidance have been issued.",
        timestamp: new Date().toISOString()
      };
      consultations[index].messages.push(systemMsg);

      // Distribute payout (e.g. 70% of assessment fee goes to doctor)
      const doctors = doctorApi.getAll();
      const docId = consultations[index].doctor_id;
      const docIndex = doctors.findIndex(d => d.id === docId);
      if (docIndex !== -1) {
        const share = Math.round(consultations[index].amount_paid * 0.7);
        doctors[docIndex].payout_balance += share;
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
      }

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));
      return { success: true, consultation: consultations[index] };
    }
    return { success: false };
  },

  // Calls server-side Gemini API endpoint /api/ai-assist
  generateDraftResponse: async (consultation: Consultation, draftPrompt: string): Promise<string> => {
    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_details: {
            condition: consultation.condition,
            patient_age: consultation.patient_age,
            symptoms: consultation.symptoms,
            ai_summary: consultation.ai_summary,
            doctor_notes: consultation.doctor_notes
          },
          chat_history: consultation.messages,
          prompt: draftPrompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.draft) return data.draft;
      }
      throw new Error("No draft returned from server API");
    } catch (e) {
      console.error("AI Assist endpoint failed:", e);
      return "AI Draft failed. Please construct your response manually or check your server configuration.";
    }
  }
};

// Admin and Payouts API
export const adminApi = {
  getAllPayouts: (): PayoutRequest[] => {
    return JSON.parse(localStorage.getItem(KEYS.PAYOUT_REQUESTS) || "[]");
  },

  requestPayout: (docId: string, docName: string, amount: number, bankName: string, accountNumber: string): { success: boolean; error?: string } => {
    const doctors = doctorApi.getAll();
    const docIndex = doctors.findIndex(d => d.id === docId);
    if (docIndex === -1) return { success: false, error: "Clinician not found." };
    
    const doc = doctors[docIndex];
    if (doc.payout_balance < amount) {
      return { success: false, error: "Insufficient payout balance." };
    }

    const payouts = adminApi.getAllPayouts();
    const newRequest: PayoutRequest = {
      id: generateId("pay"),
      doctor_id: docId,
      doctor_name: docName,
      amount,
      bank_name: bankName,
      account_number: accountNumber,
      status: "pending",
      created_at: new Date().toISOString()
    };

    // Deduct pending balance temporarily or keep balance and handle on approval
    // Let's deduct immediately to prevent double spending
    doctors[docIndex].payout_balance -= amount;

    payouts.push(newRequest);
    localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(payouts));
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
    return { success: true };
  },

  approvePayout: (id: string): { success: boolean } => {
    const payouts = adminApi.getAllPayouts();
    const index = payouts.findIndex(p => p.id === id);
    if (index !== -1 && payouts[index].status === "pending") {
      payouts[index].status = "approved";
      localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(payouts));
      return { success: true };
    }
    return { success: false };
  },

  rejectPayout: (id: string): { success: boolean } => {
    const payouts = adminApi.getAllPayouts();
    const index = payouts.findIndex(p => p.id === id);
    if (index !== -1 && payouts[index].status === "pending") {
      payouts[index].status = "rejected";
      
      // Refund doctor balance
      const doctors = doctorApi.getAll();
      const docIndex = doctors.findIndex(d => d.id === payouts[index].doctor_id);
      if (docIndex !== -1) {
        doctors[docIndex].payout_balance += payouts[index].amount;
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
      }

      localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(payouts));
      return { success: true };
    }
    return { success: false };
  },

  verifyClinician: (docId: string, approve: boolean): { success: boolean } => {
    const doctors = doctorApi.getAll();
    const index = doctors.findIndex(d => d.id === docId);
    if (index !== -1) {
      doctors[index].status = approve ? "active" : "suspended";
      doctors[index].verified = approve;
      localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
      return { success: true };
    }
    return { success: false };
  }
};

// Patient Authentication API
export const patientApi = {
  getAll: (): Patient[] => {
    return JSON.parse(localStorage.getItem(KEYS.PATIENTS) || "[]");
  },

  getByPhone: (phone: string): Patient | undefined => {
    return patientApi.getAll().find(p => p.phone === phone);
  },

  register: (name: string, phone: string, age: number, state: string, email: string, pin: string): { success: boolean; error?: string; patient?: Patient } => {
    const patients = patientApi.getAll();
    if (patients.some(p => p.phone === phone)) {
      return { success: false, error: "An account with this phone number already exists." };
    }

    const newPatient: Patient = {
      id: generateId("pat"),
      name,
      phone,
      age,
      state,
      email,
      pin_hash: pin
    };

    patients.push(newPatient);
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
    return { success: true, patient: newPatient };
  },

  login: (phone: string, pin: string): { success: boolean; error?: string; patient?: Patient } => {
    const patients = patientApi.getAll();
    const patient = patients.find(p => p.phone === phone && p.pin_hash === pin);
    if (!patient) {
      return { success: false, error: "Invalid phone number or secure 6-digit PIN." };
    }
    return { success: true, patient };
  }
};
