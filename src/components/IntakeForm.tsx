import React, { useState } from "react";
import {
  ArrowLeft, ChevronRight, Check, CheckCircle2, ShieldAlert
} from "lucide-react";
import { INTAKE_QUESTIONS } from "../data";
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
  // State Additions for the enhanced clinical/payment flow
  const [intakePhase, setIntakePhase] = useState<1 | 2>(1);
  const [phase1Answers, setPhase1Answers] = useState<Record<string, any> | null>(null);
  const [showPrePaymentSummary, setShowPrePaymentSummary] = useState(false);
  const [showFinalPaymentSummary, setShowFinalPaymentSummary] = useState(false);
  const [pendingFinalAnswers, setPendingFinalAnswers] = useState<Record<string, string> | null>(null);
  const [showEmergencyPage, setShowEmergencyPage] = useState(false);
  const [emergencyMessages, setEmergencyMessages] = useState<string[]>([]);

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

  // STEP 2: Resume real Flutterwave payment (e.g. app was reloaded mid-payment).
  // Reuses the same FinalPaymentSummary screen + handleFinalPaymentProceed that
  // trigger the real window.FlutterwaveCheckout modal in App.tsx - no separate
  // custom payment form. All payment goes through the real Flutterwave modal.
  return (
    <FinalPaymentSummary
      conditionTitle={selectedCondition.title}
      isProcessing={isSubmittingIntake}
      onProceedToPayment={handleFinalPaymentProceed}
    />
  );
}
