import React, { useState, useEffect } from "react";
import {
  Lock, ArrowRight, ArrowLeft, User, ShieldAlert, FileText, FileDown,
  MessageSquare, Sparkles, Send, HelpCircle, Activity,
  LineChart, Compass, Wallet, Settings, Clock, Heart, ClipboardCheck,
  CheckCircle2, AlertCircle
} from "lucide-react";
import { Consultation } from "../types";
import { renderRichText, formatChatTimestamp, formatConsultationRef } from "../utils";
import { toast } from "./ToastNotification";
import { MEN_HEALTH_CONDITIONS, NIGERIAN_STATES } from "../data";
import { getSLAHours, ConsultationStage } from "../lifecycle";
import { patientApi } from "../lib/api";

import { generateConsultationPDF } from "../utils/pdfGenerator";

// Verification badge shown next to phone/email fields on the profile tab.
function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> Unverified
    </span>
  );
}

// Next doctor check-in, derived from the consultation's real clinical stage SLA (see lifecycle.ts)
// rather than a hardcoded placeholder.
function getFollowUpInfo(consultation: Consultation): { label: string; date: Date } {
  const stage = (consultation.stage || "initial") as ConsultationStage;
  const slaHours = getSLAHours(stage);
  const date = new Date(new Date(consultation.created_at).getTime() + slaHours * 60 * 60 * 1000);
  return {
    label: `Your doctor will check in within ${slaHours} hours`,
    date
  };
}

// BMI and blood pressure, computed from the patient's actual submitted intake answers
// (matched by question text, the same contract raw_answers already uses elsewhere)
// rather than the fixed "120/80 (Normal)" / "24.7 (Healthy)" placeholder strings.
function getHealthMetrics(consultation: Consultation): { bmi: string; bp: string } {
  const findAnswer = (questionText: string): string | undefined =>
    consultation.raw_answers?.find((a) => a.question === questionText)?.answer;

  let bmi = "Not provided";
  const heightCm = parseFloat(findAnswer("Height in cm") || "");
  const weightKg = parseFloat(findAnswer("Weight in kg") || "");
  if (heightCm > 0 && weightKg > 0) {
    const heightM = heightCm / 100;
    const value = weightKg / (heightM * heightM);
    let category = "Healthy";
    if (value < 18.5) category = "Underweight";
    else if (value < 25) category = "Healthy";
    else if (value < 30) category = "Overweight";
    else category = "Obese";
    bmi = `${value.toFixed(1)} (${category})`;
  }

  let bp = "Not reported";
  const bpAnswer = findAnswer("What was your last blood pressure reading?");
  if (bpAnswer) {
    const match = bpAnswer.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
    if (match) {
      const systolic = parseInt(match[1], 10);
      const diastolic = parseInt(match[2], 10);
      let category = "Normal";
      if (systolic >= 140 || diastolic >= 90) category = "High";
      else if (systolic >= 130 || diastolic >= 80) category = "Elevated";
      bp = `${systolic}/${diastolic} (${category})`;
    } else {
      bp = bpAnswer;
    }
  }

  return { bmi, bp };
}

interface PatientPortalProps {
  selectedCase: Consultation | null;
  setSelectedCase: (c: Consultation | null) => void;
  allCases?: Consultation[];
  searchPhone: string;
  setSearchPhone: (phone: string) => void;
  onSearchPortal: () => void;
  patientMessage: string;
  setPatientMessage: (msg: string) => void;
  onSendPatientMessage: () => void;
  onStartNewCase: () => void;
  onSelectNewCondition: (condition: typeof MEN_HEALTH_CONDITIONS[0]) => void;
  onSelectSymptom: (conditionId: string) => void;
  formatDate: (d: string) => string;
  formatNaira: (n: number) => string;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onUpdateProfile?: (updates: { first_name: string; email: string; state: string }) => Promise<void> | void;
  patientName?: string;
  patientPhone?: string;
  patientEmail?: string;
  patientState?: string;
  activeSidebarTab: "dashboard" | "cases" | "messages" | "reports" | "newCase" | "profile";
  setActiveSidebarTab: (tab: "dashboard" | "cases" | "messages" | "reports" | "newCase" | "profile") => void;
}

export default function PatientPortal({
  selectedCase,
  setSelectedCase,
  allCases = [],
  searchPhone,
  setSearchPhone,
  onSearchPortal,
  patientMessage,
  setPatientMessage,
  onSendPatientMessage,
  onStartNewCase,
  onSelectNewCondition,
  onSelectSymptom,
  formatDate,
  formatNaira,
  onLogout,
  onDeleteAccount,
  onUpdateProfile,
  patientName = "",
  patientPhone = "",
  patientEmail = "",
  patientState = "",
  activeSidebarTab,
  setActiveSidebarTab
}: PatientPortalProps) {

  // Profile edit form state
  const [editFirstName, setEditFirstName] = useState<string>(patientName);
  const [editEmail, setEditEmail] = useState<string>(patientEmail);
  const [editState, setEditState] = useState<string>(patientState);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);

  // Email verification state, backed by the real email_verified column on the
  // patients table (read via GET /api/patient/profile, persisted via
  // POST /api/patient/verify-email after a successful email OTP verify).
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [showEmailOtpInput, setShowEmailOtpInput] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>("");
  const [sendingEmailOtp, setSendingEmailOtp] = useState<boolean>(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState<boolean>(false);

  useEffect(() => {
    if (!patientPhone) return;
    let cancelled = false;
    fetch(`/api/patient/profile?phone=${encodeURIComponent(patientPhone)}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.ok && data.patient) {
          setEmailVerified(!!data.patient.email_verified);
        }
      })
      .catch(e => console.error("Failed to fetch patient profile verification status:", e));
    return () => { cancelled = true; };
  }, [patientPhone]);

  const handleSendEmailVerification = async () => {
    if (!patientEmail || !patientPhone) return;
    setSendingEmailOtp(true);
    try {
      const res = await patientApi.sendOtp(patientPhone, "email", patientEmail);
      if (res.success) {
        setShowEmailOtpInput(true);
        toast.success("A verification code has been sent to your email.");
      } else {
        toast.error(res.error || "Failed to send verification code.");
      }
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleConfirmEmailVerification = async () => {
    if (!patientPhone || !emailOtpCode.trim()) return;
    setVerifyingEmailOtp(true);
    try {
      const res = await patientApi.verifyOtp(patientPhone, emailOtpCode.trim());
      if (res.success) {
        const verifyRes = await fetch("/api/patient/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: patientPhone })
        });
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (verifyRes.ok && verifyData.ok) {
          setEmailVerified(true);
          setShowEmailOtpInput(false);
          setEmailOtpCode("");
          toast.success("Email verified successfully.");
        } else {
          toast.error(verifyData.message || "Could not save verification status. Please try again.");
        }
      } else {
        toast.error(res.error || "Incorrect or expired verification code.");
      }
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // Dispute states
  const [disputeSubmitted, setDisputeSubmitted] = useState<boolean>(false);
  const [openDisputeForm, setOpenDisputeForm] = useState<boolean>(false);
  const [disputeCategory, setDisputeCategory] = useState<string>("Incorrect prescription advice / dose discrepancy");
  const [disputeReason, setDisputeReason] = useState<string>("Doctor did not prescribe the expected medication.");
  const [submittingDispute, setSubmittingDispute] = useState<boolean>(false);
  const [disputeError, setDisputeError] = useState<string>("Invalid input.");

  React.useEffect(() => {
    if (!selectedCase && allCases && allCases.length > 0) {
      setSelectedCase(allCases[0]);
    }
  }, [selectedCase, allCases, setSelectedCase]);

  React.useEffect(() => {
    if (selectedCase?.id) {
      setDisputeSubmitted(false);
      setDisputeReason("");
      setDisputeError("");
      fetch(`/api/data/disputes?consultation_id=eq.${selectedCase.id}`, {
        headers: {
          "x-patient-phone": selectedCase.patient_phone || ""
        }
      })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const hasActiveDispute = data.some(d => d.status !== "resolved");
          if (hasActiveDispute) {
            setDisputeSubmitted(true);
          }
        }
      })
      .catch(e => console.error("Could not load dispute logs:", e));
    }
  }, [selectedCase]);

  // Dynamic PDF download function
  const triggerDownloadPDF = async (con: Consultation) => {
    try {
      await generateConsultationPDF(con);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
      toast.error("Unable to compile report PDF in browser environment. Please review clinical notes inside the portal tab.");
    }
  };

  return (
    <div className="w-full">
      {/* 1. ARCHIVES LOOKUP BARRIER */}
      {!selectedCase && allCases && allCases.length > 0 ? (
        <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 text-center animate-slide-up relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-[#d4af37]" />
          
          <div className="flex justify-start">
            <button 
              type="button"
              onClick={onStartNewCase}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-[10px] font-bold font-mono uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Programs
            </button>
          </div>

          <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Confidential Case Archives
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter the exact WhatsApp number used during your intake to retrieve diagnoses, active secure chat rooms, and prescriptions.
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="e.g. +2348055554444"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white text-center focus:border-[#d4af37] focus:outline-none placeholder-zinc-700"
              onKeyDown={(e) => e.key === "Enter" && onSearchPortal()}
            />
            <button
              onClick={onSearchPortal}
              className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-2"
            >
              Fetch Secure Case Vault <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* 2. GLORIOUS TABLET / LAPTOP SIDEBAR DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          
          {/* Mobile Top Header (Recommendation 4) */}
          <div className="lg:hidden flex justify-between items-center bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
            <div>
              <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">PrivyDoc Vault</p>
              <h4 className="text-xs font-bold text-[#E5C158] truncate max-w-[150px]">{selectedCase?.patient_name || patientName || "Confidential Patient"}</h4>
            </div>
            <button 
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  setSelectedCase(null);
                }
              }}
              className="px-2.5 py-1 text-[10px] font-bold border border-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              Log Out
            </button>
          </div>

          {/* Center Main Dashboard Panels (navigation now lives in the app-level sidebar) */}
          <div className="lg:col-span-12 space-y-8">

            {/* VIEW NEW CASE: Start New Consultation (inline, stays within the portal) */}
            {activeSidebarTab === "newCase" && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-1.5">
                  <h4 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Start a New Consultation
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Select a condition below to begin a new confidential clinical assessment.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MEN_HEALTH_CONDITIONS.map((cond) => (
                    <div
                      key={cond.id}
                      className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-zinc-800 transition-all"
                    >
                      <div>
                        <h5 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {cond.title}
                        </h5>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onSelectSymptom(cond.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[10.5px] font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                          Clinical Guidelines
                        </button>
                        <button
                          onClick={() => onSelectNewCondition(cond)}
                          className="px-3.5 py-1.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-[11px] rounded-xl transition-colors"
                        >
                          Initiate Intake
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW A: PATIENT MAIN DASHBOARD */}
            {activeSidebarTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                {!selectedCase ? (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center space-y-6 animate-slide-up relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-[#d4af37]" />
                    <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                      <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        Confidential Patient Vault
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        No active consultations yet. Select a condition above to begin your confidential clinical assessment.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveSidebarTab("newCase")}
                        className="px-6 py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-2 mx-auto"
                      >
                        Start Clinical Assessment <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Cardiovascular Safety Alert Banner */}
                    {selectedCase.red_flag && (
                      <div className="bg-rose-500/10 border-2 border-rose-500/20 p-6 rounded-2xl space-y-3 animate-fade-in">
                        <div className="flex items-center gap-2.5 text-rose-400 font-extrabold text-sm">
                          <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                          CARDIOVASCULAR SAFETY BLOCK
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Our clinical safety sweeps have flagged severe cardiovascular safety risks in your intake questionnaires. 
                          Because of these high-risk contraindications, remote online prescription authorization has been blocked to protect your health.
                        </p>
                        <div className="pt-1.5 border-t border-rose-500/10">
                          <p className="text-[11px] text-[#E5C158] font-bold font-mono uppercase tracking-wider">
                            🚨 RECOMMENDED: Please visit a local clinic or physical hospital for an in-person diagnostic workup.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Greeting Banner */}
                    <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black rounded-2xl border border-zinc-900 p-6 relative overflow-hidden">
                      <div className="absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_100%_50%,rgba(212,175,55,0.06),transparent)] pointer-events-none" />
                      <div className="space-y-1.5 max-w-xl">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Good evening</p>
                        <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          Welcome back, {selectedCase.patient_name}.
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Your confidential clinical logs and medical file <strong className="text-white font-mono">{formatConsultationRef(selectedCase.id)}</strong> are secure inside your digital vault.
                        </p>
                      </div>
                    </div>

                    {/* Active Case Summary Widget */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            selectedCase.red_flag
                              ? "bg-rose-500/15 text-rose-400"
                              : selectedCase.status === "completed" 
                                ? "bg-emerald-500/15 text-emerald-400" 
                                : selectedCase.status === "active" 
                                  ? "bg-amber-500/15 text-amber-400 animate-pulse" 
                                  : "bg-blue-500/15 text-blue-400"
                          }`}>
                            {selectedCase.red_flag ? "Safety Flagged" : selectedCase.status === "completed" ? "Completed / Prescribed" : selectedCase.status === "active" ? "Active Clinician Review" : "Pending Pickup"}
                          </span>
                          <h4 className="text-base font-bold text-white mt-2 font-mono">{selectedCase.condition}</h4>
                          <p className="text-xs text-zinc-400 mt-1">Reference: {formatConsultationRef(selectedCase.id)} • Registered {formatDate(selectedCase.created_at)}</p>
                        </div>

                        <button
                          onClick={() => !selectedCase.red_flag && setActiveSidebarTab("messages")}
                          disabled={selectedCase.red_flag}
                          className="px-3.5 py-1.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {selectedCase.red_flag ? "Safety Blocked" : "Consult Doctor"}
                        </button>
                      </div>

                      <div className="pt-4 border-t border-zinc-900 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono">Assigned Doctor</p>
                          <p className="font-bold text-white mt-0.5">{selectedCase.doctor_name || "Assigning clinical specialist..."}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono">Evaluation Fee</p>
                          <p className="font-bold text-white mt-0.5">{formatNaira(selectedCase.amount_paid)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono">Next check-in</p>
                          <p className="font-bold text-zinc-300 mt-0.5">{getFollowUpInfo(selectedCase).label}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono">Follow-up</p>
                          <p className="font-bold text-zinc-300 mt-0.5">{formatDate(getFollowUpInfo(selectedCase).date.toISOString())}</p>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Health Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                        <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Blood Pressure</p>
                        <p className="text-sm font-bold text-emerald-400">{getHealthMetrics(selectedCase).bp}</p>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                        <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">BMI Index</p>
                        <p className="text-sm font-bold text-[#E5C158]">{getHealthMetrics(selectedCase).bmi}</p>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                        <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Cardio risk</p>
                        <p className="text-sm font-bold text-emerald-400">Low</p>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                        <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Sleep Quality</p>
                        <p className="text-sm font-bold text-zinc-300">7.5 hrs/night</p>
                      </div>
                    </div>

                    {/* Quick Launcher for new files */}
                    <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                        <h5 className="font-bold text-white text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Experience secondary concerns?</h5>
                        <p className="text-xs text-zinc-400 mt-0.5">File an additional medical category case with another specialist.</p>
                      </div>
                      <button
                        onClick={() => setActiveSidebarTab("newCase")}
                        className="px-4 py-2 border border-amber-500/25 text-[#E5C158] hover:bg-[#d4af37]/5 font-bold text-xs rounded-xl transition-colors"
                      >
                        Start New Program Case
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* VIEW E: PROFILE / ACCOUNT SETTINGS */}
            {activeSidebarTab === "profile" && (
              <div className="space-y-6 animate-fade-in max-w-lg pb-24 lg:pb-0">
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-5">
                  <h4 className="text-sm font-bold text-white border-b border-zinc-900 pb-2.5 flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Settings className="w-4 h-4 text-[#d4af37]" /> Edit Profile
                  </h4>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-mono text-zinc-500 block">Phone Number (not editable)</label>
                      <VerificationBadge verified={true} />
                    </div>
                    <input
                      type="tel"
                      value={patientPhone}
                      disabled
                      className="w-full bg-zinc-900/50 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-zinc-500 font-mono focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 block">First Name</label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      className="w-full bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase font-mono text-zinc-400 block">Email</label>
                      <div className="flex items-center gap-2">
                        <VerificationBadge verified={emailVerified} />
                        {!emailVerified && patientEmail && !showEmailOtpInput && (
                          <button
                            type="button"
                            onClick={handleSendEmailVerification}
                            disabled={sendingEmailOtp}
                            className="text-[10px] font-bold text-[#E5C158] hover:text-[#d4af37] underline disabled:opacity-50"
                          >
                            {sendingEmailOtp ? "Sending..." : "Verify now"}
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                    />
                    {showEmailOtpInput && (
                      <div className="flex items-center gap-2 pt-1.5 animate-fade-in">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter code"
                          value={emailOtpCode}
                          onChange={(e) => setEmailOtpCode(e.target.value)}
                          className="flex-1 bg-black border border-zinc-900 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={handleConfirmEmailVerification}
                          disabled={verifyingEmailOtp || !emailOtpCode.trim()}
                          className="px-3.5 py-2 bg-[#d4af37] hover:bg-[#b8860b] disabled:opacity-50 text-black font-bold text-xs rounded-xl transition-colors whitespace-nowrap"
                        >
                          {verifyingEmailOtp ? "Confirming..." : "Confirm"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono text-zinc-400 block">State</label>
                    <select
                      value={editState}
                      onChange={(e) => setEditState(e.target.value)}
                      className="w-full bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                    >
                      <option value="" disabled>Select your state</option>
                      {NIGERIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={async () => {
                      if (!onUpdateProfile) return;
                      setSavingProfile(true);
                      try {
                        await onUpdateProfile({ first_name: editFirstName, email: editEmail, state: editState });
                      } finally {
                        setSavingProfile(false);
                      }
                    }}
                    disabled={savingProfile || !editFirstName.trim() || !editState}
                    className="w-full py-2.5 bg-[#d4af37] hover:bg-[#b8860b] disabled:opacity-50 text-black font-extrabold rounded-xl text-xs transition-colors"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>

                  {onDeleteAccount && (
                    <div className="text-center pt-3 border-t border-zinc-900 mt-1">
                      <button
                        onClick={onDeleteAccount}
                        className="text-red-500 text-sm underline hover:text-red-400 transition-colors"
                      >
                        delete my account
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VIEW B: ALL CASES LIST — desktop: list on the left, detail on the right */}
            {activeSidebarTab === "cases" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in items-start">
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-zinc-900 pb-2.5 flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <Clock className="w-4 h-4 text-[#d4af37]" /> Active & Archive Consultations
                  </h4>

                  {allCases.length > 0 ? (
                    <div className="space-y-3">
                      {allCases.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCase(c);
                            // On mobile/tablet there's no side-by-side detail panel, so jump to the dashboard view.
                            if (typeof window !== "undefined" && window.innerWidth < 1024) {
                              setActiveSidebarTab("dashboard");
                            }
                          }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center text-xs ${
                            selectedCase?.id === c.id
                              ? "bg-[#d4af37]/5 border-[#d4af37]"
                              : "bg-black border-zinc-900 hover:border-zinc-800"
                          }`}
                        >
                          <div>
                            <h5 className="font-bold text-zinc-200">{c.condition}</h5>
                            <p className="text-[10px] text-zinc-500 mt-0.5">Ref: {formatConsultationRef(c.id)} • Filed: {formatDate(c.created_at)}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono tracking-widest font-extrabold uppercase ${
                            c.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                      <div>
                        <h5 className="font-bold text-zinc-200">{selectedCase?.condition}</h5>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Filed: {selectedCase ? formatDate(selectedCase.created_at) : "N/A"}</p>
                      </div>
                      {selectedCase && (
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono tracking-widest font-extrabold uppercase ${
                          selectedCase.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {selectedCase.status}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop-only case detail panel */}
                <div className="hidden lg:block bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  {!selectedCase ? (
                    <div className="text-center py-10 space-y-2">
                      <ClipboardCheck className="w-8 h-8 text-zinc-700 mx-auto" />
                      <p className="text-xs text-zinc-500">Select a case from the list to view details here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-4 border-b border-zinc-900 pb-3">
                        <div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            selectedCase.red_flag
                              ? "bg-rose-500/15 text-rose-400"
                              : selectedCase.status === "completed"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : selectedCase.status === "active"
                                  ? "bg-amber-500/15 text-amber-400 animate-pulse"
                                  : "bg-blue-500/15 text-blue-400"
                          }`}>
                            {selectedCase.red_flag ? "Safety Flagged" : selectedCase.status === "completed" ? "Completed / Prescribed" : selectedCase.status === "active" ? "Active Clinician Review" : "Pending Pickup"}
                          </span>
                          <h4 className="text-base font-bold text-white mt-2 font-mono">{selectedCase.condition}</h4>
                          <p className="text-xs text-zinc-400 mt-1">Reference: {formatConsultationRef(selectedCase.id)} • Registered {formatDate(selectedCase.created_at)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono">Assigned Doctor</p>
                          <p className="font-bold text-white mt-0.5">{selectedCase.doctor_name || "Assigning clinical specialist..."}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 font-mono">Evaluation Fee</p>
                          <p className="font-bold text-white mt-0.5">{formatNaira(selectedCase.amount_paid)}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => !selectedCase.red_flag && setActiveSidebarTab("messages")}
                          disabled={selectedCase.red_flag}
                          className="flex-1 px-3.5 py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-bold text-xs rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {selectedCase.red_flag ? "Safety Blocked" : "Consult Doctor"}
                        </button>
                        <button
                          onClick={() => setActiveSidebarTab("reports")}
                          className="flex-1 px-3.5 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-all"
                        >
                          View Reports/Rx
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* VIEW C: LIVE CHAT WINDOW */}
            {activeSidebarTab === "messages" && (
              <div className="bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col h-[calc(100dvh-220px)] lg:h-[600px] overflow-hidden shadow-xl animate-fade-in">
                {!selectedCase ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4">
                    <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto animate-pulse" />
                    <h4 className="font-extrabold text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Secure Chat Room</h4>
                    <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                      No active secure chat rooms. Select a program above to begin your clinical assessment.
                    </p>
                  </div>
                ) : selectedCase.red_flag ? (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-8 space-y-4 bg-rose-500/[0.02]">
                    <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
                    <h4 className="font-extrabold text-white text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Secure Chat Disabled</h4>
                    <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                      This case has been flagged with severe cardiovascular safety risks. Access to doctor consultation chat is restricted for your clinical protection.
                    </p>
                    <span className="text-[10px] text-rose-400 font-mono tracking-wider font-bold uppercase bg-rose-500/10 px-3 py-1 rounded-full">
                      Safety Block Active
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Chat Header */}
                    <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-900/10 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">Confidential Medical Desk Chat</h4>
                          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                            {selectedCase.doctor_name ? `Active Consultation with ${selectedCase.doctor_name}` : "Clinician pending pickup..."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5" /> AES Encrypted
                        </span>
                        <HelpCircle className="w-4 h-4 text-zinc-600" />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 px-5 pt-2">
                      Slots remaining: {Math.max(0, 3 - (selectedCase.slot_count || 0))}
                    </p>

                    {/* Messages Body */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-black/30 text-xs">
                      {selectedCase.messages.length === 0 ? (
                        <div className="text-center py-16 space-y-2">
                          <MessageSquare className="w-10 h-10 text-zinc-800 mx-auto" />
                          <p className="font-bold text-zinc-500">Secure Consultation Active</p>
                          <p className="text-[11px] text-zinc-600 max-w-sm mx-auto leading-relaxed">
                            Your medical details are secure. Type below if you would like to provide additional symptoms or lifestyle queries for your reviewing physician.
                          </p>
                        </div>
                      ) : (
                        selectedCase.messages.map((msg) => {
                          if (msg.sender === "system") {
                            return (
                              <div key={msg.id} className="text-center py-1">
                                <span className="inline-block px-3 py-0.5 text-sm text-gray-400 italic">
                                  {msg.text}
                                </span>
                              </div>
                            );
                          }

                          if (msg.message_type === "ai_response" || msg.sender === "ai") {
                            return (
                              <div key={msg.id} className="flex flex-col items-start">
                                <span className="text-xs font-bold mb-1 px-1" style={{ color: "#C9A84C" }}>Clinical Assistant</span>
                                <div
                                  className="max-w-[280px] px-3.5 py-2.5 text-white"
                                  style={{ backgroundColor: "#1a2a1a", borderRadius: "18px 18px 18px 4px" }}
                                >
                                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                <span className="text-xs text-gray-500 mt-1 px-1 font-mono">
                                  {formatChatTimestamp(msg.timestamp)}
                                </span>
                              </div>
                            );
                          }

                          const isPatient = msg.sender === "patient";
                          return (
                            <div key={msg.id} className={`flex flex-col ${isPatient ? "items-end" : "items-start"}`}>
                              <div
                                className={`max-w-[280px] px-3.5 py-2.5 ${isPatient ? "text-black font-semibold" : "text-white"}`}
                                style={{
                                  backgroundColor: isPatient ? "#C9A84C" : "#2a2a2a",
                                  borderRadius: isPatient ? "18px 18px 4px 18px" : "18px 18px 18px 4px"
                                }}
                              >
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              </div>
                              <span className="text-xs text-gray-500 mt-1 px-1 font-mono">
                                {msg.sender_name} • {formatChatTimestamp(msg.timestamp)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Messages Input Box */}
                    {selectedCase.status === "completed" ? (
                      <div className="p-3.5 bg-black/40 border-t border-zinc-900 text-center text-[10px] text-zinc-500 font-bold italic shrink-0">
                        Consultation file closed. Digital prescription has been issued in the reports tab.
                      </div>
                    ) : (selectedCase.slot_count || 0) >= 3 ? (
                      <div className="p-3.5 bg-zinc-900/40 border-t border-zinc-900 text-center text-xs text-gray-400 shrink-0">
                        Clarification slots full. Doctor responds Day 5.
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-900/10 border-t border-zinc-900 flex gap-2 shrink-0">
                        <input
                          type="text"
                          placeholder="Type confidential message to medical specialist..."
                          value={patientMessage}
                          onChange={(e) => setPatientMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && onSendPatientMessage()}
                          className="flex-1 bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                        />
                        <button
                          onClick={onSendPatientMessage}
                          className="p-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl transition-all"
                        >
                          <Send className="w-4 h-4 text-black" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* VIEW D: MEDICAL REPORTS & PRESCRIPTION SHEETS */}
            {activeSidebarTab === "reports" && (
              <div className="space-y-6 animate-fade-in">
                {!selectedCase ? (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 text-center space-y-4 animate-fade-in">
                    <FileText className="w-12 h-12 text-zinc-700 mx-auto" />
                    <h4 className="text-sm font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No Reports Available</h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                      Reports and digital prescriptions are issued after your clinical assessment. Select a program to begin.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Submitted Intake Answers Card */}
                    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                      <h4 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
                        Submitted Intake Questionnaire
                      </h4>
                      <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                        {selectedCase.raw_answers.map((ans, i) => (
                          <div key={i} className="text-xs border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500 block font-mono text-[10px]">{ans.question}</span>
                            <span className="text-zinc-200 mt-0.5 block">{ans.answer}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Prescription sheet and official PDF card (if case closed) */}
                    {selectedCase.red_flag ? (
                      <div className="p-8 bg-rose-500/5 border border-rose-500/15 rounded-2xl text-center space-y-3.5 animate-fade-in">
                        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto animate-pulse" />
                        <h5 className="font-extrabold text-rose-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Online Prescription Locked</h5>
                        <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                          Due to cardiovascular safety contraindications detected during clinical safety reviews, remote prescription issuance is strictly locked. Please visit a cardiologist or general hospital for physical assessment.
                        </p>
                      </div>
                    ) : selectedCase.status === "completed" ? (
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl" />
                        
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h4 className="text-base font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                              <Compass className="w-5 h-5 text-emerald-400" /> Digital Evaluation & Prescription Sheet
                            </h4>
                            <p className="text-xs text-zinc-500 mt-1">MDCN Clinical Seal is verified and active. Cryptographic document compiled.</p>
                          </div>

                          {/* PDF Print CTA */}
                          <button
                            onClick={() => triggerDownloadPDF(selectedCase)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-1.5"
                          >
                            <FileDown className="w-4 h-4 text-black" /> Download PDF Prescription
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">Doctor Notes</label>
                            <div className="text-xs text-zinc-300 leading-relaxed bg-black p-4 rounded-xl border border-zinc-900 min-h-[100px] max-h-[300px] overflow-y-auto space-y-1.5">
                              {selectedCase.doctor_notes ? renderRichText(selectedCase.doctor_notes) : <p className="italic text-zinc-500">Your assessment is complete. Follow lifestyle remedies and pharmaceutical advice detailed in this panel.</p>}
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-mono tracking-widest text-[#E5C158] font-bold block">Issued Pharmaceutical Rx</label>
                            <div className="text-xs font-mono text-white bg-black p-4 rounded-xl border border-zinc-900 leading-relaxed min-h-[100px] max-h-[300px] overflow-y-auto space-y-1 text-left">
                              {selectedCase.prescription ? renderRichText(selectedCase.prescription) : "No active prescription required."}
                            </div>
                          </div>
                        </div>

                        {/* Raise Dispute Box */}
                        <div className="mt-6 pt-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-red-950/[0.02] p-4 rounded-xl border border-zinc-900/60">
                          <div>
                            <h5 className="font-bold text-zinc-300 text-xs">Dissatisfied with this clinical consultation?</h5>
                            <p className="text-[11px] text-zinc-500 mt-0.5">You can escalate this case file to administrative medical supervisors for a clinical review.</p>
                          </div>
                          
                          {disputeSubmitted ? (
                            <span className="text-[10px] text-amber-500 font-mono font-bold uppercase tracking-wider bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/15">
                              Dispute Lodged / Pending Review
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setDisputeReason("");
                                setDisputeError("");
                                setOpenDisputeForm(true);
                              }}
                              className="px-4 py-2 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white font-bold text-xs rounded-xl transition-all"
                            >
                              File Formal Dispute
                            </button>
                          )}
                        </div>

                        {openDisputeForm && (
                          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-fade-in text-left">
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Escalate Consultation Dispute
                                </h4>
                                <p className="text-xs text-zinc-400 mt-1">
                                  Briefly detail your clinical concerns or grievance. Admin supervisors will audit your intake, doctor transcripts, and prescription.
                                </p>
                              </div>

                              {disputeError && (
                                <p className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-[10px] text-rose-400 font-mono">
                                  {disputeError}
                                </p>
                              )}

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Dispute Reason Category</label>
                                <select
                                  value={disputeCategory}
                                  onChange={(e) => setDisputeCategory(e.target.value)}
                                  className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                                >
                                  <option value="Incorrect prescription advice / dose discrepancy">Incorrect prescription advice / dose discrepancy</option>
                                  <option value="Doctor failed to answer medical inquiries fully">Doctor failed to answer medical inquiries fully</option>
                                  <option value="Poor clinical bedside manner / communication">Poor clinical bedside manner / communication</option>
                                  <option value="Clinical safety check bypass or incorrect diagnosis">Clinical safety check bypass or incorrect diagnosis</option>
                                  <option value="Administrative issue or system error">Administrative issue or system error</option>
                                </select>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-mono text-zinc-400 block font-bold">Detailed Explanation (Mandatory)</label>
                                <textarea
                                  required
                                  placeholder="Describe your grievance in detail..."
                                  value={disputeReason}
                                  onChange={(e) => setDisputeReason(e.target.value)}
                                  rows={4}
                                  className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/40">
                                <button
                                  type="button"
                                  onClick={() => { setOpenDisputeForm(false); setDisputeError(""); }}
                                  className="px-3.5 py-1.5 border border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={!disputeReason.trim() || submittingDispute}
                                  onClick={async () => {
                                    setSubmittingDispute(true);
                                    setDisputeError("");
                                    try {
                                      const response = await fetch("/api/data/disputes", {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          "x-patient-phone": selectedCase.patient_phone || ""
                                        },
                                        body: JSON.stringify({
                                          id: "disp_" + Math.random().toString(36).substr(2, 9),
                                          consultation_id: selectedCase.id,
                                          patient_phone: selectedCase.patient_phone,
                                          reason: `${disputeCategory}: ${disputeReason}`,
                                          status: "pending",
                                          created_at: new Date().toISOString()
                                        })
                                      });
                                      const resData = await response.json();
                                      if (!response.ok) {
                                        setDisputeError(resData.message || "Failed to lodge dispute. Please try again.");
                                      } else {
                                        setDisputeSubmitted(true);
                                        setOpenDisputeForm(false);
                                        toast.success("Dispute lodged successfully. Admin supervisors will audit your file.");
                                      }
                                    } catch (err) {
                                      setDisputeError("Failed to communicate with secure servers.");
                                    } finally {
                                      setSubmittingDispute(false);
                                    }
                                  }}
                                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold rounded-lg text-xs transition-all animate-pulse"
                                >
                                  {submittingDispute ? "Submitting..." : "Escalate Now"}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 bg-zinc-950 rounded-2xl border border-dashed border-zinc-900 text-center space-y-2">
                        <ShieldAlert className="w-8 h-8 text-zinc-700 mx-auto" />
                        <h5 className="font-bold text-zinc-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Prescription sheet is not yet published</h5>
                        <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                          Your consulting doctor has not closed your file. Active medical chat is active above. Once closed, your official signed Rx sheet will generate instantly.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
