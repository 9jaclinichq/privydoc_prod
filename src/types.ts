export interface Doctor {
  id: string;
  name: string;
  phone: string;
  mdcn_folio: string; // MDCN Folio Number
  apl_year: number; // Annual Practice License year
  pin_hash: string; // Login PIN hash
  status: "pending" | "active" | "suspended";
  verified: boolean;
  bank_name?: string;
  account_number?: string;
  payout_balance: number;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number;
  state?: string;
  email?: string;
  pin_hash?: string;
}

export interface ChatMessage {
  id: string;
  sender: "patient" | "doctor" | "system";
  sender_name: string;
  text: string;
  timestamp: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  patient_age: number;
  condition: string; // e.g. Erectile Dysfunction, Premature Ejaculation, Hair Loss, Prostate Health
  duration: string; // e.g. "2 weeks", "3 months"
  symptoms: string[]; // Question-answer pairs or symptom checklist
  raw_answers: { question: string; answer: string }[];
  status: "pending" | "active" | "completed";
  doctor_id?: string;
  doctor_name?: string;
  ai_summary?: string;
  doctor_notes?: string;
  prescription?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface PayoutRequest {
  id: string;
  doctor_id: string;
  doctor_name: string;
  amount: number;
  bank_name: string;
  account_number: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}
