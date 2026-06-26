import React from "react";
import { 
  Shield, Key, Lock, Users, Sparkles, Send, FileText, 
  Wallet, ArrowRight, HelpCircle, Activity, Building, LogOut, CheckCircle, Clock,
  Bold, Italic, List, ShieldAlert, Plus, Trash, Check, FileDown, Eye, RefreshCw
} from "lucide-react";
import { Doctor, Consultation } from "../types";
import { consultationApi, doctorApi } from "../lib/api";
import { renderRichText } from "../utils";
import { getStageTitle, getSLAHours, ConsultationStage } from "../lifecycle";
import { getTemplates, saveCustomTemplate, deleteCustomTemplate, validateTemplatePlaceholders, ResponseTemplate } from "../templates";
import { generateConsultationPDF } from "../utils/pdfGenerator";

interface ClinicianAreaProps {
  currentDoctor: Doctor | null;
  setCurrentDoctor: (doc: Doctor | null) => void;
  docView: "login" | "cases" | "wallet";
  setDocView: (v: "login" | "cases" | "wallet") => void;
  isRegistering: boolean;
  setIsRegistering: (v: boolean) => void;
  docFolio: string;
  setDocFolio: (v: string) => void;
  docPin: string;
  setDocPin: (v: string) => void;
  docRegName: string;
  setDocRegName: (v: string) => void;
  docRegPhone: string;
  setDocRegPhone: (v: string) => void;
  docRegFolio: string;
  setDocRegFolio: (v: string) => void;
  docRegAplYear: string;
  setDocRegAplYear: (v: string) => void;
  docRegPin: string;
  setDocRegPin: (v: string) => void;
  docError: string;
  setDocError: (v: string) => void;
  docSuccess: string;
  setDocSuccess: (v: string) => void;
  selectedDoctorCase: Consultation | null;
  setSelectedDoctorCase: (c: Consultation | null) => void;
  doctorMessage: string;
  setDoctorMessage: (v: string) => void;
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  aiDraft: string;
  setAiDraft: (v: string) => void;
  isGeneratingDraft: boolean;
  setIsGeneratingDraft: (v: boolean) => void;
  closingNotes: string;
  setClosingNotes: (v: string) => void;
  closingPrescription: string;
  setClosingPrescription: (v: string) => void;
  showCloseModal: boolean;
  setShowCloseModal: (v: boolean) => void;
  payoutAmount: string;
  setPayoutAmount: (v: string) => void;
  payoutBank: string;
  setPayoutBank: (v: string) => void;
  payoutAccount: string;
  setPayoutAccount: (v: string) => void;
  payoutMsg: { type: string; text: string };
  setPayoutMsg: (v: { type: string; text: string }) => void;
  onDoctorLogin: (e: React.FormEvent) => void;
  onDoctorRegister: (e: React.FormEvent) => void;
  onDoctorClaimCase: (id: string) => void;
  onSendDoctorMessage: () => void;
  onGenerateAIDraft: () => void;
  onCompleteConsultation: () => void;
  onPayoutRequest: (e: React.FormEvent) => void;
  formatDate: (d: string) => string;
  formatNaira: (n: number) => string;
  triggerRefresh: () => void;
}

export default function ClinicianArea({
  currentDoctor,
  setCurrentDoctor,
  docView,
  setDocView,
  isRegistering,
  setIsRegistering,
  docFolio,
  setDocFolio,
  docPin,
  setDocPin,
  docRegName,
  setDocRegName,
  docRegPhone,
  setDocRegPhone,
  docRegFolio,
  setDocRegFolio,
  docRegAplYear,
  setDocRegAplYear,
  docRegPin,
  setDocRegPin,
  docError,
  setDocError,
  docSuccess,
  setDocSuccess,
  selectedDoctorCase,
  setSelectedDoctorCase,
  doctorMessage,
  setDoctorMessage,
  aiPrompt,
  setAiPrompt,
  aiDraft,
  setAiDraft,
  isGeneratingDraft,
  setIsGeneratingDraft,
  closingNotes,
  setClosingNotes,
  closingPrescription,
  setClosingPrescription,
  showCloseModal,
  setShowCloseModal,
  payoutAmount,
  setPayoutAmount,
  payoutBank,
  setPayoutBank,
  payoutAccount,
  setPayoutAccount,
  payoutMsg,
  setPayoutMsg,
  onDoctorLogin,
  onDoctorRegister,
  onDoctorClaimCase,
  onSendDoctorMessage,
  onGenerateAIDraft,
  onCompleteConsultation,
  onPayoutRequest,
  formatDate,
  formatNaira,
  triggerRefresh
}: ClinicianAreaProps) {
  
  // Rich-text editor local states & helpers
  const [notesMode, setNotesMode] = React.useState<"edit" | "preview">("edit");
  const [prescriptionMode, setPrescriptionMode] = React.useState<"edit" | "preview">("edit");
  const [responseCentreTab, setResponseCentreTab] = React.useState<"intake" | "summary" | "thinking">("intake");

  // Template and Referral states
  const [refreshTemplatesCounter, setRefreshTemplatesCounter] = React.useState<number>(0);
  const [validationError, setValidationError] = React.useState<string>("");
  const [showCustomTemplateForm, setShowCustomTemplateForm] = React.useState<boolean>(false);
  const [customTemplateTitle, setCustomTemplateTitle] = React.useState<string>("");
  const [customTemplateContent, setCustomTemplateContent] = React.useState<string>("");
  const [customTemplateCondition, setCustomTemplateCondition] = React.useState<string>("Erectile Dysfunction");
  const [customTemplateStage, setCustomTemplateStage] = React.useState<"initial" | "day2" | "day5" | "review">("initial");
  
  const [referralModalOpen, setReferralModalOpen] = React.useState<boolean>(false);
  const [referralSpecialty, setReferralSpecialty] = React.useState<string>("Urology / Consultant Andrologist");
  const [referralUrgency, setReferralUrgency] = React.useState<"Low" | "Routine" | "Urgent" | "Emergency">("Routine");
  const [referralNotes, setReferralNotes] = React.useState<string>("");

  const [templateFilterStage, setTemplateFilterStage] = React.useState<string>("initial");
  const [templateFilterCondition, setTemplateFilterCondition] = React.useState<string>("all");

  React.useEffect(() => {
    if (selectedDoctorCase) {
      // Set stage filter
      let filterStage: "initial" | "day2" | "day5" | "review" = "initial";
      const stageStr = (selectedDoctorCase.stage || "") as string;
      if (stageStr === "day2_pending" || stageStr === "day2_sent" || stageStr === "day2_response_at") {
        filterStage = "day2";
      } else if (stageStr === "day5_pending" || stageStr === "day5_closed" || stageStr === "day5_closed_at") {
        filterStage = "day5";
      } else if (stageStr === "review_open" || stageStr === "review_closed") {
        filterStage = "review";
      }
      setTemplateFilterStage(filterStage);

      // Set condition filter
      let cond = "all";
      const conditionLower = (selectedDoctorCase.condition || "").toLowerCase();
      if (conditionLower.includes("erectile") || conditionLower.includes("ed")) {
        cond = "Erectile Dysfunction";
      } else if (conditionLower.includes("premature") || conditionLower.includes("pe")) {
        cond = "Premature Ejaculation";
      } else if (conditionLower.includes("hair")) {
        cond = "Male Pattern Baldness";
      }
      setTemplateFilterCondition(cond);

      // Reset referral fields
      setReferralSpecialty(
        conditionLower.includes("erectile") || conditionLower.includes("pe")
          ? "Urology / Consultant Andrologist"
          : "Dermatovenereology / Sexual Health"
      );
      setReferralUrgency("Routine");
      setReferralNotes(
        `Patient ${selectedDoctorCase.patient_name} presented via discrete men's health portal with symptoms matching ${selectedDoctorCase.condition}. Screening indicates potential risk markers or refractory symptoms. Referred for physical urological evaluation and safe vascular and hormonal screening prior to treatment activation.`
      );
    }
  }, [selectedDoctorCase]);

  const handleLocalSendDay2Checkin = () => {
    if (!selectedDoctorCase || !currentDoctor) return;
    const msgText = "Clinical Day-2 Follow-up Check-in:\n\nHello! This is your confidential medical program follow-up. Please let me know how you are progressing with your prescribed therapy and if you have noticed any early improvements or side effects so we can adjust as needed.";
    const res = consultationApi.sendDay2Checkin(selectedDoctorCase.id, msgText, currentDoctor.name);
    if (res.success) {
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
      alert("Day-2 Follow-up check-in sent successfully to the patient!");
    }
  };

  const handleLocalProgressToDay5 = () => {
    if (!selectedDoctorCase) return;
    const res = consultationApi.progressToDay5(selectedDoctorCase.id);
    if (res.success) {
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
      alert("Case progressed to Day-5 clinical evaluation!");
    }
  };

  const handleLocalResolveReview = () => {
    if (!selectedDoctorCase) return;
    if (!closingNotes.trim()) {
      alert("Please provide clinical review notes to resolve the review.");
      return;
    }

    const notesValidation = validateTemplatePlaceholders(closingNotes);
    const prescriptionValidation = validateTemplatePlaceholders(closingPrescription);
    if (!notesValidation.ok || !prescriptionValidation.ok) {
      const allPlaceholders = Array.from(new Set([...notesValidation.tokens, ...prescriptionValidation.tokens]));
      alert(`Submission Blocked: Clinical notes or prescription contain 5 or more unedited placeholder tokens. Please customize these prior to resolving:\n\n${allPlaceholders.join(", ")}`);
      return;
    }

    const res = consultationApi.resolveReview(selectedDoctorCase.id, closingNotes, closingPrescription);
    if (res.success) {
      setClosingNotes("");
      setClosingPrescription("");
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
      alert("Review resolved! Updated clinical directives and prescription archived.");
    }
  };

  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTemplateTitle.trim() || !customTemplateContent.trim()) {
      alert("Please enter a title and text content for your custom template.");
      return;
    }
    saveCustomTemplate({
      title: customTemplateTitle,
      content: customTemplateContent,
      condition: customTemplateCondition,
      stage: customTemplateStage
    });
    setCustomTemplateTitle("");
    setCustomTemplateContent("");
    setShowCustomTemplateForm(false);
    setRefreshTemplatesCounter(prev => prev + 1);
    alert("Custom clinical template saved successfully!");
  };

  const handleDeleteCustomTemplate = (id: string) => {
    if (confirm("Are you sure you want to permanently delete this custom clinical template?")) {
      deleteCustomTemplate(id);
      setRefreshTemplatesCounter(prev => prev + 1);
    }
  };

  const handleCreateReferral = async () => {
    if (!selectedDoctorCase) return;
    if (!referralNotes.trim()) {
      alert("Please fill in specific physical findings and referral notes.");
      return;
    }

    const refLetter = `OFFICIAL CLINICAL SPECIALIST REFERRAL
Date: ${new Date().toLocaleDateString()}
Patient Name: ${selectedDoctorCase.patient_name}
Date of Birth Ref: ${selectedDoctorCase.patient_age} Years
Active Symptomatic Condition: ${selectedDoctorCase.condition}

Referred To: Head of Department, ${referralSpecialty}
Facility: Accredited Secondary / Tertiary Healthcare Hospital
Clinical Urgency level: [ ${referralUrgency.toUpperCase()} ]

CLINICAL FINDINGS & DIAGNOSTIC DIRECTIVES:
${referralNotes}

Signed: Dr. ${currentDoctor?.name || "Verified Practitioner"}
MDCN Registration Folio: ${currentDoctor?.mdcn_folio || "MDCN-REGISTERED"}`;

    const res = consultationApi.updateReferral(selectedDoctorCase.id, refLetter);
    if (res.success) {
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) {
        setSelectedDoctorCase(updated);
        // Automatically download the beautifully styled Referral Letter PDF
        await generateConsultationPDF(updated, "referral", {
          referralSpecialty,
          referralUrgency,
          referralNotes,
          doctorMdcnFolio: currentDoctor?.mdcn_folio
        });
      }
      triggerRefresh();
      setReferralModalOpen(false);
      alert("Specialist clinical referral letter has been compiled, saved, and downloaded successfully!");
    } else {
      alert("Unable to save referral record.");
    }
  };

  const noteTemplates = [
    {
      name: "Mild PE Profile",
      text: "Patient presents with mild premature ejaculation (intromission duration approx 1.5 - 2 mins). No signs of erectile dysfunction or structural abnormalities. Recommended stop-start therapy and pelvic floor muscle conditioning."
    },
    {
      name: "ED Clearance",
      text: "Thorough assessment of patient history shows mild situational erectile weakness. Evaluated cardiac and blood pressure parameters; clear of active organic contraindications. Cleared for on-demand therapy."
    },
    {
      name: "Lifestyle & Stress",
      text: "Comprehensive lifestyle assessment completed. Advised reduction of performance-related stress triggers. Issued directives on mindfulness-based physical conditioning, breathing exercises, and scheduling follow-up in 14 days."
    }
  ];

  const prescriptionTemplates = [
    {
      name: "Sildenafil 50mg",
      text: "• Sildenafil (Viagra) 50mg Tablets\n• Take 1 tablet orally on an empty stomach approximately 45-60 minutes before scheduled intimate activity.\n• Maximum dosing frequency: 1 tablet per 24 hours.\n• WARNING: Do not combine with nitrate-based cardiovascular drugs."
    },
    {
      name: "Tadalafil 5mg Daily",
      text: "• Tadalafil (Cialis) 5mg Tablets\n• Take 1 tablet orally at the same time each day, regardless of timing of intimate activity.\n• Maintain continuous daily administration to ensure stable systemic levels.\n• WARNING: Strictly contraindicated with any form of organic nitrates."
    },
    {
      name: "Dapoxetine 30mg On-Demand",
      text: "• Dapoxetine (Priligy) 30mg Tablets\n• Take 1 tablet orally with a full glass of water, 1 to 3 hours prior to intimate activity.\n• Indicated for performance control and delaying ejaculation.\n• Use on-demand only; do not exceed 1 tablet in 24 hours."
    }
  ];

  const handleFormat = (
    field: "notes" | "rx",
    type: "bold" | "italic" | "bullet"
  ) => {
    const elementId = field === "notes" ? "closing-notes-textarea" : "closing-rx-textarea";
    const textarea = document.getElementById(elementId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = "";
    let cursorOffset = 0;

    if (type === "bold") {
      replacement = `**${selectedText || "bold text"}**`;
      cursorOffset = selectedText ? replacement.length : 2;
    } else if (type === "italic") {
      replacement = `*${selectedText || "italic text"}*`;
      cursorOffset = selectedText ? replacement.length : 1;
    } else if (type === "bullet") {
      const prefix = text.length === 0 || text.substring(start - 1, start) === "\n" ? "" : "\n";
      replacement = `${prefix}• ${selectedText || "list item"}`;
      cursorOffset = selectedText ? replacement.length : prefix.length + 2;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    
    if (field === "notes") {
      setClosingNotes(newValue);
    } else {
      setClosingPrescription(newValue);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };
  
  // Re-fetch calculations inside context
  const activeConsultations = consultationApi.getAll();
  const pendingCases = activeConsultations.filter(c => c.status === "pending" && !c.red_flag);
  const claimedCases = currentDoctor ? activeConsultations.filter(c => c.doctor_id === currentDoctor.id) : [];

  return (
    <div className="w-full">
      {/* SECTION 1: CLINICIAN GUEST PORTAL (LOGIN & REGISTER) */}
      {!currentDoctor ? (
        <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-600" />
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-1">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Clinician Administration Access
            </h3>
            <p className="text-xs text-zinc-400">
              {isRegistering ? "Register your credentials for active clinical cycle" : "Enter folio and PIN to authorize clinician console"}
            </p>
          </div>

          {docError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
              {docError}
            </div>
          )}

          {docSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
              {docSuccess}
            </div>
          )}

          {/* REGISTER DRAWER */}
          {isRegistering ? (
            <form onSubmit={onDoctorRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Physician Name (as on registry)</label>
                <input required type="text" placeholder="e.g. Dr. Adeola Martins" value={docRegName} onChange={(e) => setDocRegName(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Mobile Phone Number</label>
                <input required type="tel" placeholder="e.g. +234 805..." value={docRegPhone} onChange={(e) => setDocRegPhone(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Medical Folio Code</label>
                  <input required type="text" placeholder="e.g. FM12487" value={docRegFolio} onChange={(e) => setDocRegFolio(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">APL Active Year</label>
                  <input required type="number" placeholder="e.g. 2025" value={docRegAplYear} onChange={(e) => setDocRegAplYear(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Set Console PIN (Numerical)</label>
                <input required type="password" placeholder="e.g. ****" value={docRegPin} onChange={(e) => setDocRegPin(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow">
                Submit Practice Application
              </button>
              <button type="button" onClick={() => { setIsRegistering(false); setDocError(""); setDocSuccess(""); }} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-400 transition-colors py-1">
                Already registered? Access Console
              </button>
            </form>
          ) : (
            /* LOGIN DRAWER */
            <form onSubmit={onDoctorLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Verified Folio Number</label>
                <input required type="text" placeholder="e.g. FM12487" value={docFolio} onChange={(e) => setDocFolio(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Console Security PIN</label>
                <input required type="password" placeholder="e.g. ****" value={docPin} onChange={(e) => setDocPin(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow">
                Authorize Practice Console
              </button>
              <button type="button" onClick={() => { setIsRegistering(true); setDocError(""); setDocSuccess(""); }} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-400 transition-colors py-1">
                New physician? Register credentials
              </button>
            </form>
          )}
        </div>
      ) : (
        /* SECTION 2: CLINICIAN PORTAL INTERFACES (CASES, CHAT, WALLET) */
        <div className="space-y-8 animate-fade-in">
          
          {/* Authenticated Physician Banner */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#E5C158] font-mono font-bold flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#d4af37]" /> Verified Practitioner
              </span>
              <h3 className="text-xl font-bold text-white mt-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Welcome, {currentDoctor.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Folio Code: <span className="font-mono text-zinc-300 font-bold">{currentDoctor.mdcn_folio}</span> • Licensed cycle active.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2.5 items-center">
              <button 
                onClick={() => { setDocView("cases"); setSelectedDoctorCase(null); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  docView === "cases" ? "bg-[#d4af37] text-black" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                Case Caseloads ({claimedCases.length})
              </button>
              <button 
                onClick={() => { setDocView("wallet"); setPayoutMsg({ type: "", text: "" }); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  docView === "wallet" ? "bg-[#d4af37] text-black" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4" /> Wallet ({formatNaira(currentDoctor.payout_balance)})
              </button>
              <button 
                onClick={() => { setCurrentDoctor(null); setSelectedDoctorCase(null); }}
                className="p-2 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                title="Disconnect clinic console"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Compliance Suspension Alert Banner */}
          {(currentDoctor.flagged || currentDoctor.status === "suspended") && (
            <div className="bg-rose-950/20 border border-rose-900/40 text-rose-200 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                <span>Clinical Portfolio Suspended — Compliance Hold</span>
              </div>
              <p className="text-xs leading-relaxed text-rose-300/80">
                Notice: Your MDCN clinical registration has been placed on a supervisor hold. Under platform protocols and clinical safety supervision controls, you are restricted from accepting or claiming new medical intake folders until a clinical audit review resolves this issue.
              </p>
              {currentDoctor.flag_reason && (
                <div className="bg-black/40 border border-rose-950 p-3 rounded-xl text-xs font-mono text-rose-400">
                  <span className="font-bold text-rose-300 block mb-1">Reason for hold:</span>
                  {currentDoctor.flag_reason}
                </div>
              )}
            </div>
          )}

          {/* VIEW A: MAIN ACTIVE & PENDING CASE DESK */}
          {docView === "cases" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Queues List (Active claimed & Open unassigned) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Active Claimed Caseloads */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Your Assigned Caseloads ({claimedCases.length})
                  </h4>
                  {claimedCases.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No claimed consultations. Pick up active files below.</p>
                  ) : (
                    <div className="space-y-2">
                      {claimedCases.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedDoctorCase(c); triggerRefresh(); }}
                          className={`w-full p-3.5 rounded-xl text-left border text-xs transition-all flex justify-between items-center ${
                            selectedDoctorCase?.id === c.id 
                              ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158]" 
                              : "bg-black border-zinc-900 hover:border-zinc-850 text-zinc-300"
                          }`}
                        >
                          <div>
                            <span className="font-bold block truncate max-w-[140px]">{c.patient_name}</span>
                            <span className="text-[10px] text-zinc-500 mt-0.5 block truncate max-w-[140px]">{c.condition}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            c.status === "completed" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                              : c.stage === "review_open" 
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                          }`}>
                            {c.stage ? getStageTitle(c.stage as any) : "Initial"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Open Pending Queue */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-[#E5C158] uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Open Consultations Queue ({pendingCases.length})
                  </h4>
                  {pendingCases.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No open case files pending pickup in this cycle.</p>
                  ) : (
                    <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                      {pendingCases.map(c => (
                        <div key={c.id} className="p-4 bg-black rounded-xl border border-zinc-900 space-y-3">
                          <div>
                            <span className="font-bold text-white block text-xs">{c.condition}</span>
                            <span className="text-[9.5px] text-zinc-500 font-mono mt-0.5 block">File ID: {c.id} • Age: {c.patient_age}</span>
                          </div>
                          
                          <div className="text-[10.5px] text-zinc-400 space-y-1 leading-relaxed italic border-l border-zinc-800 pl-2">
                            {c.raw_answers.slice(0, 2).map((ans, idx) => (
                              <p key={idx}>• {ans.question}: <strong className="text-zinc-200">{ans.answer}</strong></p>
                            ))}
                          </div>

                          <button
                            onClick={() => onDoctorClaimCase(c.id)}
                            className="w-full py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-[10.5px] rounded-lg transition-colors"
                          >
                            Accept & Claim Case File
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Case Details & Messaging stage */}
              <div className="lg:col-span-8">
                {selectedDoctorCase ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Panel 1: Response Centre (MD-Left) */}
                    <div className="md:col-span-5 space-y-6">
                      
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                        <div className="border-b border-zinc-900 pb-2 flex flex-col gap-1.5">
                          <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                            Clinical Console
                          </h4>
                          <h3 className="text-sm font-extrabold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            Response Centre
                          </h3>
                        </div>

                        {/* Sub-tab Bar */}
                        <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-xl border border-zinc-900">
                          <button
                            type="button"
                            onClick={() => setResponseCentreTab("intake")}
                            className={`py-1.5 px-1 text-[9.5px] font-extrabold rounded-lg transition-all text-center whitespace-nowrap ${
                              responseCentreTab === "intake" 
                                ? "bg-zinc-900 text-[#E5C158] border border-zinc-800" 
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            Patient's Intake
                          </button>
                          <button
                            type="button"
                            onClick={() => setResponseCentreTab("summary")}
                            className={`py-1.5 px-1 text-[9.5px] font-extrabold rounded-lg transition-all text-center whitespace-nowrap ${
                              responseCentreTab === "summary" 
                                ? "bg-zinc-900 text-[#E5C158] border border-zinc-800" 
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            Patient Summary
                          </button>
                          <button
                            type="button"
                            onClick={() => setResponseCentreTab("thinking")}
                            className={`py-1.5 px-1 text-[9.5px] font-extrabold rounded-lg transition-all text-center whitespace-nowrap ${
                              responseCentreTab === "thinking" 
                                ? "bg-zinc-900 text-[#E5C158] border border-zinc-800" 
                                : "text-zinc-500 hover:text-zinc-300"
                            }`}
                          >
                            Clinical Thinking
                          </button>
                        </div>

                        {/* TAB CONTENT: PATIENT'S INTAKE */}
                        {responseCentreTab === "intake" && (
                          <div className="space-y-4 animate-fade-in text-xs">
                            <div className="bg-black/50 rounded-xl p-3 border border-zinc-900 space-y-2 text-zinc-400">
                              <p className="flex justify-between"><span>Case Ref:</span> <strong className="text-white font-mono">{selectedDoctorCase.id}</strong></p>
                              <p className="flex justify-between"><span>Registered:</span> <strong className="text-white">{formatDate(selectedDoctorCase.created_at)}</strong></p>
                              <p className="flex justify-between"><span>Patient Name:</span> <strong className="text-white">{selectedDoctorCase.patient_name}</strong></p>
                              <p className="flex justify-between"><span>Age Reference:</span> <strong className="text-white">{selectedDoctorCase.patient_age} years</strong></p>
                              <p className="flex justify-between"><span>Condition:</span> <strong className="text-[#E5C158] font-semibold">{selectedDoctorCase.condition}</strong></p>
                              <p className="flex justify-between"><span>Duration:</span> <strong className="text-zinc-200">{selectedDoctorCase.duration}</strong></p>
                              <p className="flex justify-between"><span>Clinical Stage:</span> <strong className="text-emerald-400 font-mono">{getStageTitle((selectedDoctorCase.stage || "initial") as any)}</strong></p>
                              <p className="flex justify-between"><span>SLA SLA:</span> <strong className="text-zinc-400 font-mono">{getSLAHours((selectedDoctorCase.stage || "initial") as any)} Hours</strong></p>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold block">Patient Answers Checklist</label>
                              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                {selectedDoctorCase.raw_answers && selectedDoctorCase.raw_answers.length > 0 ? (
                                  selectedDoctorCase.raw_answers.map((ans: any, i: number) => (
                                    <div key={i} className="p-2.5 bg-black/40 rounded-lg border border-zinc-900 space-y-0.5">
                                      <p className="text-[9px] text-zinc-500 font-semibold uppercase">{ans.question?.replace(/_/g, " ")}</p>
                                      <p className="text-[11px] text-zinc-300 font-medium">{ans.answer}</p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 bg-zinc-900/10 text-center text-[10px] text-zinc-500 italic rounded-lg">
                                    No detailed questionnaire answers logged.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* TAB CONTENT: PATIENT SUMMARY */}
                        {responseCentreTab === "summary" && (
                          <div className="space-y-4 animate-fade-in text-xs">
                            <div className="bg-gradient-to-br from-amber-500/5 to-black border border-[#d4af37]/15 rounded-xl p-4 space-y-2.5">
                              <h5 className="font-bold text-[#E5C158] flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-mono border-b border-[#d4af37]/10 pb-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" /> Claude Clinical Brief
                              </h5>
                              <p className="text-[11px] text-zinc-400 leading-relaxed italic bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900 whitespace-pre-wrap">
                                {selectedDoctorCase.ai_summary || "Claude is compiling safety brief..."}
                              </p>
                            </div>

                            {selectedDoctorCase.red_flag && (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                  ⚠️ Cardiovascular Contraindication Block
                                </p>
                                <p className="text-[10px] text-zinc-400 leading-relaxed">
                                  Our clinical sweeps identified cardiovascular risks. Source: <strong className="text-red-400 font-mono uppercase">{selectedDoctorCase.red_flag_source || "ai"}</strong>. Remote prescription blocked.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB CONTENT: CLINICAL THINKING */}
                        {responseCentreTab === "thinking" && (
                          <div className="space-y-4 animate-fade-in text-xs text-zinc-400">
                            <div className="bg-black/50 border border-zinc-900 p-4 rounded-xl space-y-3">
                              <h5 className="font-extrabold text-white text-[10.5px] uppercase tracking-wider font-mono border-b border-zinc-900 pb-1.5">
                                Condition Safety Rules
                              </h5>
                              <div className="space-y-2 text-[11px] leading-relaxed">
                                {selectedDoctorCase.condition?.toLowerCase().includes("erectile") || selectedDoctorCase.condition?.toLowerCase().includes("ed") ? (
                                  <>
                                    <p className="text-[#E5C158] font-bold">✓ Vasoactive Safety Guidelines:</p>
                                    <p>1. Rule out co-administration with nitrates (isosorbide, nitroglycerin) — absolute contraindication.</p>
                                    <p>2. Verify patient has no severe cardiovascular events within the last 6 months.</p>
                                    <p>3. Differentiate between organic, psychogenic, and mixed etiologies.</p>
                                  </>
                                ) : selectedDoctorCase.condition?.toLowerCase().includes("premature") || selectedDoctorCase.condition?.toLowerCase().includes("pe") ? (
                                  <>
                                    <p className="text-[#E5C158] font-bold">✓ Latency & SSRI Safety Guidelines:</p>
                                    <p>1. Review baseline intravaginal ejaculatory latency time (IELT).</p>
                                    <p>2. Screen for history of mania, severe depression, or seizure disorders.</p>
                                    <p>3. Note SSRI safety warnings and potential interactions with other serotonergic agents.</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-[#E5C158] font-bold">✓ General Telehealth Assessment:</p>
                                    <p>1. Always match findings with demographic risk parameters.</p>
                                    <p>2. Cross-examine user-provided symptoms with standard clinical models.</p>
                                    <p>3. Verify patient has access to a primary care provider for regular checkups.</p>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="p-3 bg-[#d4af37]/5 border border-[#d4af37]/10 rounded-xl text-[10px] leading-relaxed">
                              💡 <strong>Physician Tip:</strong> Your responses represent signed legal documents. Personalize the AI draft thoroughly before certifying the care program.
                            </div>
                          </div>
                        )}

                      </div>

                    </div>

                    {/* Panel 2: Secure live chat (MD-Center/Right) */}
                    <div className="md:col-span-7 space-y-6">
                      
                      <div className="bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col h-[320px] overflow-hidden">
                        <div className="px-4 py-3 bg-zinc-900/10 border-b border-zinc-900 flex justify-between items-center text-xs">
                          <span className="font-bold text-white">Direct Medical Dialogue</span>
                          <span className="text-[9.5px] font-mono text-zinc-500">AES Encrypted</span>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-black/10 text-xs">
                          {selectedDoctorCase.messages.map(msg => {
                            if (msg.sender === "system") {
                              return (
                                <div key={msg.id} className="text-center py-0.5">
                                  <span className="inline-block px-2.5 py-0.5 bg-zinc-900 text-[8px] text-zinc-500 rounded-full">
                                    {msg.text}
                                  </span>
                                </div>
                              );
                            }
                            const isDoctor = msg.sender === "doctor";
                            return (
                              <div key={msg.id} className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[240px] rounded-2xl p-3 space-y-1 ${
                                  isDoctor ? "bg-[#d4af37] text-black font-semibold rounded-tr-none" : "bg-zinc-900 text-zinc-200 rounded-tl-none"
                                }`}>
                                  <span className="text-[8px] block opacity-75 uppercase font-mono tracking-wider font-extrabold">{msg.sender_name}</span>
                                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Send Inputs */}
                        {selectedDoctorCase.status !== "completed" ? (
                          <div className="p-2 border-t border-zinc-900 flex gap-2">
                            <input
                              type="text"
                              placeholder="Reply with clinical instructions..."
                              value={doctorMessage}
                              onChange={(e) => setDoctorMessage(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && onSendDoctorMessage()}
                              className="flex-1 bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                            />
                            <button onClick={onSendDoctorMessage} className="p-2 bg-[#d4af37] text-black rounded-xl hover:brightness-110 transition-all">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-zinc-900/40 border-t border-zinc-900 text-center text-[10px] text-zinc-500 italic">
                            Caseload file closed. Evaluation archived.
                          </div>
                        )}
                      </div>

                      {/* AI Response Copilot (Claude-powered) & Closing file drawers */}
                      {selectedDoctorCase.status !== "completed" && (
                        <div className="space-y-4">
                          {/* Copilot */}
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3.5">
                            <h5 className="text-xs font-bold text-[#E5C158] flex items-center gap-1.5 uppercase tracking-wider font-mono">
                              <Sparkles className="w-4 h-4 text-[#d4af37]" /> AI Response Copilot (Claude-powered)
                            </h5>
                            <p className="text-[10.5px] text-zinc-500 leading-relaxed">
                              Need assistance drafting a therapeutic response? Enter a focus prompt and Claude will build a clinical plan.
                            </p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Draft advice for pelvic muscles..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="flex-1 bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                              />
                              <button
                                onClick={onGenerateAIDraft}
                                disabled={isGeneratingDraft || !aiPrompt.trim()}
                                className="px-3.5 py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all disabled:opacity-40"
                              >
                                {isGeneratingDraft ? "Drafting..." : "Draft"}
                              </button>
                            </div>

                            <p className="text-[9.5px] text-zinc-500 leading-relaxed italic border-t border-zinc-900 pt-2">
                              *AI drafts are clinical starting points. Your verified MDCN registration folio ({currentDoctor?.mdcn_folio || "MDCN Registered"}) is permanently stamped on this consultation cycle.*
                            </p>
                            
                            {aiDraft && (
                              <div className="space-y-3 pt-2 border-t border-zinc-900/60 animate-fade-in">
                                <div className="flex justify-between items-center">
                                  <label className="text-[9.5px] uppercase font-mono text-zinc-500 font-bold block">Proposed Claude Draft</label>
                                  <button
                                    onClick={() => {
                                      setDoctorMessage(aiDraft);
                                      setAiDraft("");
                                    }}
                                    className="px-2.5 py-1 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 border border-[#d4af37]/30 text-[#E5C158] text-[10px] font-extrabold rounded-lg transition-colors"
                                  >
                                    Use as Starting Draft
                                  </button>
                                </div>
                                <div 
                                  className="text-[11px] text-zinc-400 leading-relaxed bg-black p-3.5 rounded-xl border border-zinc-900 max-h-40 overflow-y-auto whitespace-pre-wrap select-all font-mono"
                                >
                                  {aiDraft}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Stage-driven Clinical Action Desks */}
                          {selectedDoctorCase.stage === "initial" || !selectedDoctorCase.stage ? (
                            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3.5">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                                <h5 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">Clinical Phase: Initial Assessment</h5>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                The case has been claimed. Please use the direct secure dialogue to send clinical guidance and therapy advice. 
                                Sending any message will automatically transition the case to the Day-2 follow-up stage.
                              </p>
                            </div>
                          ) : selectedDoctorCase.stage === "day2_pending" ? (
                            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3.5">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clinical Phase: Day-2 Check-in Trigger</h5>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                You are required to issue the Day-2 clinical check-in to evaluate early drug safety parameters and therapy compliance.
                              </p>
                              <button
                                onClick={handleLocalSendDay2Checkin}
                                className="w-full py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-colors"
                              >
                                Send Standard Day-2 Follow-up Check-in
                              </button>
                            </div>
                          ) : selectedDoctorCase.stage === "day2_sent" ? (
                            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3.5">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clinical Phase: Day-2 Sent</h5>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed">
                                Day-2 follow-up has been successfully sent. Wait for patient response, or progress directly to the Day-5 clinical evaluation desk when ready.
                              </p>
                              <button
                                onClick={handleLocalProgressToDay5}
                                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition-colors"
                              >
                                Progress Case to Day-5 Evaluation Desk
                              </button>
                            </div>
                          ) : selectedDoctorCase.stage === "day5_pending" ? (
                            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clinical Phase: Day-5 Complete Consultation & Rx Signoff</h5>
                              </div>
                              
                              <div className="space-y-4">
                                {/* Clinical Notes Editor */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Reviewer Clinical Notes</label>
                                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setNotesMode("edit")}
                                        className={`px-2 py-0.5 text-[9.5px] font-bold rounded-md transition-all ${
                                          notesMode === "edit" ? "bg-zinc-800 text-[#E5C158]" : "text-zinc-500 hover:text-zinc-400"
                                        }`}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setNotesMode("preview")}
                                        className={`px-2 py-0.5 text-[9.5px] font-bold rounded-md transition-all ${
                                          notesMode === "preview" ? "bg-zinc-800 text-[#E5C158]" : "text-zinc-500 hover:text-zinc-400"
                                        }`}
                                      >
                                        Preview
                                      </button>
                                    </div>
                                  </div>

                                  {notesMode === "edit" ? (
                                    <div className="bg-black border border-zinc-900 rounded-xl overflow-hidden focus-within:border-[#d4af37] transition-all">
                                      {/* Toolbar */}
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border-b border-zinc-900 overflow-x-auto scrollbar-none">
                                        <button
                                          type="button"
                                          onClick={() => handleFormat("notes", "bold")}
                                          className="p-1 text-zinc-400 hover:text-[#E5C158] hover:bg-zinc-900 rounded transition-colors"
                                          title="Bold"
                                        >
                                          <Bold className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFormat("notes", "italic")}
                                          className="p-1 text-zinc-400 hover:text-[#E5C158] hover:bg-zinc-900 rounded transition-colors"
                                          title="Italic"
                                        >
                                          <Italic className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFormat("notes", "bullet")}
                                          className="p-1 text-zinc-400 hover:text-[#E5C158] hover:bg-zinc-900 rounded transition-colors"
                                          title="Bullet List"
                                        >
                                          <List className="w-3.5 h-3.5" />
                                        </button>
                                        
                                        <div className="h-4 w-px bg-zinc-800 mx-1" />
                                        
                                        <span className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 font-bold mr-1 shrink-0">Quick Notes:</span>
                                        <div className="flex gap-1 overflow-x-auto scrollbar-none">
                                          {noteTemplates.map((tpl, i) => (
                                            <button
                                              key={i}
                                              type="button"
                                              onClick={() => setClosingNotes(tpl.text)}
                                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 text-[8.5px] rounded border border-zinc-800 transition-colors whitespace-nowrap"
                                            >
                                              {tpl.name}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <textarea
                                        id="closing-notes-textarea"
                                        placeholder="Type diagnosis notes... Use **bold**, *italics*, or bullet list points (lines starting with •)."
                                        rows={3}
                                        value={closingNotes}
                                        onChange={(e) => setClosingNotes(e.target.value)}
                                        className="w-full bg-transparent px-3 py-2 text-xs text-white focus:outline-none resize-none"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-300 min-h-[96px] leading-relaxed max-h-40 overflow-y-auto">
                                      {closingNotes.trim() ? renderRichText(closingNotes) : <span className="text-zinc-600 italic">No notes typed yet. Click Edit to begin writing.</span>}
                                    </div>
                                  )}
                                </div>

                                {/* Prescription (Rx) Editor */}
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Pharmaceutical Prescription (Rx details)</label>
                                    <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setPrescriptionMode("edit")}
                                        className={`px-2 py-0.5 text-[9.5px] font-bold rounded-md transition-all ${
                                          prescriptionMode === "edit" ? "bg-zinc-800 text-[#E5C158]" : "text-zinc-500 hover:text-zinc-400"
                                        }`}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPrescriptionMode("preview")}
                                        className={`px-2 py-0.5 text-[9.5px] font-bold rounded-md transition-all ${
                                          prescriptionMode === "preview" ? "bg-zinc-800 text-[#E5C158]" : "text-zinc-500 hover:text-zinc-400"
                                        }`}
                                      >
                                        Preview
                                      </button>
                                    </div>
                                  </div>

                                  {prescriptionMode === "edit" ? (
                                    <div className="bg-black border border-zinc-900 rounded-xl overflow-hidden focus-within:border-[#d4af37] transition-all">
                                      {/* Toolbar */}
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-950 border-b border-zinc-900 overflow-x-auto scrollbar-none">
                                        <button
                                          type="button"
                                          onClick={() => handleFormat("rx", "bold")}
                                          className="p-1 text-zinc-400 hover:text-[#E5C158] hover:bg-zinc-900 rounded transition-colors"
                                          title="Bold"
                                        >
                                          <Bold className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFormat("rx", "italic")}
                                          className="p-1 text-zinc-400 hover:text-[#E5C158] hover:bg-zinc-900 rounded transition-colors"
                                          title="Italic"
                                        >
                                          <Italic className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFormat("rx", "bullet")}
                                          className="p-1 text-zinc-400 hover:text-[#E5C158] hover:bg-zinc-900 rounded transition-colors"
                                          title="Bullet List"
                                        >
                                          <List className="w-3.5 h-3.5" />
                                        </button>
                                        
                                        <div className="h-4 w-px bg-zinc-800 mx-1" />
                                        
                                        <span className="text-[8.5px] uppercase font-mono tracking-wider text-zinc-500 font-bold mr-1 shrink-0">Rx Presets:</span>
                                        <div className="flex gap-1 overflow-x-auto scrollbar-none">
                                          {prescriptionTemplates.map((tpl, i) => (
                                            <button
                                              key={i}
                                              type="button"
                                              onClick={() => setClosingPrescription(tpl.text)}
                                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 text-[8.5px] rounded border border-zinc-800 transition-colors whitespace-nowrap"
                                            >
                                              {tpl.name}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      <textarea
                                        id="closing-rx-textarea"
                                        placeholder="e.g. Sildenafil 50mg, Tab 1 to be taken as directed... Format with bold and bullet lists."
                                        rows={3}
                                        value={closingPrescription}
                                        onChange={(e) => setClosingPrescription(e.target.value)}
                                        className="w-full bg-transparent px-3 py-2 text-xs text-white focus:outline-none resize-none font-mono"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-300 min-h-[96px] leading-relaxed max-h-40 overflow-y-auto font-mono">
                                      {closingPrescription.trim() ? renderRichText(closingPrescription) : <span className="text-zinc-600 italic">No prescription issued. Click Edit to prescribe.</span>}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={onCompleteConsultation}
                                  disabled={!closingNotes.trim()}
                                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs rounded-xl transition-colors disabled:opacity-40"
                                >
                                  Certify Consultation & Issue Signed Rx
                                </button>
                              </div>
                            </div>
                          ) : selectedDoctorCase.stage === "review_open" ? (
                            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                              <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                                <h5 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">Clinical Phase: Resolve Patient Review Loop</h5>
                              </div>
                              <p className="text-xs text-zinc-400 leading-relaxed italic border-l-2 border-rose-500 pl-2.5">
                                Patient Rating: <strong className="text-white">{selectedDoctorCase.patient_rating} Stars</strong> • 
                                Please review feedback, recheck drug suitability, adjust dosage, or explain therapy adaptation in clinical notes.
                              </p>
                              
                              <div className="space-y-4">
                                {/* Clinical Notes Editor */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Review & Adjustment Notes</label>
                                  <textarea
                                    placeholder="Type adjustments notes..."
                                    rows={3}
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                    className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] resize-none"
                                  />
                                </div>

                                {/* Prescription Editor */}
                                <div className="space-y-1.5">
                                  <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Updated Prescription (Rx details)</label>
                                  <textarea
                                    placeholder="Type updated Rx details..."
                                    rows={3}
                                    value={closingPrescription}
                                    onChange={(e) => setClosingPrescription(e.target.value)}
                                    className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] resize-none font-mono"
                                  />
                                </div>

                                <button
                                  onClick={handleLocalResolveReview}
                                  disabled={!closingNotes.trim()}
                                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-colors disabled:opacity-40"
                                >
                                  Certify & Archive Updated Directives
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {/* Clinical Response Templates Section */}
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#d4af37]" />
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Clinical Response Templates</h5>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowCustomTemplateForm(!showCustomTemplateForm)}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-[#E5C158] border border-zinc-800 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1"
                              >
                                {showCustomTemplateForm ? "Cancel" : <><Plus className="w-3 h-3" /> Create Custom</>}
                              </button>
                            </div>

                            {showCustomTemplateForm ? (
                              <form onSubmit={handleSaveCustomTemplate} className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-zinc-900 animate-fade-in">
                                <h6 className="text-[10px] font-bold text-[#E5C158] uppercase font-mono tracking-wider">New Custom Template</h6>
                                
                                <div className="space-y-1">
                                  <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Template Title</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. ED Sildenafil 50mg Dosing Plan"
                                    value={customTemplateTitle}
                                    onChange={(e) => setCustomTemplateTitle(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                                    required
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Medical Condition</label>
                                    <select
                                      value={customTemplateCondition}
                                      onChange={(e) => setCustomTemplateCondition(e.target.value)}
                                      className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                                    >
                                      <option value="Erectile Dysfunction">Erectile Dysfunction</option>
                                      <option value="Premature Ejaculation">Premature Ejaculation</option>
                                      <option value="STI & Genital Symptoms">STI & Genital Symptoms</option>
                                      <option value="Low Sex Drive">Low Sex Drive</option>
                                      <option value="General Health Check-Up">General Health Check-Up</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Consultation Stage</label>
                                    <select
                                      value={customTemplateStage}
                                      onChange={(e) => setCustomTemplateStage(e.target.value as any)}
                                      className="w-full bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                                    >
                                      <option value="initial">Initial Chat</option>
                                      <option value="day2">Day-2 Check-in</option>
                                      <option value="day5">Day-5 Care Closure</option>
                                      <option value="review">Clinical Review Loop</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] uppercase font-mono text-zinc-500 font-bold">Clinical Advice Text</label>
                                    <span className="text-[8px] text-zinc-600 font-mono">Supports uppercase bracket placeholders</span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    placeholder="Write your response content... (Use tokens like [PATIENT NAME] to represent fields)"
                                    value={customTemplateContent}
                                    onChange={(e) => setCustomTemplateContent(e.target.value)}
                                    className="w-full bg-black border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                                    required
                                  />
                                </div>

                                <button
                                  type="submit"
                                  className="w-full py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-lg transition-colors"
                                >
                                  Save to Practice Console
                                </button>
                              </form>
                            ) : (
                              <div className="space-y-3">
                                {/* Filters Bar */}
                                <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-xl border border-zinc-900">
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] uppercase font-mono font-bold text-zinc-600">Stage Filter</span>
                                    <select
                                      value={templateFilterStage}
                                      onChange={(e) => setTemplateFilterStage(e.target.value)}
                                      className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-[10.5px] text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                                    >
                                      <option value="all">Show All Stages</option>
                                      <option value="initial">Initial Assessment</option>
                                      <option value="day2">Day-2 Check-in</option>
                                      <option value="day5">Day-5 evaluation</option>
                                      <option value="review">Review loop</option>
                                    </select>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[8px] uppercase font-mono font-bold text-zinc-600">Condition Filter</span>
                                    <select
                                      value={templateFilterCondition}
                                      onChange={(e) => setTemplateFilterCondition(e.target.value)}
                                      className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-2 py-1 text-[10.5px] text-zinc-300 focus:outline-none focus:border-[#d4af37]"
                                    >
                                      <option value="all">Show All Conditions</option>
                                      <option value="Erectile Dysfunction">Erectile Dysfunction</option>
                                      <option value="Premature Ejaculation">Premature Ejaculation</option>
                                      <option value="STI & Genital Symptoms">STI & Genital Symptoms</option>
                                      <option value="Low Sex Drive">Low Sex Drive</option>
                                      <option value="General Health Check-Up">General Health Check-Up</option>
                                    </select>
                                  </div>
                                </div>

                                {/* List of templates */}
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {(() => {
                                    const stageParam = templateFilterStage === "all" ? undefined : (templateFilterStage as any);
                                    const conditionParam = templateFilterCondition === "all" ? undefined : templateFilterCondition;
                                    const stagesList: ("initial" | "day2" | "day5" | "review")[] = 
                                      stageParam ? [stageParam] : ["initial", "day2", "day5", "review"];
                                      
                                    const matchedList: ResponseTemplate[] = [];
                                    stagesList.forEach(st => {
                                      matchedList.push(...getTemplates(st, conditionParam || "All"));
                                    });

                                    if (matchedList.length === 0) {
                                      return (
                                        <p className="text-zinc-600 italic text-[10.5px] text-center py-4">No templates found for this selection.</p>
                                      );
                                    }

                                    return matchedList.map((tpl) => {
                                      const isCustom = !!tpl.is_custom;
                                      return (
                                        <div
                                          key={tpl.id}
                                          className="group bg-black/50 hover:bg-black border border-zinc-900 hover:border-zinc-800 rounded-xl p-3 space-y-1.5 transition-all text-[11px]"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0 pr-2">
                                              <span className="font-extrabold text-zinc-200 block truncate">{tpl.title}</span>
                                              <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[8px] uppercase font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-md">
                                                  {tpl.stage.toUpperCase()}
                                                </span>
                                                <span className="text-[8px] uppercase font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded-md">
                                                  {tpl.condition}
                                                </span>
                                                {isCustom && (
                                                  <span className="text-[7.5px] uppercase font-mono font-extrabold text-[#E5C158] bg-[#d4af37]/10 border border-[#d4af37]/30 px-1 rounded">
                                                    Custom
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const textToApply = tpl.content
                                                    .replace(/\[PATIENT NAME\]/g, selectedDoctorCase.patient_name || "[PATIENT NAME]")
                                                    .replace(/\[CONDITION\]/g, selectedDoctorCase.condition || "[CONDITION]");

                                                  const activeStage = selectedDoctorCase.stage || "initial";
                                                  if (activeStage === "initial" || activeStage === "day2_pending" || activeStage === "day2_sent") {
                                                    setDoctorMessage(textToApply);
                                                    alert(`Applied template to dialogue reply box! Please customize all placeholder tokens.`);
                                                  } else if (activeStage === "day5_pending" || activeStage === "review_open") {
                                                    setClosingNotes(textToApply);
                                                    if (tpl.content.toLowerCase().includes("prescription") || tpl.content.toLowerCase().includes("rx:")) {
                                                      setClosingPrescription("Sildenafil 50mg Tablets, Tab 1 on demand prior to sexual activity. Dosing max once per 24 hours.");
                                                    }
                                                    alert(`Applied template to notes field! Please customize prior to certification.`);
                                                  }
                                                }}
                                                className="px-2 py-1 bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 text-[9px] font-bold rounded-lg transition-all"
                                              >
                                                Apply
                                              </button>
                                              {isCustom && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteCustomTemplate(tpl.id)}
                                                  className="p-1 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 text-rose-500 rounded transition-colors"
                                                  title="Delete Custom Template"
                                                >
                                                  <Trash className="w-3.5 h-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-[10.5px] text-zinc-500 leading-relaxed italic line-clamp-2 select-all whitespace-pre-wrap font-mono">
                                            {tpl.content}
                                          </p>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Specialist Clinical Referrals Section */}
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-[#d4af37]" />
                                <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Specialist Clinical Referral</h5>
                              </div>
                              {selectedDoctorCase.referral_text && (
                                <span className="px-1.5 py-0.5 text-[8.5px] font-mono bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-lg">
                                  REFERRAL DISPATCHED
                                </span>
                              )}
                            </div>

                            {selectedDoctorCase.referral_text ? (
                              <div className="space-y-3 animate-fade-in">
                                <p className="text-[11px] text-zinc-400 leading-relaxed">
                                  An official clinical referral is saved. The patient can read or print their referral letter from the Patient Portal dashboard.
                                </p>

                                <div className="bg-black/60 p-3 rounded-xl border border-zinc-900 space-y-2 text-[10px]">
                                  <div className="flex justify-between items-center border-b border-zinc-800 pb-1 font-mono text-zinc-500">
                                    <span>REGISTRY RECORD</span>
                                    <span className="text-[#E5C158] font-bold">SECURE LOG</span>
                                  </div>
                                  <p className="text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                                    {selectedDoctorCase.referral_text}
                                  </p>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await generateConsultationPDF(selectedDoctorCase, "referral", {
                                        doctorMdcnFolio: currentDoctor?.mdcn_folio
                                      });
                                    }}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5"
                                  >
                                    <FileDown className="w-3.5 h-3.5" /> Download Referral Letter PDF
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReferralNotes(selectedDoctorCase.referral_text || "");
                                      setReferralModalOpen(true);
                                    }}
                                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-[11px] rounded-xl border border-zinc-800 transition-colors"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                  Issue an official clinical referral letter indicating specialist physical urological evaluation or andrological safety workups at secondary healthcare facilities.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setReferralModalOpen(true)}
                                  className="w-full py-2.5 bg-gradient-to-r from-purple-900/40 to-black hover:from-purple-900/60 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                                >
                                  <Building className="w-4 h-4 text-purple-400" /> Compile Specialist Referral Letter
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Referral Modal Form Dialog */}
                          {referralModalOpen && (
                            <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                              <div className="bg-zinc-950 border border-zinc-900 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl space-y-4">
                                
                                <div className="px-5 py-4 bg-zinc-900/10 border-b border-zinc-900 flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <Building className="w-5 h-5 text-purple-400" />
                                    <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Specialist Referral Compiler</h4>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setReferralModalOpen(false)}
                                    className="text-zinc-500 hover:text-white transition-colors font-mono text-sm font-bold p-1"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="p-5 space-y-4 max-h-[30rem] overflow-y-auto">
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    Review findings and choose medical specialties. An official 9jaClinic stamp containing your MDCN registered folio code will be cryptographic stamped on this letter.
                                  </p>

                                  <div className="bg-black border border-zinc-900 p-3 rounded-xl grid grid-cols-2 gap-2 text-[10px]">
                                    <p className="text-zinc-500 font-mono">PATIENT NAME: <strong className="text-white font-sans">{selectedDoctorCase.patient_name}</strong></p>
                                    <p className="text-zinc-500 font-mono">DOB REF: <strong className="text-white font-sans">{selectedDoctorCase.patient_age} Years</strong></p>
                                    <p className="text-zinc-500 font-mono">CONDITION: <strong className="text-white font-sans">{selectedDoctorCase.condition}</strong></p>
                                    <p className="text-zinc-500 font-mono">FOLIO STAMP: <strong className="text-[#E5C158]">{currentDoctor?.mdcn_folio || "MDCN REGISTERED"}</strong></p>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9.5px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Referral Specialty</label>
                                    <select
                                      value={referralSpecialty}
                                      onChange={(e) => setReferralSpecialty(e.target.value)}
                                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                                    >
                                      <option value="Urology / Consultant Andrologist">Urology / Consultant Andrologist</option>
                                      <option value="Cardiology & Vascular Medicine">Cardiology & Vascular Medicine</option>
                                      <option value="Endocrinology & Metabolism">Endocrinology & Metabolism</option>
                                      <option value="Dermatovenereology / Sexual Health">Dermatovenereology / Sexual Health</option>
                                      <option value="Psychiatry & Behavioral Medicine">Psychiatry & Behavioral Medicine</option>
                                      <option value="Internal Medicine / Sexual Health Liaison">Internal Medicine / Sexual Health Liaison</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9.5px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Clinical Priority / Urgency</label>
                                    <select
                                      value={referralUrgency}
                                      onChange={(e) => setReferralUrgency(e.target.value as any)}
                                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                                    >
                                      <option value="Low">Low / Preventive Checkup</option>
                                      <option value="Routine">Routine clinical evaluation</option>
                                      <option value="Urgent">Urgent evaluation (Refractory symptoms/Flags)</option>
                                      <option value="Emergency">Emergency physical response indicated</option>
                                    </select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[9.5px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Physician Findings & Specific Recommendations</label>
                                    <textarea
                                      rows={5}
                                      placeholder="Add clinical details..."
                                      value={referralNotes}
                                      onChange={(e) => setReferralNotes(e.target.value)}
                                      className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                                    />
                                  </div>
                                </div>

                                <div className="px-5 py-4 bg-zinc-900/10 border-t border-zinc-900 flex gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setReferralModalOpen(false)}
                                    className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 font-bold text-xs rounded-xl border border-zinc-800 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCreateReferral}
                                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition-all"
                                  >
                                    Save & Download PDF
                                  </button>
                                </div>

                              </div>
                            </div>
                          )}
                          {/* End of clinical referrals */}

                        </div>
                      )}

                    </div>

                  </div>
                ) : (
                  <div className="p-16 bg-zinc-950 border border-zinc-900 rounded-2xl text-center space-y-2">
                    <Activity className="w-10 h-10 text-zinc-800 mx-auto" />
                    <h5 className="font-bold text-zinc-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No Active Case Workspace Opened</h5>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                      Select any claimed case from your left caseloads panel, or accept an open patient questionnaire from the waiting queue.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW B: PAYOUT DESK WALLET */}
          {docView === "wallet" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-fade-in">
              
              {/* Wallet Payout Request Form (MD-Left/Center) */}
              <div className="md:col-span-5 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Request Verified Revenue Payout
                  </h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Withdraw cleared clinician earnings. Payout requests undergo standard administrative settlement validation within 12-24 hours.
                  </p>
                </div>

                {payoutMsg.text && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                    payoutMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}>
                    {payoutMsg.text}
                  </div>
                )}

                <form onSubmit={onPayoutRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Withdrawal Amount (₦)</label>
                    <input required type="number" placeholder="Enter amount..." value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Recipient Bank Name</label>
                    <input required type="text" placeholder="e.g. Access Bank" value={payoutBank} onChange={(e) => setPayoutBank(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Recipient Account Number (NUBAN)</label>
                    <input required type="text" placeholder="10-digit account number" value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow">
                    Initiate Clearance Settlement
                  </button>
                </form>
              </div>

              {/* Wallet Ledger and Balances details (MD-Right) */}
              <div className="md:col-span-7 space-y-6">
                
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Physician Wallet Ledger
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Available Balance</span>
                      <strong className="text-xl font-extrabold text-[#E5C158] block">{formatNaira(currentDoctor.payout_balance)}</strong>
                    </div>
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Clinician Split Fee</span>
                      <strong className="text-sm font-extrabold text-zinc-300 block">70% Commission</strong>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
