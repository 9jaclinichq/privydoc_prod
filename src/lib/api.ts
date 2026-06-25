import { Doctor, Patient, Consultation, ChatMessage, PayoutRequest } from "../types";
import { DEMO_DOCTORS, DEMO_CONSULTATIONS } from "../data";
import { generateId } from "../utils";

// Supabase Configuration with default fallbacks matching your project
const metaEnv = (import.meta as any).env || {};
const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || "https://shgrwndvdpouzcrimbhm.supabase.co";
const SUPABASE_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || "sb_publishable_YPVd8f31duUa_DbmehW50g_XoV4D1Si";

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json"
};

// Supabase API Helpers
async function supabaseFetch(table: string, query: string = ""): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Supabase fetch failed for ${table}: ${res.statusText}`);
  return res.json();
}

async function supabaseInsert(table: string, body: any): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase insert failed on ${table}: ${res.statusText}`);
  return res.json();
}

async function supabaseUpdate(table: string, matchQuery: string, body: any): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${matchQuery}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Supabase update failed on ${table}: ${res.statusText}`);
  return res.json();
}

async function supabaseEdgeFunction(name: string, body: any): Promise<any> {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`Edge Function ${name} failed`);
  return res.json();
}

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

// Data Mapper Utilities (Bridges database schema and client TypeScript models)
const mapPatientToSupabase = (p: Patient) => ({
  id: p.id,
  phone: p.phone,
  first_name: p.name,
  age_dob: p.age,
  state: p.state || null,
  email: p.email || null,
  pin_hash: p.pin_hash
});

const mapPatientFromSupabase = (s: any): Patient => ({
  id: s.id,
  name: s.first_name || s.name || "",
  phone: s.phone,
  age: s.age_dob || s.age || 0,
  state: s.state || "",
  email: s.email || "",
  pin_hash: s.pin_hash
});

const mapDoctorToSupabase = (d: Doctor) => ({
  id: d.id,
  name: d.name,
  phone: d.phone,
  mdcn_folio: d.mdcn_folio,
  apl_year: d.apl_year,
  pin_hash: d.pin_hash,
  status: d.status,
  verified: d.verified,
  bank_name: d.bank_name || null,
  bank_account: d.account_number || null,
  payout_balance: d.payout_balance
});

const mapDoctorFromSupabase = (s: any): Doctor => ({
  id: s.id,
  name: s.name,
  phone: s.phone,
  mdcn_folio: s.mdcn_folio,
  apl_year: s.apl_year,
  pin_hash: s.pin_hash,
  status: s.status || "pending",
  verified: !!s.verified,
  bank_name: s.bank_name || "",
  account_number: s.bank_account || s.account_number || "",
  payout_balance: parseFloat(s.payout_balance) || 0
});

const mapConsultationToSupabase = (c: Consultation) => ({
  id: c.id,
  patient_id: c.patient_id,
  patient_phone: c.patient_phone,
  condition_id: c.condition,
  status: c.status,
  doctor_id: c.doctor_id || null,
  doctor_name: c.doctor_name || null,
  ai_summary: c.ai_summary || null,
  doctor_notes: c.doctor_notes || null,
  prescription: c.prescription || null,
  amount_paid: c.amount_paid,
  created_at: c.created_at,
  updated_at: c.updated_at,
  messages: c.messages,
  form_data: {
    first_name: c.patient_name,
    age: c.patient_age,
    duration: c.duration,
    answers: c.raw_answers,
    symptoms: c.symptoms
  }
});

const mapConsultationFromSupabase = (s: any): Consultation => ({
  id: s.id,
  patient_id: s.patient_id || s.form_data?.patient_id || "",
  patient_name: s.form_data?.first_name || s.patient_name || "Patient",
  patient_phone: s.patient_phone,
  patient_age: s.form_data?.age || s.patient_age || 0,
  condition: s.condition_id || s.condition || "",
  duration: s.form_data?.duration || s.duration || "",
  symptoms: s.form_data?.symptoms || s.symptoms || [],
  raw_answers: s.form_data?.answers || s.raw_answers || [],
  status: s.status === "completed" ? "completed" : s.status === "active" ? "active" : "pending",
  doctor_id: s.doctor_id || undefined,
  doctor_name: s.doctor_name || undefined,
  ai_summary: s.ai_summary || undefined,
  doctor_notes: s.doctor_notes || undefined,
  prescription: s.prescription || undefined,
  amount_paid: parseFloat(s.amount_paid) || 0,
  created_at: s.created_at || new Date().toISOString(),
  updated_at: s.updated_at || new Date().toISOString(),
  messages: Array.isArray(s.messages) ? s.messages : []
});

const mapPayoutToSupabase = (p: PayoutRequest) => ({
  id: p.id,
  doctor_id: p.doctor_id,
  doctor_name: p.doctor_name,
  amount: p.amount,
  bank_name: p.bank_name,
  account_number: p.account_number,
  status: p.status,
  created_at: p.created_at
});

const mapPayoutFromSupabase = (s: any): PayoutRequest => ({
  id: s.id,
  doctor_id: s.doctor_id,
  doctor_name: s.doctor_name,
  amount: parseFloat(s.amount) || 0,
  bank_name: s.bank_name || "",
  account_number: s.account_number || "",
  status: s.status || "pending",
  created_at: s.created_at || new Date().toISOString()
});

// Background Synchronizer
export async function syncWithSupabase() {
  try {
    // 1. Sync Patients
    const dbPatients = await supabaseFetch("patients");
    if (Array.isArray(dbPatients)) {
      localStorage.setItem(KEYS.PATIENTS, JSON.stringify(dbPatients.map(mapPatientFromSupabase)));
    }

    // 2. Sync Doctors
    const dbDoctors = await supabaseFetch("doctors");
    if (Array.isArray(dbDoctors)) {
      localStorage.setItem(KEYS.DOCTORS, JSON.stringify(dbDoctors.map(mapDoctorFromSupabase)));
    }

    // 3. Sync Consultations
    const dbConsultations = await supabaseFetch("consultations");
    if (Array.isArray(dbConsultations)) {
      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(dbConsultations.map(mapConsultationFromSupabase)));
    }

    // 4. Sync Payout Requests
    const dbPayouts = await supabaseFetch("payout_requests");
    if (Array.isArray(dbPayouts)) {
      localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(dbPayouts.map(mapPayoutFromSupabase)));
    }
  } catch (e) {
    console.warn("Supabase live sync is loading or unavailable. Using LocalStorage fallback.", e);
  }
}

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

initializeStorage();
// Trigger startup database synchronization
setTimeout(syncWithSupabase, 200);

// Doctor API
export const doctorApi = {
  getAll: (): Doctor[] => {
    // Trigger background update
    syncWithSupabase();
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
      pin_hash: pin,
      status: "pending",
      verified: false,
      payout_balance: 0
    };

    doctors.push(newDoc);
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

    // Replicate live to Supabase
    supabaseInsert("doctors", mapDoctorToSupabase(newDoc)).catch(e => {
      console.error("Live registration replicate failed:", e);
    });

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

      // Replicate update to Supabase
      supabasePatch("doctors", id, { bank_name: bankName, bank_account: accountNumber }).catch(e => {
        console.error("Live payout update replicate failed:", e);
      });

      return { success: true };
    }
    return { success: false };
  }
};

// Consultations API
export const consultationApi = {
  getAll: (): Consultation[] => {
    syncWithSupabase();
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

    // Request AI summary from local backend
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

    // Replicate live to Supabase
    supabaseInsert("consultations", mapConsultationToSupabase(newConsultation)).catch(e => {
      console.error("Live consultation creation replicate failed:", e);
    });

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

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        status: "active",
        doctor_id: docId,
        doctor_name: docName,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live case claim replicate failed:", e);
      });

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

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live message replicate failed:", e);
      });

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

      // Distribute payout
      const doctors = doctorApi.getAll();
      const docId = consultations[index].doctor_id;
      const docIndex = doctors.findIndex(d => d.id === docId);
      if (docIndex !== -1) {
        const share = Math.round(consultations[index].amount_paid * 0.7);
        doctors[docIndex].payout_balance += share;
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

        // Replicate doctor balance live to Supabase
        supabasePatch("doctors", docId!, { payout_balance: doctors[docIndex].payout_balance }).catch(e => {
          console.error("Live doctor balance update replicate failed:", e);
        });
      }

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        status: "completed",
        doctor_notes: notes,
        prescription,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live completion replicate failed:", e);
      });

      return { success: true, consultation: consultations[index] };
    }
    return { success: false };
  },

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
    syncWithSupabase();
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

    doctors[docIndex].payout_balance -= amount;

    payouts.push(newRequest);
    localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(payouts));
    localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

    // Replicate live to Supabase
    supabaseInsert("payout_requests", mapPayoutToSupabase(newRequest)).catch(e => {
      console.error("Live payout request replicate failed:", e);
    });
    supabasePatch("doctors", docId, { payout_balance: doctors[docIndex].payout_balance }).catch(e => {
      console.error("Live doctor balance deduct replicate failed:", e);
    });

    return { success: true };
  },

  approvePayout: (id: string): { success: boolean } => {
    const payouts = adminApi.getAllPayouts();
    const index = payouts.findIndex(p => p.id === id);
    if (index !== -1 && payouts[index].status === "pending") {
      payouts[index].status = "approved";
      localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(payouts));

      // Replicate update to Supabase
      supabasePatch("payout_requests", id, { status: "approved" }).catch(e => {
        console.error("Live payout approval replicate failed:", e);
      });

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

        // Replicate doctor refund live to Supabase
        supabasePatch("doctors", payouts[index].doctor_id, { payout_balance: doctors[docIndex].payout_balance }).catch(e => {
          console.error("Live doctor balance refund replicate failed:", e);
        });
      }

      localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(payouts));

      // Replicate update to Supabase
      supabasePatch("payout_requests", id, { status: "rejected" }).catch(e => {
        console.error("Live payout rejection replicate failed:", e);
      });

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

      // Replicate live to Supabase
      supabasePatch("doctors", docId, { status: approve ? "active" : "suspended", verified: approve }).catch(e => {
        console.error("Live clinician verification replicate failed:", e);
      });

      return { success: true };
    }
    return { success: false };
  }
};

// Patient Authentication API
export const patientApi = {
  getAll: (): Patient[] => {
    syncWithSupabase();
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

    // Replicate live to Supabase
    supabaseInsert("patients", mapPatientToSupabase(newPatient)).catch(e => {
      console.error("Live patient registration replicate failed:", e);
    });

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

// Internal API Request helpers to bypass REST URL params cleanly
async function supabasePatch(table: string, id: string, body: any): Promise<any> {
  return supabaseUpdate(table, `id=eq.${id}`, body);
}
