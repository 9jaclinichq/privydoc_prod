# PrivyDoc Disaster Recovery (DR) Runbook
**Production Failover, Graceful Degradation & Secret Rotation Playbook**

This runbook specifies exact engineering steps and operational fail-safes for responding to primary infrastructure outages on the **PrivyDoc Telemedicine Platform** (9JaClinic Limited).

---

## 1. Supabase Database Outage Playbook

If the core Supabase PostgreSQL cluster goes offline, is throttled, or experiences a cold-start delay:

### A. Automatic Client-Side Fail-Safe
* **Resilient local state**: The React application runs an offline-first state syncer. All patient intakes, questionnaires, and active chat logs are cached immediately in the browser's `localStorage` (via `privydoc_patient_session` and `privydoc_consultations`).
* **Uninterrupted intake**: Patients can complete the bento-box symptom check and answer intake questionnaires entirely offline.
* **Graceful banner notice**: If backend APIs return a network timeout/503 error, a non-intrusive warning banner is injected at the top of the viewport: *"Connecting to Secure PrivyDoc Vault... Your clinical inputs are securely saved locally."*
* **No silent failures**: If a patient tries to reload or trigger a write during an outage, the local state is preserved, and a friendly notice prompt is displayed requesting them to retry when their connection stabilizes.

### B. Express Server Actions
1. **API Caching**: The Express server caches the primary billing configuration (`price_full`, `price_review`) in memory to ensure patient landing cards can load even if PostgreSQL is momentarily unreachable.
2. **Server-Side Health Probe**: Check the active status of Supabase using `/healthz`. If database checks fail continuously for 5 minutes, DevOps will immediately be alerted via Google Cloud Logging.

---

## 2. Flutterwave Payment Gateway Outage Playbook

If the Flutterwave checkout gateway goes offline, rejects requests, or experiences API timeouts:

### A. absolute Invariant: No Mock Payments
* **Never mock or simulate success**: If Flutterwave is down, the system **MUST NOT** fallback to any simulated or fake payment completions.
* **Secure Block**: The intake payment card will catch connection or initiation errors, block progression to the submitted screen, and show a detailed, professional maintenance warning:
  > *"We are currently experiencing technical difficulties with our payment provider. Your clinical answers have been securely saved. Please refresh the page or try again in a few minutes. If you have been charged but your session hasn't unlocked, please email clinical-care@privydoc.com.ng."*

### B. Double Charges & Manual Reconciliation Workflow
In the rare event of a webhook failure or a double-charge dispute:
1. Admin opens the centralized **Admin Office Command Center** (via standard `/#admin` access).
2. Locate the patient's record by phone number.
3. Compare transaction records with the live Flutterwave Merchant Dashboard.
4. If payment is confirmed in the Flutterwave ledger but missing from PrivyDoc, click **"Manually Verify Payment"** in the Admin office. This generates the `payment_credits` row and moves the consultation stage to `initial` with status `PENDING_DOCTOR`, writing an immutable log to `audit_log: manual_payment_verification_by_admin`.

---

## 3. WhatsApp & Notification API Outage Playbook

If the WhatsApp Cloud API (or Termii fallback) is down, throttled, or returning 4xx/5xx:

### A. Non-Blocking Fire-and-Forget Invariant
* **Core Flow Protection**: All message dispatches to external notification gateways in `src/services/notify.ts` are strictly wrapped in asynchronous **fire-and-forget** handlers with safety catchers (`.catch((err) => { console.error(err) })`).
* **No thread blocking**: Under no circumstances will a notification failure block a patient from completing their intake form, submitting their payment, or a doctor from claiming/responding to a clinical file.
* **In-App Resiliency**: Important reminders and state changes always write to the internal `notifications` table, so users can see active notifications inside the in-app bells on their next login even if WhatsApp messages fail to deliver.

### B. SLA Warning Workarounds
If doctor reminders (6h/2h SLA alerts) cannot be dispatched via WhatsApp, the admin team will manually review outstanding cases in the Admin queue and prompt practitioners directly or reassign cases to the public pool to prevent SLA breaches.

---

## 4. Secret Key Rotation Playbook

In the event of a credential leak (e.g., source code exposure, leaked logs, or developer workspace compromise), DevOps must rotate secret keys **immediately**.

### Step 1: Generate New Credentials
Go to your external console dashboards and provision fresh key values:
* **Flutterwave**: Merchant Dashboard -> Settings -> API Keys -> Re-generate Secret Key.
* **Anthropic / Claude**: Anthropic Console -> API Keys -> Create Key.
* **WhatsApp API**: Facebook Developer Portal -> WhatsApp -> API Setup -> Re-generate Access Token.

### Step 2: Update Google Cloud Run Environment
Do **not** commit these keys to Git or `.env.example`. Apply them directly via the Google Cloud Run CLI:

```bash
# Rotate API secrets securely on the staging and production container service
gcloud run services update privydoc-app \
  --set-env-vars="FLW_SECRET_KEY=flw_sec_new_value_here" \
  --set-env-vars="CLAUDE_API_KEY=sk-ant-new_value_here" \
  --set-env-vars="WHATSAPP_ACCESS_TOKEN=eaab_new_value_here" \
  --platform managed \
  --region europe-west2
```

### Step 3: Verify and Re-test
1. Restart the dev server or redeploy to force Cloud Run container recycling.
2. Confirm that the application boots cleanly with no start-up crashes.
3. Run the automated integration test suite against the updated staging server:
   ```bash
   npx tsx --test src/tests/all.test.ts
   ```
4. Verify that the 14-test verification suite returns 100% green with zero console errors.
