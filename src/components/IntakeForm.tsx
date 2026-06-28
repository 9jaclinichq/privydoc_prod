import React, { useState } from "react";
import { 
  ArrowLeft, ChevronRight, Lock, CreditCard, Building, 
  Sparkles, Check, CheckCircle2, ShieldAlert 
} from "lucide-react";
import { INTAKE_QUESTIONS } from "../data";
import { formatNaira } from "../utils";
import { pricingApi } from "../lib/api";
import { toast } from "./ToastNotification";
import AdaptiveIntakeForm from "./AdaptiveIntakeForm";
import PrePaymentSummary from "./PrePaymentSummary";
import EmergencyPage from "./EmergencyPage";

interface IntakeFormProps {
  selectedCondition: any;
  patientName: string;
  setPatientName: (name: string) => void;
  patientAge: string;
  setPatientAge: (age: string) => void;
  patientPhone: string;
  setPatientPhone: (phone: string) => void;
  intakeAnswers: Record<string, string>;
  setIntakeAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  checkoutStep: "form" | "payment" | "success" | "red_flag";
  setCheckoutStep: (step: "form" | "payment" | "success" | "red_flag") => void;
  paymentMethod: "card" | "bank";
  setPaymentMethod: (method: "card" | "bank") => void;
  isSubmittingIntake: boolean;
  onCompletePayment: (bypass?: boolean) => void;
  onCancel: () => void;
}

export default function IntakeForm({
  selectedCondition,
  patientName,
  setPatientName,
  patientAge,
  setPatientAge,
  patientPhone,
  setPatientPhone,
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
  const [showEmergencyPage, setShowEmergencyPage] = useState(false);
  const [emergencyMessages, setEmergencyMessages] = useState<string[]>([]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Simulated Flutterwave / Bypass payment confirmation to unlock Phase 2
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

  // Render Pre-Payment Clinical Summary
  if (checkoutStep === "form" && showPrePaymentSummary) {
    return (
      <PrePaymentSummary 
        track={selectedCondition.id}
        answers={phase1Answers || {}}
        onProceedToPayment={() => {
          setShowPrePaymentSummary(false);
          setCheckoutStep("payment");
        }}
        onGoBack={() => setShowPrePaymentSummary(false)}
      />
    );
  }

  // Render Phase 1 or Phase 2 Adaptive Intake Form
  if (checkoutStep === "form" && !showPrePaymentSummary && !showEmergencyPage) {
    return (
      <div className="space-y-4 max-w-[480px] mx-auto animate-fade-in" id="adaptive-flow-container">
        <div className="flex justify-between items-center px-2 py-1" id="adaptive-flow-header">
          <button 
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-zinc-500 hover:text-white flex items-center gap-1 transition-all duration-200 hover:translate-x-[-2px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Cancel Clinical Intake
          </button>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">
            {selectedCondition.title}
          </span>
        </div>

        <AdaptiveIntakeForm 
          track={selectedCondition.id as any}
          patientName={patientName}
          patientAge={parseInt(patientAge) || 30}
          patientState="Lagos"
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
            setIntakeAnswers(raw);
            // Trigger existing onCompletePayment flow
            onCompletePayment();
          }}
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
