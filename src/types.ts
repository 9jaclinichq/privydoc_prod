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

  // Canonical Production Fields
  flagged?: boolean;
  flag_reason?: string;
  flagged_at?: string;
  earnings_new?: number;
  earnings_review?: number;
  total_new?: number;
  total_review?: number;
  unpaid_new?: number;
  unpaid_review?: number;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age: number; // stored as birth year (e.g. 1990)
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
  patient_age: number; // derived display age (e.g. 36) or birth year
  condition: string; // e.g. Erectile Dysfunction, Premature Ejaculation, Hair Loss, Prostate Health
  duration: string; // e.g. "2 weeks", "3 months"
  symptoms: string[]; // Question-answer pairs or symptom checklist
  raw_answers: { question: string; answer: string }[];
  status: "pending" | "active" | "completed"; // Derived from stage (PENDING_DOCTOR | DOCTOR_RESPONDED | COMPLETED)
  doctor_id?: string;
  doctor_name?: string;
  ai_summary?: string;
  doctor_notes?: string;
  prescription?: string;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];

  // Canonical Production Fields
  thread_id?: string;
  stage?: "initial" | "day2_pending" | "day2_sent" | "day5_pending" | "day5_closed" | "review_open" | "review_closed";
  form_answers?: any; // intake answers (form_answers || form_data)
  red_flag?: boolean;
  red_flag_source?: "intake" | "ai" | null;
  is_review?: boolean;
  locked_at?: string; // claim timestamp
  responded_at?: string; // doctor first response timestamp
  day2_response_at?: string;
  day5_closed_at?: string;
  patient_rating?: number; // 1 to 5 stars
  referral_text?: string; // clinical referral letter findings/urgency
  notes?: string;
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

export interface PricingConfig {
  id: string;
  name: string;
  price: number;
  description: string;
}

// Canonical Production Schema Interfaces
export interface Thread {
  id: string;
  patient_phone: string;
  condition: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  consultation_id?: string;
  sender: "patient" | "doctor" | "system";
  sender_name: string;
  text: string;
  timestamp: string;
  stage_label?: string; // initial, day2, day5, review, etc.
}

export interface Notification {
  id: string;
  recipient_id: string; // patient phone or doctor id
  recipient_role: "patient" | "doctor" | "admin";
  type: "flag" | "suspension" | "new_case" | "response" | "payout" | "broadcast";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface Dispute {
  id: string;
  consultation_id: string;
  patient_phone: string;
  reason: string;
  status: "open" | "resolved";
  resolution_details?: string;
  resolved_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: "response_sent" | "case_closed" | "doctor_suspended" | "doctor_activated" | "doctor_flagged" | "doctor_unflagged" | "case_reassigned" | "price_changed" | "broadcast_sent" | "ai_assist_generated" | "dispute_resolved";
  actor_type: "patient" | "doctor" | "admin" | "system";
  actor_id: string;
  target_type: string;
  target_id: string;
  detail: string;
  created_at: string;
}

export interface PaymentLog {
  id: string;
  tx_ref: string;
  patient_phone: string;
  amount: number;
  payment_type: "new" | "review" | "health_profile";
  verified: boolean;
  paid_at: string;
}

export interface PaymentCredit {
  id: string;
  consultation_id: string;
  doctor_id: string;
  amount_earned: number;
  payment_type: "new" | "review";
  payout_status: "unpaid" | "paid";
  paid_at?: string;
  created_at: string;
}

export interface OtpCode {
  id: string;
  phone: string;
  code_hash: string;
  expires_at: string;
  created_at: string;
  is_used: boolean;
}
