import React from "react";
import { 
  ArrowLeft, ChevronRight, Lock, CreditCard, Building, 
  Sparkles, Check, CheckCircle2, ShieldAlert 
} from "lucide-react";
import { INTAKE_QUESTIONS } from "../data";
import { formatNaira } from "../utils";
import { pricingApi } from "../lib/api";
import { toast } from "./ToastNotification";

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

  // Submit Intake answers to navigate to payments page
  const handleIntakeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName || !patientPhone || !patientAge) {
      toast.warning("Please fill in your confidential demographic information.");
      return;
    }
    const ageNum = parseInt(patientAge);
    if (isNaN(ageNum) || ageNum < 18) {
      toast.error("Under standard clinical guidelines, consultations are strictly restricted to individuals aged 18 and older.");
      return;
    }

    // Cardiovascular Safety Exception (Red Flag detection)
    const hasChestPain = intakeAnswers["chest_pain"] && intakeAnswers["chest_pain"].startsWith("Yes");
    const hasHeartDisease = intakeAnswers["comorbidities"] && intakeAnswers["comorbidities"].includes("Heart Disease / Angina");

    if (hasChestPain || hasHeartDisease) {
      setCheckoutStep("red_flag");
      return;
    }

    setCheckoutStep("payment");
  };

  // Filter questions matching clinical constraints (excluding age since it is custom handled)
  const relevantQuestions = INTAKE_QUESTIONS.filter(
    q => (q.category === "general" || q.category === "safety" || q.category === selectedCondition.id) && q.id !== "age"
  );

  // Dynamic progress percentage for Recommendation 3
  const demographicFilledCount = (patientName ? 1 : 0) + (patientAge ? 1 : 0) + (patientPhone ? 1 : 0);
  const questionsAnsweredCount = relevantQuestions.filter(q => !!intakeAnswers[q.id]).length;
  const totalQuestions = relevantQuestions.length + 3;
  const answeredTotal = demographicFilledCount + questionsAnsweredCount;
  const currentStepPercent = Math.min(100, Math.round((answeredTotal / totalQuestions) * 100));

  return (
    <div className="max-w-xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-8 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FFF2D4] via-[#E5C158] to-[#AA7C11]" />

      {/* Header */}
      <div className="space-y-2">
        <button 
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-500 hover:text-white flex items-center gap-1 transition-all duration-200 hover:translate-x-[-2px] mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Cancel Clinical Intake
        </button>
        <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Confidential Case Intake
        </h3>
        <p className="text-xs text-zinc-400">
          Medical Program: <span className="text-[#E5C158] font-bold">{selectedCondition.title}</span>
        </p>
      </div>

      {/* Step Progress Indicators */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`h-1 rounded-full transition-all duration-300 ${checkoutStep === "form" || checkoutStep === "payment" ? "bg-[#d4af37]" : "bg-zinc-800"}`} />
        <div className={`h-1 rounded-full transition-all duration-300 ${checkoutStep === "payment" ? "bg-[#d4af37]" : "bg-zinc-800"}`} />
        <div className="h-1 rounded-full bg-zinc-800" />
      </div>

      {/* Dynamic Survey Progress Bar (Recommendation 3) */}
      {checkoutStep === "form" && (
        <div className="space-y-2 pt-1">
          <div className="flex justify-between text-[10px] font-mono text-zinc-500">
            <span>SURVEY COMPLETION</span>
            <span className="text-[#E5C158] font-bold">{currentStepPercent}%</span>
          </div>
          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#E5C158] to-[#d4af37] h-full transition-all duration-300" 
              style={{ width: `${currentStepPercent}%` }} 
            />
          </div>
        </div>
      )}

      {/* STEP 1: Questionnaire Intake Form */}
      {checkoutStep === "form" && (
        <form onSubmit={handleIntakeFormSubmit} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-[#E5C158] uppercase tracking-widest font-mono border-b border-zinc-900 pb-2 flex items-center gap-1.5">
              <span>1. Demographics & Identification</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">Confidential Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. John Doe (or Alias)"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400">Patient Age (Years)</label>
                <input 
                  type="number" 
                  required
                  placeholder="Min age: 18"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400">WhatsApp Number</label>
              <input 
                type="tel" 
                required
                placeholder="e.g. +234 803 123 4567"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
              />
              <p className="text-[10px] text-zinc-500 font-mono">
                CRITICAL: Used to securely log back in, receive notifications, and retrieve prescription reports.
              </p>
            </div>
          </div>

          {/* Clinical Questions Block */}
          <div className="space-y-6 pt-2">
            <h4 className="text-xs font-bold text-[#E5C158] uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
              2. Clinical Diagnostic Questions
            </h4>

            {relevantQuestions.map((q) => (
              <div key={q.id} className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block leading-relaxed uppercase tracking-wider font-mono">
                  {q.text}
                </label>

                {q.type === "text" && (
                  <input 
                    type="text"
                    required
                    placeholder={q.placeholder || "Enter clinical details..."}
                    value={intakeAnswers[q.id] || ""}
                    onChange={(e) => setIntakeAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-zinc-200 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]/30 focus:outline-none transition-all duration-300"
                  />
                )}

                {q.type === "radio" && q.options && (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt) => (
                      <button
                        type="button"
                        key={opt}
                        onClick={() => setIntakeAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className={`px-4 py-3 rounded-xl border text-left text-xs font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                          intakeAnswers[q.id] === opt 
                            ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158]" 
                            : "bg-black border-zinc-900 hover:border-zinc-800 text-zinc-400"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "checkbox" && q.options && (
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt) => {
                      const isSelected = (intakeAnswers[q.id] || "").split(", ").includes(opt);
                      return (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => {
                            const current = (intakeAnswers[q.id] || "").split(", ").filter(Boolean);
                            let updated;
                            if (isSelected) {
                              updated = current.filter(x => x !== opt);
                            } else {
                              updated = [...current, opt];
                            }
                            setIntakeAnswers(prev => ({ ...prev, [q.id]: updated.join(", ") }));
                          }}
                          className={`px-4 py-3 rounded-xl border text-left text-xs font-medium transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] flex justify-between items-center ${
                            isSelected 
                              ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158]" 
                              : "bg-black border-zinc-900 hover:border-zinc-800 text-zinc-400"
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <Check className="w-4 h-4 text-[#d4af37]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Consent Banner */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 items-start text-[11px] text-zinc-400">
            <ShieldAlert className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              By submitting this file, you declare that all demographic and cardiovascular entries are truthful. Intentional misrepresentation of clinical details to bypass contraindications is dangerous.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] hover:scale-[1.01] hover:border-[#d4af37]/20 active:scale-[0.99] text-black font-extrabold rounded-xl transition-all duration-200 text-xs shadow-lg flex items-center justify-center gap-2"
          >
            Proceed to Secure Payment <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 2: Secure Payment Gateway */}
      {checkoutStep === "payment" && (
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
                Since you are on a development or staging environment, you can skip payment and submit your clinical dossier immediately. A real consultation record will be created in the database and show up in the doctor's panel.
              </p>
              <button
                type="button"
                onClick={() => onCompletePayment(true)}
                disabled={isSubmittingIntake}
                className="w-full py-2.5 bg-[#d4af37] text-black font-extrabold rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingIntake ? "Processing bypass..." : "Bypass & Create Consultation Row (Free Test)"}
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
                Send exactly <span className="font-bold text-white">{formatNaira(baseConsultationPrice)}</span> via mobile app to the virtual bypass gateway bank account:
              </p>
              <div className="p-4 bg-zinc-950 rounded-xl space-y-2.5 text-xs font-mono border border-zinc-900">
                <p className="text-zinc-500 flex justify-between"><span>Gateway Bank:</span> <strong className="text-white">Wema Bank</strong></p>
                <p className="text-zinc-500 flex justify-between"><span>Account Title:</span> <strong className="text-white">PrivyDoc Care LTD</strong></p>
                <p className="text-zinc-500 flex justify-between"><span>Account NUBAN:</span> <strong className="text-[#E5C158] text-sm select-all">9901452140</strong></p>
              </div>
              <p className="text-[10px] text-zinc-500 text-center italic">
                Our Flutterwave system monitors incoming credits and auto-resolves in 10s.
              </p>
            </div>
          )}

          {/* Checkout CTA */}
          <div className="space-y-3.5 pt-2">
            <button
              onClick={() => onCompletePayment()}
              disabled={isSubmittingIntake}
              className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] hover:scale-[1.01] hover:border-[#d4af37]/20 active:scale-[0.99] text-black font-extrabold rounded-xl transition-all duration-200 text-xs shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingIntake ? (
                <span>Interrogating Gateway...</span>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-black" />
                  Securely Transact {formatNaira(baseConsultationPrice)}
                </>
              )}
            </button>
            <button
              onClick={() => setCheckoutStep("form")}
              className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-zinc-400 py-1 transition-colors"
            >
              Modify case evaluation answers
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Red Flag Exclusion Screen */}
      {checkoutStep === "red_flag" && (
        <div className="space-y-6 text-center animate-fade-in py-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 border border-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-2.5">
            <h4 className="text-xl font-bold text-red-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Cardiovascular Safety Exception
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              Based on your clinical intake responses, you have indicated cardiovascular symptoms or conditions (such as active chest pain or heart disease) that present strict contraindications for standard telemedicine ED/PE therapies.
            </p>
            <p className="text-xs text-red-400/80 leading-relaxed font-semibold max-w-md mx-auto">
              Online remote prescription under these conditions is highly unsafe and poses severe health risks.
            </p>
          </div>

          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-left space-y-2 max-w-md mx-auto">
            <span className="text-[10px] font-mono uppercase text-red-500 font-bold block">🚨 ACTION REQUIRED</span>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Please seek immediate, in-person medical evaluation at an emergency clinic or hospital, or consult a licensed cardiologist. This medical intake program has been securely blocked for your safety.
            </p>
          </div>

          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition-all duration-200"
          >
            Return to Wellness Programs
          </button>
        </div>
      )}
    </div>
  );
}
