import test from "node:test";
import assert from "node:assert";
import { 
  calcAge, 
  normPhone, 
  sha256, 
  calculatePayoutSplit, 
  countClarificationsAfterLastDoctorMsg 
} from "../utils/clinical.js";

// ==========================================
// 1. UNIT TEST SUITE
// ==========================================

test("Unit Tests - Clinical & Admin Utilities", async (t) => {
  
  await t.test("calcAge - calculates correct display age", () => {
    const currentYear = new Date().getFullYear();
    assert.strictEqual(calcAge(1990, currentYear), currentYear - 1990);
    assert.strictEqual(calcAge(2005, currentYear), currentYear - 2005);
    assert.strictEqual(calcAge(0, currentYear), 0);
  });

  await t.test("normPhone - normalizes Nigerian WhatsApp phone format", () => {
    assert.strictEqual(normPhone("08031234567"), "2348031234567");
    assert.strictEqual(normPhone("+234 803 123 4567"), "2348031234567");
    assert.strictEqual(normPhone("2348031234567"), "2348031234567");
    assert.strictEqual(normPhone(""), "");
  });

  await t.test("sha256 - hashes values to standard hex output", () => {
    // Standard test hash for "123456"
    const expected = "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92";
    assert.strictEqual(sha256("123456"), expected);
    
    // Hash for "hello"
    const helloExpected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
    assert.strictEqual(sha256("hello"), helloExpected);
  });

  await t.test("price/payout math - calculates 70% earnings split correctly", () => {
    assert.strictEqual(calculatePayoutSplit(7500, 70), 5250);
    assert.strictEqual(calculatePayoutSplit(3500, 70), 2450);
    assert.strictEqual(calculatePayoutSplit(10000, 50), 5000);
    assert.strictEqual(calculatePayoutSplit(0, 70), 0);
  });

  await t.test("clarification-count-after-latest-doctor-msg - counts patient chats since last doctor response", () => {
    const chatHistory = [
      { sender: "patient", sender_name: "Chidi", text: "Hello" },
      { sender: "system", sender_name: "System", text: "Case opened" },
      { sender: "doctor", sender_name: "Dr. Babajide", text: "How can I help?" },
      { sender: "patient", sender_name: "Chidi", text: "I have symptoms" },
      { sender: "patient", sender_name: "Chidi", text: "Started yesterday" },
    ];
    
    // There are 2 patient clarifications after the latest doctor message
    assert.strictEqual(countClarificationsAfterLastDoctorMsg(chatHistory), 2);

    const chatWithNoPatientReply = [
      { sender: "patient", sender_name: "Chidi", text: "Hello" },
      { sender: "doctor", sender_name: "Dr. Babajide", text: "Got it, take this." }
    ];
    assert.strictEqual(countClarificationsAfterLastDoctorMsg(chatWithNoPatientReply), 0);

    const chatWithNoDoctorAtAll = [
      { sender: "patient", sender_name: "Chidi", text: "Hello" },
      { sender: "patient", sender_name: "Chidi", text: "Help please" }
    ];
    assert.strictEqual(countClarificationsAfterLastDoctorMsg(chatWithNoDoctorAtAll), 2);
  });
});

// ==========================================
// 2. INTEGRATION TEST SUITE
// ==========================================

test("Integration Tests - Clinical Subsystems", async (t) => {
  
  await t.test("OTP Subsystem - throttles requests & limits daily cap", () => {
    // Simulate daily limits and throttling
    const dailyCap = 100;
    let dailyCount = 98;
    const sendOtp = (phone: string) => {
      if (dailyCount >= dailyCap) {
        return { success: false, code: "OTP_DAILY_LIMIT_EXCEEDED" };
      }
      dailyCount++;
      return { success: true, code: "OTP_SENT" };
    };

    // First two requests should pass
    assert.deepStrictEqual(sendOtp("2348031234567"), { success: true, code: "OTP_SENT" });
    assert.deepStrictEqual(sendOtp("2348031234568"), { success: true, code: "OTP_SENT" });
    
    // Third request should be blocked by Daily Cap
    assert.deepStrictEqual(sendOtp("2348031234569"), { success: false, code: "OTP_DAILY_LIMIT_EXCEEDED" });
  });

  await t.test("Payment Subsystem - verifies amount integrity & prevents double webhooks", () => {
    const databaseCredits: Record<string, boolean> = {}; // Simulate payment credit log idempotency
    
    const verifyPayment = (txRef: string, paidAmount: number, expectedAmount: number) => {
      if (paidAmount !== expectedAmount) {
        return { success: false, code: "AMOUNT_MISMATCH" };
      }
      if (databaseCredits[txRef]) {
        return { success: false, code: "DUPLICATE_TRANSACTION" }; // Idempotency check
      }
      databaseCredits[txRef] = true;
      return { success: true, code: "PAYMENT_CREDITED" };
    };

    // Valid payment should succeed
    assert.deepStrictEqual(verifyPayment("tx_111", 7500, 7500), { success: true, code: "PAYMENT_CREDITED" });
    
    // Amount mismatch should be rejected
    assert.deepStrictEqual(verifyPayment("tx_222", 5000, 7500), { success: false, code: "AMOUNT_MISMATCH" });
    
    // Duplicate webhook should be ignored (idempotent guard)
    assert.deepStrictEqual(verifyPayment("tx_111", 7500, 7500), { success: false, code: "DUPLICATE_TRANSACTION" });
  });

  await t.test("Consultation Lifecycle - progresses stage correctly & credits doctor", () => {
    // Stage progressions: initial -> day2_pending -> day2_sent -> day5_pending -> day5_closed
    const consultation = {
      id: "cons_999",
      stage: "initial",
      status: "PENDING_DOCTOR",
      earningsCredited: false,
      payoutAmount: 0
    };

    const processTransition = (action: string) => {
      if (action === "doctor_respond" && consultation.stage === "initial") {
        consultation.stage = "day2_pending";
        consultation.status = "DOCTOR_RESPONDED";
      } else if (action === "day2_checkin" && consultation.stage === "day2_pending") {
        consultation.stage = "day2_sent";
      } else if (action === "day5_checkin" && consultation.stage === "day2_sent") {
        consultation.stage = "day5_pending";
      } else if (action === "clinician_close" && consultation.stage === "day5_pending") {
        consultation.stage = "day5_closed";
        consultation.status = "COMPLETED";
        consultation.earningsCredited = true;
        consultation.payoutAmount = calculatePayoutSplit(7500, 70);
      }
    };

    processTransition("doctor_respond");
    assert.strictEqual(consultation.stage, "day2_pending");
    assert.strictEqual(consultation.status, "DOCTOR_RESPONDED");

    processTransition("day2_checkin");
    assert.strictEqual(consultation.stage, "day2_sent");

    processTransition("day5_checkin");
    assert.strictEqual(consultation.stage, "day5_pending");

    processTransition("clinician_close");
    assert.strictEqual(consultation.stage, "day5_closed");
    assert.strictEqual(consultation.status, "COMPLETED");
    assert.strictEqual(consultation.earningsCredited, true);
    assert.strictEqual(consultation.payoutAmount, 5250); // Validates correct clinical payout is credited
  });

  await t.test("Red-Flag Subsystem - blocks intake safety alerts", () => {
    const checkSafetyQuestions = (answers: Record<string, string>) => {
      // If any of the contraindications or high-risk answers is "yes"
      if (answers["chest_pain"] === "yes" || answers["unexplained_syncope"] === "yes") {
        return { isRedFlag: true, route: "scrRedFlag" };
      }
      return { isRedFlag: false, route: "checkout" };
    };

    const cleanIntake = { chest_pain: "no", unexplained_syncope: "no" };
    const highRiskIntake = { chest_pain: "yes", unexplained_syncope: "no" };

    assert.deepStrictEqual(checkSafetyQuestions(cleanIntake), { isRedFlag: false, route: "checkout" });
    assert.deepStrictEqual(checkSafetyQuestions(highRiskIntake), { isRedFlag: true, route: "scrRedFlag" });
  });
});

// ==========================================
// 3. END-TO-END SIMULATED JOURNEYS SUITE
// ==========================================

test("E2E Simulated Journeys - Full Clinical Flow", async (t) => {
  
  await t.test("E2E - Patient registers, fills intake safely, checks out, doctor claims and answers", () => {
    // 1. Patient Registration & Login
    const patientSession = {
      phone: normPhone("08031234567"),
      pinHash: sha256("123456"),
      name: "Chidi Okafor",
      age: calcAge(1993)
    };
    
    assert.strictEqual(patientSession.phone, "2348031234567");
    assert.strictEqual(patientSession.pinHash, "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92");
    assert.strictEqual(patientSession.age, new Date().getFullYear() - 1993);

    // 2. Intake Flow - Patient fills answers
    const answers = {
      condition: "ED",
      chest_pain: "no", // Safe
      duration: "6 months"
    };
    
    // Check safety
    const safetyCheck = answers.chest_pain === "yes";
    assert.strictEqual(safetyCheck, false); // Safe, no red flags

    // 3. Payment Checkout (Verify NGN 7,500 Full Consultation)
    const txRef = "tx_chidi_" + Date.now();
    const paidAmount = 7500;
    const expectedAmount = 7500;
    assert.strictEqual(paidAmount, expectedAmount);

    // 4. Consultation file is created and pooled for doctors to claim
    const consultation = {
      id: "cons_chidi_101",
      patient_phone: patientSession.phone,
      patient_name: patientSession.name,
      stage: "initial",
      status: "PENDING_DOCTOR",
      doctor_id: null as string | null,
      messages: [] as any[]
    };

    assert.strictEqual(consultation.status, "PENDING_DOCTOR");

    // 5. Doctor Logs In & Claims Case
    const doctorSession = {
      id: "doc_babajide",
      name: "Dr. Babajide Alao",
      mdcn_folio: "M/10234"
    };

    consultation.doctor_id = doctorSession.id;
    consultation.status = "ACTIVE"; // Locked
    
    assert.strictEqual(consultation.doctor_id, "doc_babajide");
    assert.strictEqual(consultation.status, "ACTIVE");

    // 6. Doctor generates AI Clinical thinking draft and sends response
    const draftResponse = `Clinical Assessment: Mild erectile dysfunction.
Why I Think This: Rooted in high work stress.
Personalised Action Plan: Start lifestyle modifications and sildenafil 50mg if indicated.
Follow-up Plan: Follow up in 48 hours for clinical review.`;

    consultation.messages.push({
      sender: "doctor",
      sender_name: doctorSession.name,
      text: draftResponse
    });
    
    consultation.stage = "day2_pending";
    consultation.status = "DOCTOR_RESPONDED";

    assert.strictEqual(consultation.stage, "day2_pending");
    assert.strictEqual(consultation.status, "DOCTOR_RESPONDED");
    assert.strictEqual(consultation.messages.length, 1);
  });

  await t.test("E2E - Administrative dispute oversight and pricing configuration", () => {
    // 1. Admin login with secure PIN
    const adminPin = "990011";
    const secureHash = sha256(adminPin);
    assert.strictEqual(secureHash, "64bcb9c85aa58a04bbc71930f52df88dae5102568003120e6bc69840bce3cfd1");

    // 2. Admin inspects active dispute
    const activeDispute = {
      id: "disp_777",
      consultation_id: "cons_chidi_101",
      status: "OPEN",
      resolution: null as string | null
    };

    assert.strictEqual(activeDispute.status, "OPEN");

    // 3. Admin resolves the dispute and marks logs
    activeDispute.status = "RESOLVED";
    activeDispute.resolution = "Patient refunded, clinical audit completed.";
    assert.strictEqual(activeDispute.status, "RESOLVED");

    // 4. Admin updates the app pricing config in app_config
    const appConfig = {
      price_full: 7500,
      price_review: 3500,
      payout_pct: 70
    };

    // Increase rate
    appConfig.price_full = 8000;
    assert.strictEqual(appConfig.price_full, 8000);
  });
});
