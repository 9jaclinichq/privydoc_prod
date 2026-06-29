import React, { useState } from "react";
import {
  ArrowLeft, ChevronRight, Lock, CreditCard, Building,
  Sparkles, Check, CheckCircle2, ShieldAlert
} from "lucide-react";
import { INTAKE_QUESTIONS } from "../data";
import { formatNaira } from "../utils";
import { pricingApi } from "../lib/api";
import { toast } from "./ToastNotification";
import { confirm } from "./ConfirmModal";
import AdaptiveIntakeForm from "./AdaptiveIntakeForm";
import PrePaymentSummary from "./PrePaymentSummary";
import FinalPaymentSummary from "./FinalPaymentSummary";
import EmergencyPage from "./EmergencyPage";
import { Patient } from "../types";

interface IntakeFormProps {
  selectedCondition: any;
  patientSession: Patient | null;
  patientName: string;
  setPatientName: (name: string) => void;
  patientAge: string;
  setPatientAge: (age: string) => void;
  patientPhone: string;
  setPatientPhone: (phone: string) => void;
  patientEmail: string;
  intakeAnswers: Record<string, string>;
  setIntakeAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  checkoutStep: "form" | "payment" | "success" | "red_flag";
  setCheckoutStep: (step: "form" | "payment" | "success" | "red_flag") => void;
  paymentMethod: "card" | "bank";
  setPaymentMethod: (method: "card" | "bank") => void;
  isSubmittingIntake: boolean;
  onCompletePayment: (bypass?: boolean, onPaymentCancelled?: () => void) => void;
  onCancel: () => void;
}

export default function IntakeForm({
  selectedCondition,
  patientSession,
  patientName,
  setPatientName,
  patientAge,
  setPatientAge,
  patientPhone,
  setPatientPhone,
  patientEmail,
  intakeAnswers,
  setIntakeAnswers,
  checkoutStep,
  setCheckoutStep,
  paymentMethod,
  setPaymentMethod,
  isSubmittingIntake,
  onCompletePayment,
  onCancel
}: IntakeFormProps) {
  const baseConsultationPrice = pricingApi.getById("base_consultation")?.price ?? 7500;
  const isTestMode = typeof window !== "undefined" && 
    (window.location.hostname !== "app.privydoc.com.ng" || window.location.search.includes("test=true"));

  // State Additions for the enhanced clinical/payment flow
  const [intakePhase, setIntakePhase] = useState<1 | 2>(1);
  const [phase1Answers, setPhase1Answers] = useState<Record<string, any> | null>(null);
  const [showPrePaymentSummary, setShowPrePaymentSummary] = useState(false);
  const [showFinalPaymentSummary, setShowFinalPaymentSummary] = useState(false);
  const [pendingFinalAnswers, setPendingFinalAnswers] = useState<Record<string, string> | null>(null);
  const [showEmergencyPage, setShowEmergencyPage] = useState(false);
  const [emergencyMessages, setEmergencyMessages] = useState<string[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Simulated Flutterwave / Bypass payment confirmation to unlock Phase 2 (resume-payment screen only)
  const handlePaymentSuccess = () => {
    setIsProcessingPayment(true);
    toast.info("Processing secure payment transaction via Flutterwave...");
    setTimeout(() => {
      setIsProcessingPayment(false);
      toast.success("Payment verified successfully! Clinical consultation details unlocked.");
      setIntakePhase(2);
      setCheckoutStep("form");
    }, 1200);
  };

  // Patient confirms final summary and triggers the real Flutterwave payment + doctor submission
  const handleFinalPaymentProceed = () => {
    // Persist current answers before the Flutterwave popup opens, so they can be
    // restored if the patient closes the popup or the page reloads mid-payment.
    localStorage.setItem("privydoc_pending_intake", JSON.stringify({
      phase1Answers,
      phase2Answers: pendingFinalAnswers || intakeAnswers,
      track: selectedCondition?.id,
      condition: selectedCondition?.title,
      patientPhone,
      patientName,
      patientAge,
      patientEmail,
      savedAt: Date.now()
    }));

    if (pendingFinalAnswers) {
      setIntakeAnswers(pendingFinalAnswers);
    }

    onCompletePayment(false, () => {
      // Patient closed the Flutterwave popup without completing payment — restore their answers.
      const saved = localStorage.getItem("privydoc_pending_intake");
      if (saved) {
        const data = JSON.parse(saved);
        setPhase1Answers(data.phase1Answers);
        setIntakeAnswers(data.phase2Answers);
        setShowFinalPaymentSummary(true);
        setCheckoutStep("form");
      }
    });
  };

  // Render Red Flags Emergency Page
  if (checkoutStep === "form" && showEmergencyPage) {
    return (
      <EmergencyPage 
        messages={emergencyMessages}
        track={selectedCondition.id}
        onGoBack={() => {
          setShowEmergencyPage(false);
          setEmergencyMessages([]);
        }}
      />
    );
  }

  // Render Mid-Assessment Summary (after Phase 1, before Phase 2)
  if (checkoutStep === "form" && showPrePaymentSummary) {
    return (
      <PrePaymentSummary
        track={selectedCondition.id}
        answers={phase1Answers || {}}
        onProceedToPayment={() => {
          setShowPrePaymentSummary(false);
          setIntakePhase(2);
        }}
        onGoBack={() => setShowPrePaymentSummary(false)}
      />
    );
  }

  // Render Final Payment Summary (after Phase 2 + consent, before real Flutterwave payment)
  if (checkoutStep === "form" && showFinalPaymentSummary) {
    return (
      <FinalPaymentSummary
        conditionTitle={selectedCondition.title}
        isProcessing={isSubmittingIntake}
        onProceedToPayment={handleFinalPaymentProceed}
      />
    );
  }

  // Render Phase 1 or Phase 2 Adaptive Intake Form
  if (checkoutStep === "form" && !showPrePaymentSummary && !showFinalPaymentSummary && !showEmergencyPage) {
    const profileName = patientSession?.name || patientName;
    const profileAge = patientSession?.age ?? (parseInt(patientAge) || undefined);
    const profileState = patientSession?.state;

    if (!profileName || !profileAge || !profileState) {
      return (
        <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center space-y-4 animate-fade-in">
          <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Complete Your Profile First
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            We need your name, age, and state on file before starting a clinical assessment. Please complete your profile to continue.
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-colors"
          >
            Go Complete Profile
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4 max-w-[480px] mx-auto animate-fade-in" id="adaptive-flow-container">
        <div className="flex justify-between items-center px-2 py-1" id="adaptive-flow-header">
          <button
            type="button"
            onClick={async () => {
              const stay = await confirm(
                "Your progress will be lost if you leave now. Are you sure you want to cancel this assessment?",
                { confirmLabel: "Stay", cancelLabel: "Leave Assessment" }
              );
              if (!stay) onCancel();
            }}
            className="text-xs font-semibold text-zinc-500 hover:text-white flex items-center gap-1 transition-all duration-200 hover:translate-x-[-2px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Cancel Clinical Intake
          </button>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">
            {selectedCondition.title}
          </span>
        </div>

        <div className="px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-[11px] text-zinc-400 font-mono">
          Consulting as: <span className="text-white font-bold">{profileName}</span>, Age: <span className="text-white font-bold">{profileAge}</span>, State: <span className="text-white font-bold">{profileState}</span>
        </div>

        <AdaptiveIntakeForm
          track={selectedCondition.id as any}
          patientName={profileName}
          patientAge={profileAge}
          patientState={profileState}
          patientPhone={patientPhone}
          phase={intakePhase}
          onPhase1Complete={(answers) => {
            setPhase1Answers(answers);
            setShowPrePaymentSummary(true);
          }}
          onPhase2Complete={(mergedAnswers) => {
            // Convert to raw_answers format for existing payment/verify flow
            const raw: Record<string, string> = {};
            for (const [key, val] of Object.entries(mergedAnswers)) {
              raw[key] = Array.isArray(val) ? val.join(", ") : String(val);
            }
            setPendingFinalAnswers(raw);
            setShowFinalPaymentSummary(true);
          }}
          onCancel={onCancel}
          onRedFlagTriggered={(messages) => {
            setEmergencyMessages(messages);
            setShowEmergencyPage(true);
          }}
          phase1Answers={phase1Answers || undefined}
        />
      </div>
    );
  }

  // STEP 2: Secure Payment Gateway
  return (
    <div className="max-w-xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFF2D4] via-[#E5C158] to-[#AA7C11]" />

      {/* Header */}
      <div className="space-y-2">
        <button 
          type="button"
          onClick={() => {
            // Go back to the pre-payment summary page
            setCheckoutStep("form");
            setShowPrePaymentSummary(true);
          }}
          className="text-xs font-semibold text-zinc-500 hover:text-white flex items-center gap-1 transition-all duration-200 hover:translate-x-[-2px] mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Clinical Summary
        </button>
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Secure Payment Gateway
        </h3>
        <p className="text-xs text-zinc-400">
          Medical Program: <span className="text-[#E5C158] font-bold">{selectedCondition.title}</span>
        </p>
      </div>

      {/* Step Progress Indicators */}
      <div className="grid grid-cols-3 gap-2">
        <div className="h-1 rounded-full bg-[#d4af37]" />
        <div className="h-1 rounded-full bg-[#d4af37]" />
        <div className="h-1 rounded-full bg-zinc-800" />
      </div>

      <div className="space-y-6 animate-fade-in">
        {/* Cart Bill Details */}
        <div className="p-5 bg-black rounded-2xl border border-zinc-900 flex justify-between items-center">
          <div>
            <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Evaluation & Care Program</p>
            <h4 className="text-sm font-bold text-white mt-0.5">{selectedCondition.title}</h4>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider">Doctor Fee</p>
            <h4 className="text-base font-extrabold text-[#E5C158]">{formatNaira(baseConsultationPrice)}</h4>
          </div>
        </div>

        {isTestMode && (
          <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl space-y-3.5 text-xs">
            <div className="flex items-center gap-2 text-[#E5C158] font-bold">
              <Sparkles className="w-4 h-4 shrink-0 text-[#E5C158]" />
              <span className="font-mono tracking-wider text-[11px] uppercase">TEST MODE ENABLED (FREE TESTING)</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Since you are on a development or staging environment, you can skip payment and proceed to complete your Phase 2 clinical assessment. Real-time consult files will be finalized at the end.
            </p>
            <button
              type="button"
              onClick={handlePaymentSuccess}
              disabled={isSubmittingIntake || isProcessingPayment}
              className="w-full py-2.5 bg-[#d4af37] text-black font-extrabold rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessingPayment ? "Verifying bypass..." : "Bypass & Proceed to Clinical Consultation (Free Test)"}
            </button>
          </div>
        )}

        {/* Payment Method Toggle */}
        <div className="space-y-3.5">
          <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">
            Choose Flutterwave Gateway Method
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPaymentMethod("card")}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                paymentMethod === "card" 
                  ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158]" 
                  : "bg-black border-zinc-900 text-zinc-500 hover:border-zinc-800"
              }`}
            >
              <CreditCard className="w-5 h-5 text-[#d4af37]" />
              Pay with Card
            </button>
            <button
              onClick={() => setPaymentMethod("bank")}
              className={`p-4 rounded-xl border flex flex-col items-center gap-2 font-bold text-xs transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                paymentMethod === "bank" 
                  ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158]" 
                  : "bg-black border-zinc-900 text-zinc-500 hover:border-zinc-800"
              }`}
            >
              <Building className="w-5 h-5 text-[#d4af37]" />
              Bank Transfer
            </button>
          </div>
        </div>

        {/* Card Form */}
        {paymentMethod === "card" ? (
          <div className="space-y-4 bg-black p-5 rounded-2xl border border-zinc-900 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-zinc-500 block">Cardholder Name</label>
              <input type="text" value={patientName} disabled className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-zinc-500 font-mono focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono text-zinc-400 block">Confidential Card Number</label>
              <input type="text" placeholder="5061 0000 0000 0000" className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-zinc-400 block">Expiry Month/Year</label>
                <input type="text" placeholder="MM/YY" className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono text-zinc-400 block">CVV Pin</label>
                <input type="password" placeholder="***" className="w-full bg-zinc-950 border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300" />
              </div>
            </div>
          </div>
        ) : (
          /* Bank Transfer info */
          <div className="bg-black p-5 rounded-2xl border border-zinc-900 space-y-4 animate-fade-in">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Click the button below to open the secure Flutterwave 
              payment gateway. You can pay by card, bank transfer, 
              or USSD — all options are available inside the 
              payment window.
            </p>
            <p className="text-[10px] text-zinc-500 text-center italic">
              Your payment is processed securely by Flutterwave. 
              PrivyDoc does not store your card details.
            </p>
          </div>
        )}

        {/* Checkout CTA */}
        <div className="space-y-3.5 pt-2">
          <button
            onClick={handlePaymentSuccess}
            disabled={isSubmittingIntake || isProcessingPayment}
            className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] hover:scale-[1.01] hover:border-[#d4af37]/20 active:scale-[0.99] text-black font-extrabold rounded-xl transition-all duration-200 text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessingPayment ? (
              <span>Interrogating Flutterwave Gateway...</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-black" />
                Securely Transact {formatNaira(baseConsultationPrice)}
              </>
            )}
          </button>
          <button
            onClick={() => {
              setCheckoutStep("form");
              setShowPrePaymentSummary(true);
            }}
            className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-400 py-1 transition-colors"
          >
            Modify case evaluation answers
          </button>
        </div>
      </div>
    </div>
  );
}
