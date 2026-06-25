# PrivyDoc Architectural Mapping & Technical Documentation

This document maps out the complete technical blueprint, runtime lifecycle, backend services, database schema, and hosting configuration for **PrivyDoc**—a secure, private, and high-integrity telemedicine clinic built specifically for sensitive men's health consultations in Nigeria.

---

## 1. System Overview

PrivyDoc connects patients dealing with sensitive medical conditions (erectile dysfunction, premature ejaculation, hair loss, prostate health, etc.) with licensed clinicians under strict confidentiality standards.

### Architectural Philosophy
* **Offline-First & Live-Sync Hybrid**: The app utilizes a resilient local engine that loads demo state, saves transactions instantly to the browser's `localStorage`, and replicates all transactions live to **Supabase (PostgreSQL)** in the background. If Supabase is unreachable or in cold-start, the client stays fully responsive.
* **Full-Stack Secure Proxy**: The Node/Express server proxies sensitive AI summary and clinician-draft endpoints to isolated Supabase Edge Functions. API keys and service roles remain hidden from the client browser.
* **Direct Clinical Workflows**: Integrated bank transfer details mimic an automated virtual payment checkout, followed by instant clinical folder generation, clinician claim queues, real-time secure patient-doctor chat, and clinical PDF report generation.

---

## 2. Infrastructure & Hosting Environment

PrivyDoc is hosted in a production-grade, containerized full-stack environment.

### Deployment Infrastructure
* **Container Environment**: Hosted on **Google Cloud Run** running a custom Linux container defined by `Dockerfile`.
* **Port Routing (Critical)**: External requests are mapped via a secure **Nginx Reverse Proxy** directly to internal port `3000`. The Express server listens on host `0.0.0.0` and port `3000`.
* **Environment Configuration**: Environment flags (such as `NODE_ENV=production`) determine the serving layer. Hot Module Replacement (HMR) is disabled in development mode by setting `DISABLE_HMR=true` to ensure steady preview compiling.

### Application URLs & Domains
* **Development Workspace URL**: `https://ais-dev-cas6dyyqrpkyiwzm3ynhil-1000302506769.europe-west2.run.app`
* **Shared Preview URL**: `https://ais-pre-cas6dyyqrpkyiwzm3ynhil-1000302506769.europe-west2.run.app`
* **Custom Domain Mapping**: Can be bound to production assets like `https://privydoc.com.ng` or `https://app.privydoc.com.ng` inside the Cloud Run domain routing panel.

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18+ (TypeScript), Vite | Single Page Application (SPA) architecture, lightning-fast client building |
| **Styling Engine** | Tailwind CSS | Utility-first classes, fluid layouts, cohesive dark/slate-zinc elements |
| **Icons Library** | Lucide-React | Crisp, modern vector iconography (Shield, Activity, Lock, Users, etc.) |
| **PDF Compiler** | jsPDF | Compiles patient prescription documents and diagnostic dossiers directly in-browser |
| **Backend Server** | Node.js (v18+), Express, TSX | Serves frontend static files and handles server-side proxy API routes |
| **Database & API** | Supabase REST, PostgreSQL | Secure primary cloud relational store with Row Level Security (RLS) policies |
| **Compute / Edge** | Supabase Edge Functions | Serverless functions executing secure Gemini model assessments and assist tools |

---

## 4. Key Directory & Code Structures

* `/server.ts`: Full-stack entry point. Controls Express API proxies, in-memory rate limits, and static distribution paths.
* `/src/main.tsx` & `/index.html`: Base entry mounts.
* `/src/App.tsx`: Central routing controller managing patient onboarding transitions, modal overlays, legal documents, and application layout.
* `/src/types.ts`: Holds system interfaces (`Doctor`, `Patient`, `Consultation`, `ChatMessage`, `PayoutRequest`, `PricingConfig`).
* `/src/data.ts`: Contains medical intake questionnaire trees (`MEN_HEALTH_CONDITIONS`, `INTAKE_QUESTIONS`), default demo entities, and medical disclaimers.
* `/src/utils.tsx`: Houses helper utilities such as `formatNaira` (currency mapping) and `formatDate`.
* `/src/components/`:
  * `PatientLanding.tsx`: Home screen showcasing clinic credibility, medical categories, security trust badges, and FAQs.
  * `SymptomChecker.tsx`: Dedicated bento-box-inspired screening step verifying candidate health markers.
  * `IntakeForm.tsx`: Multiphasic clinical assessment form capturing duration, symptoms, and dynamic payment bank transfer gateways.
  * `PatientPortal.tsx`: Secure space for returning patients. Handles secure PIN log-in, active file status tracking, real-time message chat, and PDF prescription compilations.
  * `ClinicianArea.tsx`: Full-featured doctor workspace. Supports MDCN portfolio verification, digital folder review queues, Gemini clinical draft assistance, and prescription writing.
  * `AdminOffice.tsx`: Administrator command center. Tracks platform-wide metrics (ledger), approves payouts, registers doctors, and alters dynamic consultation fees.

---

## 5. Database Schema & Tables

The system interacts directly with a PostgreSQL backend (Supabase) and matches the structural interfaces defined in `types.ts`.

### A. Patients (`patients` table)
| Column Name | DB Type | TypeScript Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | `string` | Primary key, e.g., `pat_xxxxx` |
| `phone` | `VARCHAR` | `string` | Unique phone identifier (used for sign-in) |
| `first_name` | `VARCHAR` | `string` | Patient's first name / pseudonym |
| `age_dob` | `INT` | `number` | Patient's age |
| `state` | `VARCHAR` | `string` | Nigerian state of residence (e.g., Lagos, Abuja) |
| `email` | `VARCHAR` | `string` | Optional contact email |
| `pin_hash` | `VARCHAR` | `string` | 6-digit secure PIN for encrypted login |

### B. Doctors (`doctors` table)
| Column Name | DB Type | TypeScript Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | `string` | Primary key, e.g., `doc_xxxxx` |
| `name` | `VARCHAR` | `string` | Clinician name prefix e.g., "Dr. Ola" |
| `phone` | `VARCHAR` | `string` | Contact phone number |
| `mdcn_folio` | `VARCHAR` | `string` | Unique Medical & Dental Council of Nigeria Folio Number |
| `apl_year` | `INT` | `number` | Year of first practicing license approval |
| `pin_hash` | `VARCHAR` | `string` | 4-to-6 digit clinician login PIN |
| `status` | `VARCHAR` | `string` | `"pending"` \| `"active"` \| `"suspended"` |
| `verified` | `BOOLEAN` | `boolean` | MDCN credentials validated by admin |
| `bank_name` | `VARCHAR` | `string` | Bank name for clinical payouts |
| `bank_account`| `VARCHAR` | `string` | 10-digit NUBAN bank account number |
| `payout_balance`| `NUMERIC` | `number` | Accumulated doctor share (70% of consultation price) |

### C. Consultations (`consultations` table)
| Column Name | DB Type | TypeScript Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | `string` | Primary key, e.g., `cons_xxxxx` |
| `patient_id` | `VARCHAR` | `string` | Relates to patients.id |
| `patient_phone`| `VARCHAR` | `string` | Relates to patients.phone |
| `condition_id` | `VARCHAR` | `string` | Medical category (e.g., erectile_dysfunction) |
| `status` | `VARCHAR` | `string` | `"pending"` (payment cleared) \| `"active"` \| `"completed"` |
| `doctor_id` | `VARCHAR` | `string` | Relates to doctors.id (NULL if pending) |
| `doctor_name` | `VARCHAR` | `string` | Clinician's name |
| `ai_summary` | `TEXT` | `string` | Clinical summary generated by Gemini |
| `doctor_notes` | `TEXT` | `string` | Free-text consultation evaluation notes |
| `prescription` | `TEXT` | `string` | Prescribed clinical treatment regimen |
| `amount_paid` | `NUMERIC` | `number` | Exact fee paid in Naira |
| `messages` | `JSONB` | `ChatMessage[]`| List of chronological chat messages (secured) |
| `form_data` | `JSONB` | `object` | Structured intake questionnaire responses |
| `created_at` | `TIMESTAMP` | `string` | Case creation timestamp |
| `updated_at` | `TIMESTAMP` | `string` | Last modified timestamp |

### D. Payout Requests (`payout_requests` table)
| Column Name | DB Type | TypeScript Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | `string` | Primary key, e.g., `pay_xxxxx` |
| `doctor_id` | `VARCHAR` | `string` | Relates to doctors.id |
| `doctor_name` | `VARCHAR` | `string` | Clinician name |
| `amount` | `NUMERIC` | `number` | Requested payout amount |
| `bank_name` | `VARCHAR` | `string` | Receiving bank name |
| `account_number`| `VARCHAR` | `string` | NUBAN payout destination |
| `status` | `VARCHAR` | `string` | `"pending"` \| `"approved"` \| `"rejected"` |
| `created_at` | `TIMESTAMP` | `string` | Request generation timestamp |

### E. Dynamic Pricing Configurations (`pricing` table)
| Column Name | DB Type | TypeScript Type | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR` | `string` | Unique price key, e.g., `base_consultation` |
| `name` | `VARCHAR` | `string` | Service label displayed to patients |
| `price` | `NUMERIC` | `number` | Active price in Naira |
| `description` | `TEXT` | `string` | Functional scope of the medical service |

---

## 6. Full-Stack API Endpoints (Express Proxy)

The backend Express app serves standard endpoints that act as a secure proxy bridge to remote Supabase Edge Functions. It protects secret environment keys and integrates an IP-based rate limiter to prevent script abuse.

### A. AI Intake Summary Proxy
* **Endpoint**: `POST /api/ai-summary`
* **Rate Limit**: Maximum of 15 requests per 3 minutes per client IP.
* **Payload**:
  ```json
  {
    "condition": "Erectile Dysfunction",
    "form_data": {
      "duration": "Over 6 months",
      "age": 34,
      "answers": [
        { "question": "Have you tried treatments?", "answer": "No" }
      ]
    }
  }
  ```
* **Downstream Logic**: Sends request to Supabase Edge Function `${SUPABASE_URL}/functions/v1/ai-summary` using the authorized Service Role Key.
* **Return Value**:
  ```json
  {
    "summary": "AI summary assessment details containing cardiovascular assessments...",
    "red_flag": false
  }
  ```
* **Failover Safety**: If the edge function is offline, it generates an instant, structured **Local Clinical Fallback** string so clinicians can evaluate the patient's records seamlessly.

### B. AI Clinician Assist Proxy
* **Endpoint**: `POST /api/ai-assist`
* **Rate Limit**: Maximum of 20 requests per 3 minutes per client IP.
* **Payload**:
  ```json
  {
    "case_details": {
      "condition": "Erectile Dysfunction",
      "symptoms": ["Mild fatigue", "Struggles with stamina"]
    },
    "chat_history": [
      { "sender": "patient", "text": "Are there side effects?" }
    ],
    "prompt": "Draft an empathetic medical response clarifying Sildenafil usage and side-effects."
  }
  ```
* **Downstream Logic**: Dispatches requests to Supabase Edge Function `${SUPABASE_URL}/functions/v1/ai-assist`.
* **Return Value**:
  ```json
  {
    "draft": "Dear Patient, based on your symptoms..."
  }
  ```
* **Failover Safety**: Gracefully catches errors and prompts the physician to draft their clinical response manually if remote services are sleeping.

---

## 7. App Workflows & Lifecycle Processes

### 1. Patient Intake & Payment Loop
1. The patient lands on **PatientLanding**, clicks a men's health category (e.g., Erectile Dysfunction).
2. The **SymptomChecker** screens them for critical contraindications.
3. If passed, the **IntakeForm** collects medical duration details, lifestyle history, name, phone, age, state, and a secure 6-digit access PIN.
4. The system retrieves the active dynamic base consultation fee (e.g., ₦7,500) from `pricingApi`.
5. The patient completes a simulated virtual bypass mobile bank transfer to a dynamic virtual account.
6. The client creates the patient record and registers a pending clinical consultation file. The file is live-replicated to Supabase in the background and a server-side AI intake summary is generated.

### 2. Clinician Evaluation & Payout Loop
1. A licensed clinician logs into the **ClinicianArea** using their MDCN folio number and PIN.
2. In the "Intake Folder Pool", they browse anonymous pending clinical cases.
3. The clinician accepts a file, changing its status to `"active"` and locking it under their name.
4. They can secure-chat with the patient for follow-up details.
5. They can review the automated AI intake brief and use the "AI Assist" sidebar to draft complex clinical responses.
6. They complete the consultation by entering clinical review notes and a prescription.
7. Upon completion, the consultation status updates to `"completed"`. The system automatically calculates **70% of the consultation price** as the clinician's commission and credits it directly to their `payout_balance`.
8. The clinician can register their 10-digit NUBAN bank account and request a payout from their balance.

### 3. Patient Review & Discharge
1. The patient logs into the **PatientPortal** using their phone and 6-digit secure PIN.
2. They view their case dossier. If completed, they can read the clinician's notes, view their active prescription, and chat for clarifications.
3. They can compile their clinical assessment into a clean, download-ready PDF report instantly via **jsPDF**.

### 4. Admin Supervision & Fee Settings
1. System administrators use the **AdminOffice** tab to oversee platform operations.
2. Admins review and verify registering doctors, approve or reject pending financial payout requests, and view the system-wide clinical transaction ledger.
3. **Dynamic Fee Adjuster**: Admins can adjust platform pricing variables (Base Consultation fee, Review consultation fee, Health Summary fee, etc.) directly. Changes are instantly published to local storage and remote database layers, dynamically updating pricing labels on the patient intake landing page, payment gateways, and clinical legal disclosures.

---

## 8. Build, Start & Deployment Lifecycle

The application complies with robust container compilation rules:

### A. Local Development Run
```bash
# Starts Node backend with tsx, running Vite as middleware on port 3000
npm run dev
```

### B. Production Container Compile
```bash
# Bundles the React SPA to the 'dist/' static directory, compiles the typescript Express server to CJS, and binds to Node
npm run build
```
* **Vite Bundle**: Builds all React JS/TSX chunks, styling pipelines, and assets cleanly into static `/dist`.
* **Esbuild Bundle**: Compiles `server.ts` into a self-contained `dist/server.cjs` file, resolving all relative imports to bypass runtime ES module restrictions.

### C. Production Run
```bash
# Boots the compiled full-stack server
npm run start
```
* Serves static elements in the `/dist` folder with index route redirection to ensure pristine client-side single-page routing.
