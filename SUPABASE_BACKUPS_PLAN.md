# PrivyDoc Supabase & PostgreSQL Backups Plan
**Production Backup Strategy & Verification Checklist**

This document specifies the primary database backup configurations, point-in-time recovery bounds, recovery objectives, and validation drills for the **PrivyDoc Telemedicine Platform** database hosted on Supabase (PostgreSQL).

---

## 1. Core Recovery Objectives (RPO & RTO)

Maintaining strict compliance with the National Data Protection Regulation (NDPR) and clinical safety protocols requires rigid bounds on potential data loss and server restoration downtime.

| Objective | Target Metric | Clinical Justification |
| :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **≤ 1 Hour** | In the event of physical or cluster-wide failure, we must not lose more than 1 hour of active patient intake questionnaire data, payment credits, or doctor chat response transcripts. |
| **Recovery Time Objective (RTO)** | **≤ 1 Hour** | Platform services must be fully operational, with clinician consoles and patient symptom portals re-routed and online, within 60 minutes of disaster declaration. |

---

## 2. Automated Backup Infrastructure

PrivyDoc utilizes **Supabase Enterprise/Pro Tier** infrastructure backing the PostgreSQL cluster with fully isolated, automated backup regimes:

### A. Daily Physical Backups
* **Frequency**: Executed automatically once every 24 hours.
* **Retention Policy**: Retained securely for **30 calendar days**.
* **Storage Location**: Multi-region, physically isolated AWS S3 / Google Cloud Storage buckets encrypted at rest via AES-256 with KMS integration.
* **Scope**: Includes all relational tables (`patients`, `doctors`, `consultations`, `threads`, `messages`, `payments_log`, `payment_credits`, `audit_log`, `disputes`), indexes, schemas, custom database functions, and security roles.

### B. Point-in-Time Recovery (PITR)
* **Status**: **ACTIVE** (Enabled in Supabase Database dashboard).
* **Granularity**: Continuous Write-Ahead Log (WAL) archiving to backing storage.
* **Recovery Threshold**: Enables restoration of the database state to the exact second (timestamp) within the previous **7 days**.
* **Trigger Mechanism**: Accessed in the Supabase Dashboard under `Database -> Backups -> Point-in-Time Recovery` or via the Supabase CLI.

---

## 3. Scheduled Restore Verification Drills

To prove that backup files are uncorrupted and that recovery steps function reliably, the DevOps team must execute a **scratch restore drill quarterly**:

### Execution Protocol
1. **Provision Sandbox Cluster**: Spawn an isolated temporary scratch database instance (e.g., `privydoc-scratch-recovery`) via the Supabase CLI or management console.
2. **Retrieve Target State**: Select a random historical timestamp from the previous 7 days (for PITR test) or select yesterday’s full physical backup.
3. **Execute Restore**: Restore the selected backup file directly to the sandbox database instance.
4. **Run Clinical Integrity Suite**:
   - Verify that patient tables hold expected test rows and that `pin_hash` matches.
   - Run standard schema integrity checks (verify all indexes, partial constraints, and table foreign keys are intact).
   - Execute the standard test suite against the scratch connection string:
     ```bash
     npx tsx --test src/tests/all.test.ts
     ```
5. **Log Drill Audit**: Document the restore duration, success status, and any deviations in the centralized administrative `audit_log` with detail `"quarterly_backup_drill_completed"`.
6. **Deprovision Sandbox**: Tear down the sandbox instance to minimize cloud resources and uphold strict security boundaries.

---

## 4. Emergency Database CLI Recovery Instructions

If the Supabase dashboard is completely inaccessible, use the **Supabase CLI** to force-restore from the local administration console:

```bash
# 1. Authenticate with remote cluster
supabase login

# 2. Link your active production project
supabase link --project-ref your-supabase-project-ref

# 3. Pull production schema and run schema validation
supabase db pull

# 4. Trigger restore to yesterday's snapshot or specific PITR time
supabase db restore --timestamp "2026-06-25T14:30:00Z"
```

*This backup strategy guarantees clinical resilience, maintaining a high-fidelity audit trail for Nigerian telemedicine operations.*
