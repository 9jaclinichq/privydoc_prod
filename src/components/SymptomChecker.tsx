import React, { useState } from "react";
import { Sparkles, ArrowLeft, ChevronLeft, ChevronRight, HeartPulse, AlertTriangle, Loader2 } from "lucide-react";
import { INTAKE_QUESTIONS } from "../data";
import { toast } from "./ToastNotification";

interface QuickCheckInsight {
  headline: string;
  insights: string[];
  recommendation: string;
  urgency: "routine" | "soon" | "urgent";
}

interface SymptomCheckerProps {
  selectedCondition: any;
  symptomAnswers: Record<string, string>;
  setSymptomAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCancel: () => void;
  onStartIntake: (condition: any) => void;
}

const URGENCY_STYLES: Record<QuickCheckInsight["urgency"], { label: string; className: string }> = {
  routine: { label: "Routine", className: "text-[#E5C158] bg-[#d4af37]/10 border-[#d4af37]/25" },
  soon: { label: "See a Doctor Soon", className: "text-amber-300 bg-amber-500/10 border-amber-500/25" },
  urgent: { label: "Urgent", className: "text-red-400 bg-red-500/10 border-red-500/25" }
};

export default function SymptomChecker({
  selectedCondition,
  symptomAnswers,
  setSymptomAnswers,
  onCancel,
  onStartIntake
}: SymptomCheckerProps) {
  const track = selectedCondition.id;
  const categoryQuestions = INTAKE_QUESTIONS.filter(q => q.category === track);

  // Per-track state so progress/results from one condition never bleed into another
  const [trackIndex, setTrackIndex] = useState<Record<string, number>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completedTracks, setCompletedTracks] = useState<Record<string, boolean>>({});
  const [trackResults, setTrackResults] = useState<Record<string, QuickCheckInsight>>({});

  const currentIndex = trackIndex[track] || 0;
  const setCurrentIndex = (i: number) => setTrackIndex(prev => ({ ...prev, [track]: i }));
  const isComplete = completedTracks[track] || false;
  const aiResult = trackResults[track] || null;

  const currentQuestion = categoryQuestions[currentIndex];
  const progressPercent = categoryQuestions.length > 0
    ? Math.round(((currentIndex + 1) / categoryQuestions.length) * 100)
    : 0;

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const answers = categoryQuestions.map(q => ({ question: q.text, answer: symptomAnswers[q.id] || "Not specified" }));
      const res = await fetch("/api/gemini/quick-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, answers })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTrackResults(prev => ({
          ...prev,
          [track]: {
            headline: data.headline,
            insights: data.insights,
            recommendation: data.recommendation,
            urgency: data.urgency
          }
        }));
      } else {
        toast.error("Could not generate your insight. Please try the full doctor review.");
      }
    } catch (e) {
      console.error("Quick-check analysis failed:", e);
      toast.error("Could not generate your insight. Please try the full doctor review.");
    } finally {
      setIsAnalyzing(false);
      setCompletedTracks(prev => ({ ...prev, [track]: true }));
    }
  };

  const handleNext = () => {
    if (!currentQuestion) return;
    if (!symptomAnswers[currentQuestion.id]) {
      toast.warning("Please select a response to continue.");
      return;
    }
    if (currentIndex < categoryQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      runAnalysis();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // AI Analysis Result Screen
  if (isComplete) {
    const urgency = aiResult?.urgency || "routine";
    const urgencyStyle = URGENCY_STYLES[urgency];
    return (
      <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden animate-fade-in">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#d4af37]/5 rounded-full filter blur-xl pointer-events-none" />

        <div className="space-y-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-bold tracking-wider border ${urgencyStyle.className}`}>
            {urgency === "urgent" && <AlertTriangle className="w-3 h-3" />}
            {urgencyStyle.label}
          </span>
          <h3 className="text-xl font-bold text-white leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {aiResult?.headline || "Your quick check is complete."}
          </h3>
        </div>

        {aiResult && (
          <div className="p-6 bg-[#d4af37]/5 border border-[#d4af37]/15 rounded-2xl space-y-4">
            <h4 className="font-bold text-[#E5C158] flex items-center gap-2 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Sparkles className="w-4 h-4 text-[#d4af37]" /> Key Insights
            </h4>
            <div className="space-y-3 text-xs text-zinc-300">
              {aiResult.insights.map((insight, i) => (
                <div key={i} className="leading-relaxed flex gap-3 items-start">
                  <span className="text-[#d4af37] font-bold text-sm leading-none">•</span>
                  <p>{insight}</p>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#d4af37]/10">
              <p className="text-xs text-zinc-300 leading-relaxed">{aiResult.recommendation}</p>
            </div>
          </div>
        )}

        <div className="bg-black border border-zinc-900 rounded-2xl p-6 text-center space-y-4 shadow-inner">
          <h5 className="font-bold text-white text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Require formal diagnostic evaluation & secure therapy plan?
          </h5>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-lg mx-auto">
            This quick check offers general guidance only. For a formal evaluation by a licensed physician and access to official digital prescriptions, submit a confidential case file.
          </p>
          <button
            onClick={() => onStartIntake(selectedCondition)}
            className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all"
          >
            Get Full Doctor Review →
          </button>
        </div>

        <button
          onClick={() => {
            setCompletedTracks(prev => ({ ...prev, [track]: false }));
            setTrackResults(prev => {
              const next = { ...prev };
              delete next[track];
              return next;
            });
            setCurrentIndex(0);
            setSymptomAnswers(prev => {
              const next = { ...prev };
              categoryQuestions.forEach(q => delete next[q.id]);
              return next;
            });
          }}
          className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-400 py-2 block transition-colors"
        >
          Re-take assessment
        </button>
      </div>
    );
  }

  // Analyzing Screen
  if (isAnalyzing) {
    return (
      <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-12 space-y-4 shadow-2xl text-center animate-fade-in">
        <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin mx-auto" />
        <p className="text-sm text-zinc-400">Analyzing your responses...</p>
      </div>
    );
  }

  // No questions configured for this condition — skip straight to intake CTA
  if (categoryQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl text-center">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Wellness Programs
        </button>
        <p className="text-xs text-zinc-400 italic">No specific quick assessment required. Proceed directly to the clinic intake.</p>
        <button
          onClick={() => onStartIntake(selectedCondition)}
          className="px-5 py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl shadow-lg transition-all"
        >
          Get Full Doctor Review →
        </button>
      </div>
    );
  }

  // Slide Card Question Flow
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex justify-between items-center px-2 py-1">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-zinc-500 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Wellness Programs
        </button>
        <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest font-bold">
          {selectedCondition.title} — Quick Check
        </span>
      </div>

      <div className="px-2">
        <div className="flex justify-between items-center text-xs font-mono text-neutral-400 mb-2">
          <span className="font-semibold text-neutral-300">
            Question {currentIndex + 1} of {categoryQuestions.length}
          </span>
          <span className="font-semibold text-[#C9A84C]">{progressPercent}%</span>
        </div>
        <div className="w-full bg-neutral-800/80 h-2 rounded-full overflow-hidden shadow-inner">
          <div
            className="bg-[#C9A84C] h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(201,168,76,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#d4af37]/5 rounded-full filter blur-xl pointer-events-none" />
        <div className="flex items-center gap-2 text-[#d4af37] mb-4">
          <HeartPulse className="w-4 h-4" />
          <span className="text-[10px] uppercase font-mono tracking-wider">Anonymous Quick Check</span>
        </div>
        <h3 className="text-lg font-medium text-white mb-6 leading-relaxed">
          {currentQuestion?.text}
        </h3>

        {currentQuestion?.options && (
          <div className="grid grid-cols-1 gap-2.5">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                onClick={() => setSymptomAnswers(prev => ({ ...prev, [currentQuestion.id]: opt }))}
                className={`px-4 py-3 rounded-xl border text-left text-xs font-medium transition-all ${
                  symptomAnswers[currentQuestion.id] === opt
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

      <div className="flex justify-between items-center gap-4 px-2">
        <button
          onClick={handleBack}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2.5 rounded-lg transition-all ${
            currentIndex === 0
              ? "text-zinc-600 cursor-not-allowed"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-1.5 bg-[#d4af37] text-black hover:bg-[#b8860b] px-5 py-2.5 rounded-xl text-sm font-medium font-mono tracking-wide transition-all"
        >
          <span>{currentIndex === categoryQuestions.length - 1 ? "Get My Insight" : "Next"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
