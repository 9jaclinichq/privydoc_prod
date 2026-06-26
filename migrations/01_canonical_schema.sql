-- PrivyDoc — Canonical Production Schema Migration
-- IDEMPOTENT. Safe to run repeatedly.

-- 1. Extend existing tables
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE IF EXISTS patients ADD COLUMN IF NOT EXISTS pin_hash text;

ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS flagged boolean DEFAULT false;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS flagged_at timestamptz;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS earnings_new numeric DEFAULT 0;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS earnings_review numeric DEFAULT 0;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS total_new numeric DEFAULT 0;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS total_review numeric DEFAULT 0;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS unpaid_new numeric DEFAULT 0;
ALTER TABLE IF EXISTS doctors ADD COLUMN IF NOT EXISTS unpaid_review numeric DEFAULT 0;

ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS thread_id text;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS stage text DEFAULT 'initial';
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS form_answers jsonb;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS red_flag boolean DEFAULT false;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS red_flag_source text;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS is_review boolean DEFAULT false;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS locked_at timestamptz;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS responded_at timestamptz;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS day2_response_at timestamptz;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS day5_closed_at timestamptz;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS patient_rating integer;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS referral_text text;
ALTER TABLE IF EXISTS consultations ADD COLUMN IF NOT EXISTS notes text;

-- 2. Create canonical tables
CREATE TABLE IF NOT EXISTS threads (
  id text PRIMARY KEY,
  patient_phone text NOT NULL,
  condition text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  consultation_id text,
  sender text NOT NULL, -- patient, doctor, system
  sender_name text NOT NULL,
  text text NOT NULL,
  timestamp timestamptz DEFAULT now(),
  stage_label text -- initial, day2, day5, review, etc.
);

CREATE TABLE IF NOT EXISTS payments_log (
  id text PRIMARY KEY,
  tx_ref text UNIQUE,
  patient_phone text NOT NULL,
  amount numeric NOT NULL,
  payment_type text NOT NULL, -- new, review, health_profile
  verified boolean DEFAULT false,
  paid_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_credits (
  id text PRIMARY KEY,
  consultation_id text NOT NULL,
  doctor_id text NOT NULL,
  amount_earned numeric NOT NULL,
  payment_type text NOT NULL, -- new, review
  payout_status text DEFAULT 'unpaid', -- unpaid, paid
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  recipient_id text NOT NULL,
  recipient_role text NOT NULL, -- patient, doctor, admin
  type text NOT NULL, -- flag, suspension, new_case, response, payout, broadcast
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_chats (
  id text PRIMARY KEY,
  patient_phone text NOT NULL,
  message text NOT NULL,
  sender text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS response_templates (
  id text PRIMARY KEY,
  doctor_id text,
  title text NOT NULL,
  content text NOT NULL,
  condition text NOT NULL, -- ED, PE, STI, LSD, GHC
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id text PRIMARY KEY,
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_used boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS otp_requests (
  id text PRIMARY KEY,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_daily (
  day date PRIMARY KEY DEFAULT CURRENT_DATE,
  count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reassignment_log (
  id text PRIMARY KEY,
  consultation_id text NOT NULL,
  from_doctor_id text,
  to_doctor_id text,
  reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followups (
  id text PRIMARY KEY,
  consultation_id text NOT NULL,
  patient_phone text NOT NULL,
  doctor_id text NOT NULL,
  status text NOT NULL, -- pending, completed
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS checkin_exchanges (
  id text PRIMARY KEY,
  consultation_id text NOT NULL,
  exchange_count integer DEFAULT 0,
  last_message_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id text PRIMARY KEY,
  action text NOT NULL, -- response_sent, case_closed, doctor_suspended, etc.
  actor_type text NOT NULL, -- patient, doctor, admin, system
  actor_id text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id text PRIMARY KEY,
  consultation_id text NOT NULL,
  patient_phone text NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'open', -- open, resolved
  resolution_details text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_config (
  id text PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Indexes for speed and integrity
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_stage ON consultations(stage);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_phone ON consultations(patient_phone);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_patient_phone ON threads(patient_phone);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications(recipient_id, is_read);

-- 4. Initial app_config seed values
INSERT INTO app_config (id, key, value, description)
VALUES 
  ('cfg_1', 'price_full', '7500', 'Price for full new medical consultation in NGN'),
  ('cfg_2', 'price_review', '3500', 'Price for follow up prescription review in NGN'),
  ('cfg_3', 'payout_pct', '70', 'Physician payout percentage share (default 70%)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
