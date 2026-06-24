import React from "react";
import { Activity, Sparkles, HelpCircle, ArrowLeft, HeartPulse } from "lucide-react";
import { INTAKE_QUESTIONS, SYMPTOM_ADVICE } from "../data";
import { formatNaira } from "../utils";

interface SymptomCheckerProps {
  selectedCondition: any;
  symptomAnswers: Record<string, string>;
  setSymptomAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCancel: () => void;
  onStartIntake: (condition: any) => void;
  showAdvice: boolean;
  setShowAdvice: (v: boolean) => void;
}

export default function SymptomChecker({
  selectedCondition,
  symptomAnswers,
  setSymptomAnswers,
  onCancel,
  onStartIntake,
  showAdvice,
  setShowAdvice
}: SymptomCheckerProps) {
  // Filter questions for the active condition category (excluding safety/general demographic questions)
  const categoryQuestions = INTAKE_QUESTIONS.filter(q => q.category === selectedCondition.id);

  const isAllAnswered = categoryQuestions.every(q => symptomAnswers[q.id]);

  return (
    <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
      {/* Glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#d4af37]/5 rounded-full filter blur-xl pointer-events-none" />

      <div className="space-y-2">
        <button 
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Wellness Programs
        </button>
        <h3 className="text-2xl font-bold text-white flex items-center gap-2.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <HeartPulse className="w-6 h-6 text-[#d4af37]" /> E-Checkup: {selectedCondition.title}
        </h3>
        <p className="text-xs text-zinc-400">
          Anonymous symptom-logic screen. Complete the quick assessment below for real-time lifestyle guidance.
        </p>
      </div>

      {!showAdvice ? (
        <div className="space-y-6 pt-4 animate-fade-in">
          {categoryQuestions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-zinc-400 italic">No specific quick assessment required. Proceed directly to the clinic intake.</p>
            </div>
          ) : (
            categoryQuestions.map((q) => (
              <div key={q.id} className="space-y-3">
                <label className="text-xs font-bold text-zinc-300 block uppercase tracking-wider font-mono">
                  {q.text}
                </label>
                {q.type === "radio" && q.options && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {q.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSymptomAnswers(prev => ({ ...prev, [q.id]: opt }))}
                        className={`px-4 py-3 rounded-xl border text-left text-xs font-medium transition-all ${
                          symptomAnswers[q.id] === opt 
                            ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158] shadow-lg shadow-amber-500/5" 
                            : "bg-black border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => {
                if (!isAllAnswered && categoryQuestions.length > 0) {
                  alert("Please provide responses for all quick evaluation statements.");
                  return;
                }
                setShowAdvice(true);
              }}
              className="flex-1 py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl transition-all text-xs shadow-lg flex items-center justify-center gap-2"
            >
              <Activity className="w-4 h-4" /> Analyze Evaluation Answers
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pt-4 animate-fade-in">
          {/* Personalized Guidelines Box */}
          <div className="p-6 bg-[#d4af37]/5 border border-[#d4af37]/15 rounded-2xl space-y-4">
            <h4 className="font-bold text-[#E5C158] flex items-center gap-2 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Sparkles className="w-4 h-4 text-[#d4af37]" /> Self-Assessment & Preventive Guidelines
            </h4>
            
            <div className="space-y-3.5 text-xs text-zinc-300">
              {SYMPTOM_ADVICE[selectedCondition.id as keyof typeof SYMPTOM_ADVICE]?.map((advice, i) => (
                <div key={i} className="leading-relaxed flex gap-3 items-start">
                  <span className="text-[#d4af37] font-bold text-sm leading-none">•</span>
                  <p>{advice}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secure Doctor Promotion Box */}
          <div className="bg-black border border-zinc-900 rounded-2xl p-6 text-center space-y-4 shadow-inner">
            <h5 className="font-bold text-white text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Require formal diagnostic evaluation & secure therapy plan?</h5>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg mx-auto">
              Our e-checkup outlines basic preventive guidelines and lifestyle modifications. For a formal evaluation by a licensed physician and access to official digital prescriptions, submit a confidential case file.
            </p>
            <button
              onClick={() => onStartIntake(selectedCondition)}
              className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all space-y-0.5"
            >
              <span className="block">Initiate Medical Intake</span>
              <span className="block text-[9.5px] opacity-75 font-mono font-medium">Clinic Fee: {formatNaira(selectedCondition.basePrice)}</span>
            </button>
          </div>

          <button 
            onClick={() => setShowAdvice(false)}
            className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-400 py-2 block transition-colors"
          >
            Re-take assessment
          </button>
        </div>
      )}
    </div>
  );
}
