import { Doctor, Patient, Consultation, ChatMessage, PayoutRequest, PricingConfig } from "../types";
import { DEMO_DOCTORS, DEMO_CONSULTATIONS } from "../data";
import { generateId } from "../utils";
import { getStageLabel } from "../lifecycle";
import { sha256, normPhone } from "../utils/clinical";

import { DATA } from "../services/data";

// Supabase API Helpers routed through Express Proxy
async function supabaseFetch(table: string, query: string = ""): Promise<any> {
  return DATA.get(table, query);
}

async function supabaseInsert(table: string, body: any): Promise<any> {
  return DATA.post(table, body);
}

async function supabaseUpdate(table: string, matchQuery: string, body: any): Promise<any> {
  return DATA.patch(table, matchQuery, body);
}

async function supabaseEdgeFunction(name: string, body: any): Promise<any> {
  return DATA.fn(name, body);
}

// LocalStorage Keys
const KEYS = {
  DOCTORS: "privydoc_doctors",
  PATIENTS: "privydoc_patients",
  CONSULTATIONS: "privydoc_consultations",
  PAYOUT_REQUESTS: "privydoc_payout_requests",
  CURRENT_PATIENT: "privydoc_current_patient",
  CURRENT_DOCTOR: "privydoc_current_doctor",
  CURRENT_ADMIN: "privydoc_current_admin",
  PRICING: "privydoc_pricing"
};

export const DEFAULT_PRICING: PricingConfig[] = [
  { id: "base_consultation", name: "Base Consultation", price: 7500, description: "Standard clinical evaluation of patient intake folders." },
  { id: "review_consultation", name: "Review Consultation", price: 3500, description: "Clinical follow-up review for existing prescriptions." },
  { id: "health_summary", name: "Health Summary", price: 4500, description: "Detailed clinical health audit summary compiled by a physician." },
  { id: "follow_up", name: "Follow-up", price: 2000, description: "Brief subsequent medical check-in or clarification." },
  { id: "home_care", name: "Home Care", price: 12000, description: "Virtual assisted home care and monitoring protocol guidance." },
  { id: "specialist_review", name: "Specialist Review", price: 15000, description: "Referral and detailed dossier review by an MDCN consultant." },
  { id: "ai_summary", name: "AI Summary", price: 1500, description: "Advanced semantic mapping and clinical brief compilation fee." },
];

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
  payout_balance: d.payout_balance,
  flagged: d.flagged || false,
  flag_reason: d.flag_reason || null,
  flagged_at: d.flagged_at || null,
  earnings_new: d.earnings_new || 0,
  earnings_review: d.earnings_review || 0,
  total_new: d.total_new || 0,
  total_review: d.total_review || 0,
  unpaid_new: d.unpaid_new || 0,
  unpaid_review: d.unpaid_review || 0
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
  payout_balance: parseFloat(s.payout_balance) || 0,
  flagged: !!s.flagged,
  flag_reason: s.flag_reason || "",
  flagged_at: s.flagged_at || undefined,
  earnings_new: parseFloat(s.earnings_new) || 0,
  earnings_review: parseFloat(s.earnings_review) || 0,
  total_new: parseInt(s.total_new) || 0,
  total_review: parseInt(s.total_review) || 0,
  unpaid_new: parseFloat(s.unpaid_new) || 0,
  unpaid_review: parseFloat(s.unpaid_review) || 0
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
  },
  thread_id: c.thread_id || null,
  stage: c.stage || "initial",
  form_answers: c.form_answers || null,
  red_flag: c.red_flag || false,
  red_flag_source: c.red_flag_source || null,
  is_review: c.is_review || false,
  locked_at: c.locked_at || null,
  responded_at: c.responded_at || null,
  day2_response_at: c.day2_response_at || null,
  day5_closed_at: c.day5_closed_at || null,
  patient_rating: c.patient_rating || null,
  referral_text: c.referral_text || null,
  notes: c.notes || null
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
  messages: Array.isArray(s.messages) ? s.messages : [],
  thread_id: s.thread_id || undefined,
  stage: s.stage || "initial",
  form_answers: s.form_answers || undefined,
  red_flag: s.red_flag !== undefined ? s.red_flag : undefined,
  red_flag_source: s.red_flag_source || undefined,
  is_review: s.is_review !== undefined ? s.is_review : undefined,
  locked_at: s.locked_at || undefined,
  responded_at: s.responded_at || undefined,
  day2_response_at: s.day2_response_at || undefined,
  day5_closed_at: s.day5_closed_at || undefined,
  patient_rating: s.patient_rating || undefined,
  referral_text: s.referral_text || undefined,
  notes: s.notes || undefined
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

// Background Synchronizer with secure role-based scoping
export async function syncWithSupabase() {
  console.log("[syncWithSupabase] fired at", new Date().toISOString());
  try {
    const patientSession = localStorage.getItem("privydoc_patient_session");
    const doctorSession = localStorage.getItem("privydoc_doctor_session") || localStorage.getItem("privydoc_current_doctor");
    const adminSession = localStorage.getItem("privydoc_admin_session") || localStorage.getItem("privydoc_current_admin");

    // 1. ADMIN SESSION: Sync everything
    if (adminSession === "true" || adminSession) {
      const dbPatients = await supabaseFetch("patients");
      if (Array.isArray(dbPatients)) {
        localStorage.setItem(KEYS.PATIENTS, JSON.stringify(dbPatients.map(mapPatientFromSupabase)));
      }
      const dbDoctors = await supabaseFetch("doctors");
      if (Array.isArray(dbDoctors)) {
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(dbDoctors.map(mapDoctorFromSupabase)));
      }
      const dbConsultations = await supabaseFetch("consultations");
      if (Array.isArray(dbConsultations)) {
        localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(dbConsultations.map(mapConsultationFromSupabase)));
      }
      const dbPayouts = await supabaseFetch("payout_requests");
      if (Array.isArray(dbPayouts)) {
        localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(dbPayouts.map(mapPayoutFromSupabase)));
      }
    }
    // 2. CLINICIAN SESSION: Sync doctors, consultations, and payouts (patients are scoped/not required)
    else if (doctorSession) {
      let doctorId = "";
      try {
        const doc = JSON.parse(doctorSession);
        doctorId = doc.id || "";
      } catch (e) {}

      const dbDoctors = await supabaseFetch("doctors");
      if (Array.isArray(dbDoctors)) {
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(dbDoctors.map(mapDoctorFromSupabase)));
      }
      const dbConsultations = await supabaseFetch("consultations");
      if (Array.isArray(dbConsultations)) {
        localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(dbConsultations.map(mapConsultationFromSupabase)));
      }
      if (doctorId) {
        const dbPayouts = await supabaseFetch("payout_requests", `?doctor_id=eq.${doctorId}`);
        if (Array.isArray(dbPayouts)) {
          localStorage.setItem(KEYS.PAYOUT_REQUESTS, JSON.stringify(dbPayouts.map(mapPayoutFromSupabase)));
        }
      }
    }
    // 3. PATIENT SESSION: Sync own patient record and own consultations
    else if (patientSession) {
      let phone = "";
      try {
        const pat = JSON.parse(patientSession);
        phone = pat.phone || "";
      } catch (e) {}

      if (phone) {
        const dbPatients = await supabaseFetch("patients", `?phone=eq.${encodeURIComponent(phone)}`);
        if (Array.isArray(dbPatients) && dbPatients.length > 0) {
          const syncedPatient = mapPatientFromSupabase(dbPatients[0]);
          const patients = JSON.parse(localStorage.getItem(KEYS.PATIENTS) || "[]");
          const idx = patients.findIndex((p: any) => p.phone === phone);
          if (idx !== -1) {
            patients[idx] = syncedPatient;
          } else {
            patients.push(syncedPatient);
          }
          localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
        }

        const dbConsultations = await supabaseFetch("consultations", `?patient_phone=eq.${encodeURIComponent(phone)}`);
        if (Array.isArray(dbConsultations)) {
          const localCons = JSON.parse(localStorage.getItem(KEYS.CONSULTATIONS) || "[]");
          const updatedCons = localCons.filter((c: any) => c.patient_phone !== phone);
          updatedCons.push(...dbConsultations.map(mapConsultationFromSupabase));
          localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(updatedCons));
        }
      }
    }
    // 4. ANONYMOUS / VISITOR SESSION: Only sync doctors list (needed for signup validation or displaying names)
    else {
      const dbDoctors = await supabaseFetch("doctors");
      if (Array.isArray(dbDoctors)) {
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(dbDoctors.map(mapDoctorFromSupabase)));
      }
    }

    // 5. Always Sync Pricing Configurations
    try {
      const dbPricing = await supabaseFetch("pricing");
      if (Array.isArray(dbPricing) && dbPricing.length > 0) {
        const normalizedPricing = dbPricing.map((row: any) => {
          // Confirmed via Supabase PGRST204: the "pricing" table only has "key" and
          // "value" columns - no id, name, or description. "key" is the real identifier.
          const fallback = DEFAULT_PRICING.find(p => p.id === row.key);
          const parsedValue = typeof row.value === "string" ? parseInt(row.value, 10) : row.value;
          return {
            id: row.key,
            name: row.key,
            price: typeof parsedValue === "number" && !isNaN(parsedValue) ? parsedValue : (fallback?.price ?? 0),
            description: fallback?.description ?? ""
          };
        });
        localStorage.setItem(KEYS.PRICING, JSON.stringify(normalizedPricing));
      }
    } catch (pricingErr) {
      console.error("[syncWithSupabase] pricing fetch/normalize failed", pricingErr);
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
  if (!localStorage.getItem(KEYS.PRICING)) {
    localStorage.setItem(KEYS.PRICING, JSON.stringify(DEFAULT_PRICING));
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
      pin_hash: sha256(pin),
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

  login: async (mdcn_folio: string, pin: string): Promise<{ success: boolean; error?: string; doctor?: Doctor }> => {
    try {
      const res = await fetch("/api/auth/clinician/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mdcn_folio, pin })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const doctors = doctorApi.getAll();
        const index = doctors.findIndex(d => d.id === data.doctor.id);
        if (index !== -1) {
          doctors[index] = { ...doctors[index], ...data.doctor };
        } else {
          doctors.push(data.doctor);
        }
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));
        return { success: true, doctor: data.doctor };
      } else {
        return { success: false, error: data.message || "Login failed." };
      }
    } catch (e) {
      console.error("Doctor API login fetch failed, falling back:", e);
      const doctors = doctorApi.getAll();
      const hashedPin = sha256(pin);
      const doc = doctors.find(d => d.mdcn_folio === mdcn_folio && (d.pin_hash === pin || d.pin_hash === hashedPin));
      if (!doc) {
        return { success: false, error: "Invalid MDCN Folio Number or PIN." };
      }
      if (doc.status === "suspended") {
        return { success: false, error: "Your clinician account is suspended. Please contact Admin." };
      }
      return { success: true, doctor: doc };
    }
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
    const target = normPhone(phone);
    return consultationApi.getAll().filter(c => normPhone(c.patient_phone) === target);
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
      const lockedAt = new Date().toISOString();
      const threadId = consultations[index].thread_id || "thread_" + id;

      consultations[index].status = "active";
      consultations[index].stage = "initial";
      consultations[index].locked_at = lockedAt;
      consultations[index].thread_id = threadId;
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
        stage: "initial",
        locked_at: lockedAt,
        thread_id: threadId,
        doctor_id: docId,
        doctor_name: docName,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live case claim replicate failed:", e);
      });

      // Ensure thread exists in database
      supabaseInsert("threads", {
        id: threadId,
        patient_phone: consultations[index].patient_phone,
        condition: consultations[index].condition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).catch(e => {
        // may already exist, swallow
      });

      // Persist accepting system message to messages table
      supabaseInsert("messages", {
        id: systemMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "system",
        sender_name: "System",
        text: systemMsg.text,
        timestamp: systemMsg.timestamp,
        stage_label: "initial"
      }).catch(e => {
        console.error("Could not write system accept message to database:", e);
      });

      return { success: true, consultation: consultations[index] };
    }
    return { success: false };
  },

  // Fetch a single consultation fresh from Supabase (bypassing the local cache) and
  // write it back into the cached list. Used by chat polling and by addMessage, so a
  // message sent from one device is appended onto the OTHER party's latest messages
  // instead of onto a possibly-stale local array (which previously overwrote whichever
  // side hadn't synced yet when the full messages array was patched back).
  refreshConsultation: async (id: string): Promise<Consultation | null> => {
    try {
      const rows = await supabaseFetch("consultations", `?id=eq.${id}`);
      if (Array.isArray(rows) && rows.length > 0) {
        const fresh = mapConsultationFromSupabase(rows[0]);
        if (process.env.NODE_ENV !== 'production' && !fresh.thread_id) {
          console.warn("[refreshConsultation] thread_id is null/undefined while polling", { consultation_id: id });
        }
        const consultations = consultationApi.getAll();
        const idx = consultations.findIndex(c => c.id === id);
        if (idx !== -1) {
          consultations[idx] = fresh;
        } else {
          consultations.push(fresh);
        }
        localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));
        return fresh;
      }
    } catch (e) {
      console.error("[refreshConsultation] failed to fetch latest consultation:", e);
    }
    return null;
  },

  addMessage: async (id: string, sender: "patient" | "doctor", senderName: string, text: string): Promise<{ success: boolean; message?: ChatMessage; consultation?: Consultation }> => {
    const fresh = await consultationApi.refreshConsultation(id);
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1) {
      if (fresh) {
        consultations[index] = fresh;
      }

      if (process.env.NODE_ENV !== 'production' && !consultations[index].thread_id) {
        console.warn("[addMessage] thread_id is null/undefined while sending", { consultation_id: id, sender });
      }
      const threadId = consultations[index].thread_id || "thread_" + id;
      consultations[index].thread_id = threadId;

      const newMsg: ChatMessage = {
        id: generateId("msg"),
        sender,
        sender_name: senderName,
        text,
        timestamp: new Date().toISOString()
      };
      console.log("[addMessage] sending", { consultation_id: id, thread_id: threadId, sender, text });
      consultations[index].messages = [...(consultations[index].messages || []), newMsg];
      consultations[index].updated_at = new Date().toISOString();

      // Clinical Lifecycle state transition
      // First doctor response: move stage from initial to day2_pending
      if (sender === "doctor" && (consultations[index].stage === "initial" || !consultations[index].stage)) {
        consultations[index].stage = "day2_pending";
        consultations[index].responded_at = new Date().toISOString();
      }

        // Dispatch patient notification on doctor response
      if (sender === "doctor") {
        const patientPhone = consultations[index].patient_phone;
        const patientName = consultations[index].patient_name || "Patient";
        const doctorName = consultations[index].doctor_name || senderName || "Doctor";
        const condition = consultations[index].condition || "telehealth case";

        supabaseEdgeFunction("send-whatsapp", {
          phone: patientPhone,
          template: "doctor_responded",
          variables: [patientName, doctorName, condition]
        }).catch(() => {});

        // Also insert an in-app notification for the patient
        supabaseInsert("notifications", {
          id: "not_" + Math.random().toString(36).substr(2, 9),
          recipient_id: patientPhone,
          recipient_role: "patient",
          type: "response",
          title: "Doctor Responded",
          message: `Your medical specialist Dr. ${doctorName} has responded to your consultation for ${condition}. Please review and check in.`,
          is_read: false,
          created_at: new Date().toISOString()
        }).catch(e => {});
      }

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      const currentStage = consultations[index].stage || "initial";
      const stageLabel = getStageLabel(currentStage as any);

      // Replicate live to Supabase consultations
      supabasePatch("consultations", id, {
        messages: consultations[index].messages,
        stage: consultations[index].stage || "initial",
        thread_id: threadId,
        responded_at: consultations[index].responded_at || null,
        updated_at: consultations[index].updated_at
      })
        .then(() => console.log("[addMessage] consultation.messages replicated to Supabase", { consultation_id: id, thread_id: threadId, message_count: consultations[index].messages.length }))
        .catch(e => {
          console.error("Live message replicate failed:", e);
        });

      // Persist message to messages table
      supabaseInsert("messages", {
        id: newMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender,
        sender_name: senderName,
        text,
        timestamp: newMsg.timestamp,
        stage_label: stageLabel
      }).catch(e => {
        console.error("Could not persist message to messages table:", e);
      });

      // Create audit log row for response_sent
      supabaseInsert("audit_log", {
        id: "aud_resp_" + Math.random().toString(36).substr(2, 9),
        action: "response_sent",
        actor_type: sender,
        actor_id: sender === "doctor" ? "doctor_clearance" : "patient_phone",
        target_type: "consultation",
        target_id: id,
        detail: `${senderName} (${sender}) sent chat response: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`,
        created_at: new Date().toISOString()
      }).catch(e => {
        console.error("Could not persist response_sent audit log:", e);
      });

      return { success: true, message: newMsg, consultation: consultations[index] };
    }
    return { success: false };
  },

  complete: (id: string, notes: string, prescription: string): { success: boolean; consultation?: Consultation } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1 && consultations[index].status === "active") {
      const threadId = consultations[index].thread_id || "thread_" + id;
      const closedAt = new Date().toISOString();

      consultations[index].status = "completed";
      consultations[index].stage = "day5_closed";
      consultations[index].day5_closed_at = closedAt;
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
        doctors[docIndex].earnings_new = (doctors[docIndex].earnings_new || 0) + share;
        doctors[docIndex].unpaid_new = (doctors[docIndex].unpaid_new || 0) + share;
        doctors[docIndex].total_new = (doctors[docIndex].total_new || 0) + 1;
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

        // Replicate doctor balance live to Supabase
        supabasePatch("doctors", docId!, { 
          payout_balance: doctors[docIndex].payout_balance,
          earnings_new: doctors[docIndex].earnings_new,
          unpaid_new: doctors[docIndex].unpaid_new,
          total_new: doctors[docIndex].total_new
        }).catch(e => {
          console.error("Live doctor balance update replicate failed:", e);
        });

        // Insert payment credit for tracking doctor payout earnings
        supabaseInsert("payment_credits", {
          id: "cred_" + Math.random().toString(36).substr(2, 9),
          doctor_id: docId,
          consultation_id: id,
          amount_earned: share,
          payment_type: "new",
          payout_status: "unpaid",
          created_at: new Date().toISOString()
        }).catch(e => {
          console.error("Failed to log payment credit earnings:", e);
        });
      }

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        status: "completed",
        stage: "day5_closed",
        day5_closed_at: closedAt,
        doctor_notes: notes,
        prescription,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live completion replicate failed:", e);
      });

      // Persist system close message to messages table
      supabaseInsert("messages", {
        id: systemMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "system",
        sender_name: "System",
        text: systemMsg.text,
        timestamp: systemMsg.timestamp,
        stage_label: "day5"
      }).catch(e => {
        console.error("Could not write system complete message to messages table:", e);
      });

      return { success: true, consultation: consultations[index] };
    }
    return { success: false };
  },

  sendDay2Checkin: (id: string, messageText: string, docName: string): { success: boolean; message?: ChatMessage } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1) {
      const threadId = consultations[index].thread_id || "thread_" + id;
      const responseTime = new Date().toISOString();

      consultations[index].stage = "day2_sent";
      consultations[index].day2_response_at = responseTime;
      consultations[index].updated_at = new Date().toISOString();

      const newMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "doctor",
        sender_name: docName,
        text: messageText,
        timestamp: responseTime
      };
      consultations[index].messages.push(newMsg);

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        stage: "day2_sent",
        day2_response_at: responseTime,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live Day-2 check-in replicate failed:", e);
      });

      // Persist to messages table
      supabaseInsert("messages", {
        id: newMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "doctor",
        sender_name: docName,
        text: messageText,
        timestamp: responseTime,
        stage_label: "day2"
      }).catch(e => {
        console.error("Could not write Day-2 check-in message to messages table:", e);
      });

      return { success: true, message: newMsg };
    }
    return { success: false };
  },

  progressToDay5: (id: string): { success: boolean; systemMessage?: ChatMessage } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1) {
      const threadId = consultations[index].thread_id || "thread_" + id;
      const timestamp = new Date().toISOString();

      consultations[index].stage = "day5_pending";
      consultations[index].updated_at = timestamp;

      const systemMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "system",
        sender_name: "System",
        text: "Day-5 Evaluation is now active. Direct medical dialogue remains available for clinical closure assessment.",
        timestamp
      };
      consultations[index].messages.push(systemMsg);

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        stage: "day5_pending",
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live progress to Day-5 replicate failed:", e);
      });

      // Persist system message to messages table
      supabaseInsert("messages", {
        id: systemMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "system",
        sender_name: "System",
        text: systemMsg.text,
        timestamp,
        stage_label: "day5"
      }).catch(e => {
        console.error("Could not write Day-5 system message to messages table:", e);
      });

      return { success: true, systemMessage: systemMsg };
    }
    return { success: false };
  },

  requestReview: (id: string, text: string, rating: number): { success: boolean; message?: ChatMessage } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1) {
      const threadId = consultations[index].thread_id || "thread_" + id;
      const timestamp = new Date().toISOString();

      consultations[index].status = "active";
      consultations[index].stage = "review_open";
      consultations[index].is_review = true;
      consultations[index].patient_rating = rating;
      consultations[index].updated_at = timestamp;

      const newMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "patient",
        sender_name: "Patient",
        text: text,
        timestamp
      };
      consultations[index].messages.push(newMsg);

      const systemMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "system",
        sender_name: "System",
        text: `Review requested with a ${rating}-star rating. Direct medical dialogue re-opened.`,
        timestamp
      };
      consultations[index].messages.push(systemMsg);

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        status: "active",
        stage: "review_open",
        is_review: true,
        patient_rating: rating,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live request review replicate failed:", e);
      });

      // Persist message to messages table
      supabaseInsert("messages", {
        id: newMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "patient",
        sender_name: "Patient",
        text,
        timestamp,
        stage_label: "review"
      }).catch(e => {
        console.error("Could not write review request message to messages table:", e);
      });

      supabaseInsert("messages", {
        id: systemMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "system",
        sender_name: "System",
        text: systemMsg.text,
        timestamp,
        stage_label: "review"
      }).catch(e => {
        console.error("Could not write system review request message to messages table:", e);
      });

      return { success: true, message: newMsg };
    }
    return { success: false };
  },

  resolveReview: (id: string, notes: string, prescription: string): { success: boolean; consultation?: Consultation } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1 && consultations[index].stage === "review_open") {
      const threadId = consultations[index].thread_id || "thread_" + id;
      const timestamp = new Date().toISOString();

      consultations[index].status = "completed";
      consultations[index].stage = "review_closed";
      consultations[index].doctor_notes = notes;
      consultations[index].prescription = prescription;
      consultations[index].updated_at = timestamp;

      const systemMsg: ChatMessage = {
        id: generateId("msg"),
        sender: "system",
        sender_name: "System",
        text: "Review resolved. Clinical assessment and updated prescription archived.",
        timestamp
      };
      consultations[index].messages.push(systemMsg);

      // Distribute review payout
      const doctors = doctorApi.getAll();
      const docId = consultations[index].doctor_id;
      const docIndex = doctors.findIndex(d => d.id === docId);
      if (docIndex !== -1) {
        const share = Math.round((consultations[index].amount_paid || 3500) * 0.7);
        doctors[docIndex].payout_balance += share;
        doctors[docIndex].earnings_review = (doctors[docIndex].earnings_review || 0) + share;
        doctors[docIndex].unpaid_review = (doctors[docIndex].unpaid_review || 0) + share;
        doctors[docIndex].total_review = (doctors[docIndex].total_review || 0) + 1;
        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

        // Replicate doctor stats live to Supabase
        supabasePatch("doctors", docId!, { 
          payout_balance: doctors[docIndex].payout_balance,
          earnings_review: doctors[docIndex].earnings_review,
          unpaid_review: doctors[docIndex].unpaid_review,
          total_review: doctors[docIndex].total_review
        }).catch(e => {
          console.error("Live doctor review balance update replicate failed:", e);
        });

        // Insert payment credit for tracking doctor payout earnings
        supabaseInsert("payment_credits", {
          id: "cred_" + Math.random().toString(36).substr(2, 9),
          doctor_id: docId,
          consultation_id: id,
          amount_earned: share,
          payment_type: "review",
          payout_status: "unpaid",
          created_at: new Date().toISOString()
        }).catch(e => {
          console.error("Failed to log review payment credit earnings:", e);
        });
      }

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        status: "completed",
        stage: "review_closed",
        doctor_notes: notes,
        prescription,
        messages: consultations[index].messages,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live resolve review replicate failed:", e);
      });

      // Persist system resolve message to messages table
      supabaseInsert("messages", {
        id: systemMsg.id,
        thread_id: threadId,
        consultation_id: id,
        sender: "system",
        sender_name: "System",
        text: systemMsg.text,
        timestamp,
        stage_label: "review"
      }).catch(e => {
        console.error("Could not write system resolve message to messages table:", e);
      });

      return { success: true, consultation: consultations[index] };
    }
    return { success: false };
  },

  updateReferral: (id: string, referralText: string): { success: boolean; consultation?: Consultation } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === id);
    if (index !== -1) {
      consultations[index].referral_text = referralText;
      consultations[index].updated_at = new Date().toISOString();

      localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

      // Replicate live to Supabase
      supabasePatch("consultations", id, {
        referral_text: referralText,
        updated_at: consultations[index].updated_at
      }).catch(e => {
        console.error("Live referral_text update replicate failed:", e);
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
      
      // Update unpaid balances
      const doctors = doctorApi.getAll();
      const docIndex = doctors.findIndex(d => d.id === payouts[index].doctor_id);
      if (docIndex !== -1) {
        let remainingDeduct = payouts[index].amount;
        
        // Deduct from unpaid_review first
        const reviewUnpaid = doctors[docIndex].unpaid_review || 0;
        if (reviewUnpaid >= remainingDeduct) {
          doctors[docIndex].unpaid_review = reviewUnpaid - remainingDeduct;
          remainingDeduct = 0;
        } else {
          doctors[docIndex].unpaid_review = 0;
          remainingDeduct -= reviewUnpaid;
        }

        // Deduct remaining from unpaid_new
        if (remainingDeduct > 0) {
          const newUnpaid = doctors[docIndex].unpaid_new || 0;
          doctors[docIndex].unpaid_new = Math.max(0, newUnpaid - remainingDeduct);
        }

        localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

        // Replicate live to Supabase
        supabasePatch("doctors", payouts[index].doctor_id, {
          unpaid_new: doctors[docIndex].unpaid_new,
          unpaid_review: doctors[docIndex].unpaid_review
        }).catch(e => {
          console.error("Live unpaid earnings deduct replicate failed:", e);
        });
      }

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

      // Insert audit log
      supabaseInsert("audit_log", {
        id: "aud_" + Math.random().toString(36).substr(2, 9),
        action: approve ? "doctor_activated" : "doctor_suspended",
        actor_type: "admin",
        actor_id: "admin_clearance",
        target_type: "doctor",
        target_id: docId,
        detail: approve ? "Approved and verified MDCN clinical license." : "Revoked verification. Status set to suspended.",
        created_at: new Date().toISOString()
      }).catch(e => {
        console.error("Could not write audit log entry:", e);
      });

      // Insert notification
      supabaseInsert("notifications", {
        id: "not_" + Math.random().toString(36).substr(2, 9),
        recipient_id: docId,
        recipient_role: "doctor",
        type: approve ? "payout" : "suspension",
        title: approve ? "Clinical Account Verified" : "Verification Revoked",
        message: approve 
          ? "Congratulations! Your MDCN clinical license has been successfully verified. Your account is now active."
          : "Your verified practicing credentials have been revoked. Please contact the Admin Office.",
        is_read: false,
        created_at: new Date().toISOString()
      }).catch(e => {
        console.error("Could not write notification log entry:", e);
      });

      return { success: true };
    }
    return { success: false };
  },

  flagClinician: (docId: string, flagged: boolean, reason: string, status?: "active" | "suspended"): { success: boolean } => {
    const doctors = doctorApi.getAll();
    const index = doctors.findIndex(d => d.id === docId);
    if (index !== -1) {
      doctors[index].flagged = flagged;
      doctors[index].flag_reason = flagged ? reason : "";
      doctors[index].flagged_at = flagged ? new Date().toISOString() : undefined;
      if (status) {
        doctors[index].status = status;
      }
      localStorage.setItem(KEYS.DOCTORS, JSON.stringify(doctors));

      // Replicate live to Supabase
      supabasePatch("doctors", docId, {
        flagged,
        flag_reason: flagged ? reason : null,
        flagged_at: flagged ? new Date().toISOString() : null,
        status: status || doctors[index].status
      }).catch(e => {
        console.error("Live clinician flagging replicate failed:", e);
      });

      // Insert audit log
      supabaseInsert("audit_log", {
        id: "aud_" + Math.random().toString(36).substr(2, 9),
        action: flagged ? "doctor_flagged" : "doctor_unflagged",
        actor_type: "admin",
        actor_id: "admin_clearance",
        target_type: "doctor",
        target_id: docId,
        detail: flagged ? `Flagged: ${reason}. Status set to ${status || doctors[index].status}.` : "Flag removed.",
        created_at: new Date().toISOString()
      }).catch(e => {
        console.error("Could not write audit log entry:", e);
      });

      // Insert notification
      supabaseInsert("notifications", {
        id: "not_" + Math.random().toString(36).substr(2, 9),
        recipient_id: docId,
        recipient_role: "doctor",
        type: status === "suspended" ? "suspension" : "flag",
        title: status === "suspended" ? "Clinical Credentials Suspended" : "Compliance Hold Flagged",
        message: flagged
          ? `Compliance Hold/Flag set on your clinician portfolio. Reason: ${reason}. Please update your credentials.`
          : "Flag or compliance hold removed from your clinician portfolio.",
        is_read: false,
        created_at: new Date().toISOString()
      }).catch(e => {
        console.error("Could not write notification log entry:", e);
      });

      return { success: true };
    }
    return { success: false };
  },

  reassignCase: (consId: string, toDoctorId: string | null, reason: string): { success: boolean } => {
    const consultations = consultationApi.getAll();
    const index = consultations.findIndex(c => c.id === consId);
    if (index === -1) return { success: false };

    const cons = consultations[index];
    const fromDoctorId = cons.doctor_id || null;
    
    // Find previous and new doctor names
    const doctors = doctorApi.getAll();
    const fromDoc = doctors.find(d => d.id === fromDoctorId);
    const toDoc = toDoctorId ? doctors.find(d => d.id === toDoctorId) : null;

    const fromDocName = fromDoc ? fromDoc.name : "unassigned";
    const toDocName = toDoc ? toDoc.name : "pool (unassigned)";

    // Update consultation locally
    cons.doctor_id = toDoctorId || undefined;
    cons.doctor_name = toDoc ? toDoc.name : undefined;
    cons.locked_at = toDoctorId ? new Date().toISOString() : undefined;
    
    localStorage.setItem(KEYS.CONSULTATIONS, JSON.stringify(consultations));

    // Replicate live to Supabase
    supabasePatch("consultations", consId, {
      doctor_id: toDoctorId,
      doctor_name: toDoc ? toDoc.name : null,
      locked_at: toDoctorId ? new Date().toISOString() : null
    }).catch(e => {
      console.error("Live consultation reassignment replicate failed:", e);
    });

    // Create reassignment_log row in Supabase
    const reassignLogId = "reas_" + Math.random().toString(36).substr(2, 9);
    supabaseInsert("reassignment_log", {
      id: reassignLogId,
      consultation_id: consId,
      from_doctor_id: fromDoctorId,
      to_doctor_id: toDoctorId,
      reason,
      created_at: new Date().toISOString()
    }).catch(e => {
      console.error("Live reassignment log write failed:", e);
    });

    // Create audit_log row in Supabase
    supabaseInsert("audit_log", {
      id: "aud_" + Math.random().toString(36).substr(2, 9),
      action: "case_reassigned",
      actor_type: "admin",
      actor_id: "admin_clearance",
      target_type: "consultation",
      target_id: consId,
      detail: `Reassigned from Dr. ${fromDocName} to Dr. ${toDocName}. Reason: ${reason}`,
      created_at: new Date().toISOString()
    }).catch(e => {
      console.error("Live audit log write failed:", e);
    });

    // Create notifications
    if (fromDoctorId) {
      supabaseInsert("notifications", {
        id: "not_" + Math.random().toString(36).substr(2, 9),
        recipient_id: fromDoctorId,
        recipient_role: "doctor",
        type: "flag",
        title: "Case Reassigned / Removed",
        message: `Case ${consId} (Patient: ${cons.patient_name || "Patient"}) has been reassigned to ${toDocName} by Admin. Reason: ${reason}`,
        is_read: false,
        created_at: new Date().toISOString()
      }).catch(e => {});
    }

    if (toDoctorId) {
      supabaseInsert("notifications", {
        id: "not_" + Math.random().toString(36).substr(2, 9),
        recipient_id: toDoctorId,
        recipient_role: "doctor",
        type: "new_case",
        title: "New Case Assigned",
        message: `A case for patient ${cons.patient_name || "Patient"} has been directly reassigned/assigned to you by Admin. Stage: ${cons.stage || "initial"}.`,
        is_read: false,
        created_at: new Date().toISOString()
      }).catch(e => {});

      // Send WhatsApp notification to the new doctor (fire-and-forget)
      supabaseEdgeFunction("send-whatsapp", {
        phone: toDoc?.phone,
        template: "new_case_notification",
        variables: [toDoc?.name, cons.patient_name || "Patient", cons.condition || "telehealth case"]
      }).catch(() => {});
    }

    return { success: true };
  },

  broadcastMessage: (role: "doctor" | "patient" | "all", title: string, message: string): { success: boolean } => {
    // Audit log
    supabaseInsert("audit_log", {
      id: "aud_" + Math.random().toString(36).substr(2, 9),
      action: "broadcast_sent",
      actor_type: "admin",
      actor_id: "admin_clearance",
      target_type: "broadcast",
      target_id: role,
      detail: `Broadcast [${title}] sent to ${role}. Message: ${message}`,
      created_at: new Date().toISOString()
    }).catch(e => {
      console.error("Live audit log write failed:", e);
    });

    // Create system notification for all matching roles
    if (role === "doctor" || role === "all") {
      const doctors = doctorApi.getAll();
      doctors.forEach(doc => {
        supabaseInsert("notifications", {
          id: "not_" + Math.random().toString(36).substr(2, 9),
          recipient_id: doc.id,
          recipient_role: "doctor",
          type: "broadcast",
          title,
          message,
          is_read: false,
          created_at: new Date().toISOString()
        }).catch(e => {});
      });
    }

    if (role === "patient" || role === "all") {
      const patients = patientApi.getAll();
      patients.forEach(pat => {
        supabaseInsert("notifications", {
          id: "not_" + Math.random().toString(36).substr(2, 9),
          recipient_id: pat.phone,
          recipient_role: "patient",
          type: "broadcast",
          title,
          message,
          is_read: false,
          created_at: new Date().toISOString()
        }).catch(e => {});
      });
    }

    return { success: true };
  }
};

// Dynamic Pricing Configuration API
export const pricingApi = {
  getAll: (): PricingConfig[] => {
    const stored = localStorage.getItem(KEYS.PRICING);
    if (!stored) {
      localStorage.setItem(KEYS.PRICING, JSON.stringify(DEFAULT_PRICING));
      return DEFAULT_PRICING;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return DEFAULT_PRICING;
    }
  },

  getById: (id: string): PricingConfig | undefined => {
    return pricingApi.getAll().find(p => p.id === id);
  },

  updateAll: (pricing: PricingConfig[]): { success: boolean } => {
    localStorage.setItem(KEYS.PRICING, JSON.stringify(pricing));

    // Attempt live replication to Supabase - the "pricing" table only has key/value
    // columns (confirmed via PGRST204), so only "value" is sent, filtered by "key".
    pricing.forEach(p => {
      const payload = { value: String(p.price) };
      console.log("[pricingApi.updateAll] sending", { key: p.id, payload });
      supabaseUpdate("pricing", `key=eq.${p.id}`, payload)
        .then(res => console.log("[pricingApi.updateAll] Supabase update succeeded for", p.id, res))
        .catch(e => console.error("[pricingApi.updateAll] Supabase update FAILED for", p.id, e));
    });

    return { success: true };
  },

  updatePrice: (id: string, price: number): { success: boolean } => {
    const pricing = pricingApi.getAll();
    const idx = pricing.findIndex(p => p.id === id);
    if (idx !== -1) {
      pricing[idx].price = price;
      localStorage.setItem(KEYS.PRICING, JSON.stringify(pricing));

      const payload = { value: String(price) };
      console.log("[pricingApi.updatePrice] sending", { key: id, payload });
      supabaseUpdate("pricing", `key=eq.${id}`, payload)
        .then(res => console.log("[pricingApi.updatePrice] Supabase update succeeded for", id, res))
        .catch(e => console.error("[pricingApi.updatePrice] Supabase update FAILED for", id, e));

      // Write audit log entry for price_changed
      supabaseInsert("audit_log", {
        id: "aud_" + Math.random().toString(36).substr(2, 9),
        action: "price_changed",
        actor_type: "admin",
        actor_id: "admin_clearance",
        target_type: "pricing",
        target_id: id,
        detail: `Updated price config for ${id} to ₦${price}`,
        created_at: new Date().toISOString()
      }).catch(e => {
        console.error("Could not write audit log entry:", e);
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
    return patientApi.getAll().find(p => p.phone === normPhone(phone));
  },

  register: (name: string, phone: string, age: number, state: string, email: string, pin: string): { success: boolean; error?: string; patient?: Patient } => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return { success: false, error: "A valid email address is required to register." };
    }

    const normalizedPhone = normPhone(phone);
    const patients = patientApi.getAll();
    if (patients.some(p => p.phone === normalizedPhone)) {
      return { success: false, error: "An account with this phone number already exists." };
    }

    const newPatient: Patient = {
      id: generateId("pat"),
      name,
      phone: normalizedPhone,
      age,
      state,
      email,
      pin_hash: sha256(pin)
    };

    patients.push(newPatient);
    localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));

    // Replicate live to Supabase
    supabaseInsert("patients", mapPatientToSupabase(newPatient)).catch(e => {
      console.error("Live patient registration replicate failed:", e);
    });

    return { success: true, patient: newPatient };
  },

  login: async (phone: string, pin: string): Promise<{ success: boolean; error?: string; patient?: Patient }> => {
    try {
      const res = await fetch("/api/auth/patient/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const patients = patientApi.getAll();
        const index = patients.findIndex(p => p.id === data.patient.id);
        if (index !== -1) {
          patients[index] = { ...patients[index], ...data.patient };
        } else {
          patients.push(data.patient);
        }
        localStorage.setItem(KEYS.PATIENTS, JSON.stringify(patients));
        return { success: true, patient: data.patient };
      } else {
        return { success: false, error: data.message || "Login failed." };
      }
    } catch (e) {
      console.error("Patient API login fetch failed, falling back:", e);
      const patients = patientApi.getAll();
      const hashedPin = sha256(pin);
      const patient = patients.find(p => p.phone === normPhone(phone) && (p.pin_hash === pin || p.pin_hash === hashedPin));
      if (!patient) {
        return { success: false, error: "Invalid phone number or secure 6-digit PIN." };
      }
      return { success: true, patient };
    }
  },

  sendOtp: async (phone: string, channel: "whatsapp" | "email" | "both" = "whatsapp", email?: string): Promise<{ success: boolean; error?: string; test_bypass?: string }> => {
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, channel, email })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        return { success: true, test_bypass: data.test_bypass };
      } else {
        return { success: false, error: data.message || "Failed to dispatch verification code." };
      }
    } catch (e) {
      console.error("OTP send failed:", e);
      return { success: false, error: "OTP dispatch service offline." };
    }
  },

  verifyOtp: async (phone: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.message || "Incorrect verification code." };
      }
    } catch (e) {
      console.error("OTP verify failed:", e);
      return { success: false, error: "Verification service offline." };
    }
  }
};

// Internal API Request helpers to bypass REST URL params cleanly
async function supabasePatch(table: string, id: string, body: any): Promise<any> {
  return supabaseUpdate(table, `id=eq.${id}`, body);
}
