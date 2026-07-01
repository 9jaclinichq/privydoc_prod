import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { IntakeQuestion } from "../data/intakeQuestions";
import {
  getPhase1Questions,
  getPhase2Questions,
  getBranchedQuestions,
  detectRedFlags
} from "../utils/intakeEngine";

interface AdaptiveIntakeFormProps {
  track: "ED" | "PE" | "STI" | "LSD" | "GHC";
  patientName: string;
  patientAge: number;
  patientState: string;
  patientPhone: string;
  phase: 1 | 2;
  onPhase1Complete: (answers: Record<string, any>) => void;
  onPhase2Complete: (answers: Record<string, any>) => void;
  onRedFlagTriggered: (messages: string[]) => void;
  onCancel?: () => void;
  phase1Answers?: Record<string, any>; // pre-loaded when resuming Phase 2
}

export default function AdaptiveIntakeForm({
  track,
  patientName,
  patientAge,
  patientState,
  patientPhone,
  phase,
  onPhase1Complete,
  onPhase2Complete,
  onRedFlagTriggered,
  onCancel,
  phase1Answers = {}
}: AdaptiveIntakeFormProps) {
  // Initialize answers with pre-loaded phase 1 answers if available.
  // AutoLoad questions (name/age/state/phone) are never shown as cards, so their
  // values must be seeded here so branching logic and final submissions still work.
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const base = phase === 1 ? getPhase1Questions(track) : getPhase2Questions(track);
    const autoLoaded: Record<string, any> = {};
    for (const q of base) {
      if (!q.autoLoad) continue;
      if (q.autoLoad === "name") autoLoaded[q.id] = patientName;
      else if (q.autoLoad === "age") autoLoaded[q.id] = patientAge;
      else if (q.autoLoad === "state") autoLoaded[q.id] = patientState;
      else if (q.autoLoad === "phone") autoLoaded[q.id] = patientPhone;
    }
    // phase1Answers takes precedence; autoLoaded fills gaps for autoLoad fields
    return { ...autoLoaded, ...phase1Answers };
  });

  // Track the index of the current active question
  const [currentIndex, setCurrentIndex] = useState(0);

  // Red Flag Confirmation state
  const [redFlagModal, setRedFlagModal] = useState<{
    isOpen: boolean;
    message: string;
    pendingAnswerKey: string;
    pendingAnswerValue: any;
  } | null>(null);

  // Consent Decline Explanation state
  const [consentDeclineModal, setConsentDeclineModal] = useState<{
    isOpen: boolean;
    questionId: string;
  } | null>(null);

  // Base list of questions based on current phase and track
  const baseQuestions = useMemo(() => {
    if (phase === 1) {
      return getPhase1Questions(track);
    } else {
      return getPhase2Questions(track);
    }
  }, [track, phase]);

  // Full branched question list — used for red flag checks and consent validation
  const activeQuestions = useMemo(() => {
    return getBranchedQuestions(baseQuestions, answers);
  }, [baseQuestions, answers]);

  // Questions actually shown as cards — autoLoad fields (name/age/state/phone) are
  // excluded because their values already appear persistently in the header above.
  const displayQuestions = useMemo(() => {
    return activeQuestions.filter((q) => !q.autoLoad);
  }, [activeQuestions]);

  // Ensure index stays in valid bounds if questions are added/removed dynamically
  useEffect(() => {
    if (currentIndex >= displayQuestions.length) {
      setCurrentIndex(Math.max(0, displayQuestions.length - 1));
    }
  }, [displayQuestions, currentIndex]);

  const currentQuestion: IntakeQuestion | undefined = displayQuestions[currentIndex];

  // Navigate back
  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Set an answer and perform red flag checks if in safety/cardiovascular categories
  const handleAnswerChange = (qId: string, value: any, category: string) => {
    // If it's a safety/cardiovascular category, perform early red flag check
    if (category === "safety" || category === "cardiovascular") {
      const question = activeQuestions.find((q) => q.id === qId);
      if (question && question.redFlag) {
        const valStr = String(value).toLowerCase();
        const triggerMatches = question.redFlag.triggerValues.some((tv) => {
          const tvStr = String(tv).toLowerCase();
          if (tvStr === "true" && (valStr === "yes" || valStr === "true")) return true;
          if (tvStr === "false" && (valStr === "no" || valStr === "false")) return true;
          return valStr === tvStr;
        });

        if (triggerMatches) {
          // Open Red Flag Confirmation Modal
          setRedFlagModal({
            isOpen: true,
            message: question.redFlag.message,
            pendingAnswerKey: qId,
            pendingAnswerValue: value
          });
          return;
        }
      }
    }

    setAnswers((prev) => ({
      ...prev,
      [qId]: value
    }));
  };

  // Confirm red flag and trigger emergency page/handler
  const confirmRedFlag = () => {
    if (!redFlagModal) return;
    const updatedAnswers = {
      ...answers,
      [redFlagModal.pendingAnswerKey]: redFlagModal.pendingAnswerValue
    };
    setAnswers(updatedAnswers);
    setRedFlagModal(null);
    onRedFlagTriggered([redFlagModal.message]);
  };

  // Deny red flag, clear answer, and close modal
  const declineRedFlag = () => {
    if (!redFlagModal) return;
    setAnswers((prev) => {
      const updated = { ...prev };
      delete updated[redFlagModal.pendingAnswerKey];
      return updated;
    });
    setRedFlagModal(null);
  };

  // Validate answer is present for the current question
  const isCurrentAnswerValid = (): boolean => {
    if (!currentQuestion) return false;
    if (!currentQuestion.required) return true;

    const ans = answers[currentQuestion.id];
    if (ans === undefined || ans === null) return false;

    if (currentQuestion.category === "consent") {
      return ans === true;
    }

    if (currentQuestion.type === "multi") {
      return Array.isArray(ans) && ans.length > 0;
    }

    if (currentQuestion.type === "text") {
      return typeof ans === "string" && ans.trim().length > 0;
    }

    if (currentQuestion.type === "boolean") {
      return ans === true || ans === false || ans === "Yes" || ans === "No";
    }

    return true;
  };

  // Advance to next slide or trigger completion
  const handleNext = () => {
    if (!isCurrentAnswerValid()) return;

    if (currentIndex < displayQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Last question reached
      if (phase === 1) {
        // Run final red flag check across all questions (including autoLoad)
        const flags = detectRedFlags(answers, activeQuestions);
        if (flags.triggered) {
          onRedFlagTriggered(flags.messages);
        } else {
          onPhase1Complete(answers);
        }
      } else {
        // Phase 2 completion
        // Validate consent block questions are all checked (true)
        const consentQuestions = activeQuestions.filter((q) => q.category === "consent");
        const allConsented = consentQuestions.every((q) => {
          const val = answers[q.id];
          return val === true || String(val).toLowerCase() === "yes" || String(val).toLowerCase() === "true";
        });

        if (!allConsented) {
          alert("Please review and accept all consent options to proceed.");
          return;
        }

        // Merge Phase 1 and Phase 2 answers
        const finalMerged = {
          ...phase1Answers,
          ...answers
        };
        onPhase2Complete(finalMerged);
      }
    }
  };

  // Compute overall percentage for the progress bar (based on displayed questions only)
  const progressPercent = displayQuestions.length > 0
    ? Math.round(((currentIndex + 1) / displayQuestions.length) * 100)
    : 0;

  // Helper to render controls for a single active question
  const renderQuestion = (q: IntakeQuestion) => {
    return (
      <div key={q.id} className="w-full flex flex-col justify-start">
        {/* Category label */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] uppercase font-mono tracking-wider bg-neutral-900 text-[#C9A84C] px-2 py-1 rounded">
            {q.category}
          </span>
        </div>

        {/* CONSENT QUESTION CARD */}
        {q.category === "consent" ? (
          <div className="bg-neutral-900/60 border border-[#C9A84C]/30 rounded-2xl p-5 space-y-5" id={`consent-card-${q.id}`}>
            <p className="text-sm text-neutral-200 leading-relaxed">
              {q.text}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleAnswerChange(q.id, true, q.category)}
                className={`py-3 rounded-xl border text-sm font-semibold transition-all ${
                  answers[q.id] === true
                    ? "border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]"
                    : "border-[#C9A84C]/60 bg-[#C9A84C] text-black hover:bg-[#b0913e]"
                }`}
              >
                I Agree
              </button>
              <button
                type="button"
                onClick={() => setConsentDeclineModal({ isOpen: true, questionId: q.id })}
                className="py-3 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-300 text-sm font-semibold hover:bg-neutral-700 transition-all"
              >
                I Do Not Agree
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Question Text */}
            <h2 className="text-lg font-medium text-white mb-6 leading-relaxed" id={`q-text-${q.id}`}>
              {q.text}
            </h2>

            {/* Answer Controls */}
            <div className="space-y-3" id={`q-controls-${q.id}`}>

          {/* SINGLE SELECT */}
          {q.type === "single" && q.options && (
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswerChange(q.id, opt, q.category)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex justify-between items-center ${
                      isSelected
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white font-medium"
                        : "border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#C9A84C]" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* MULTI SELECT */}
          {q.type === "multi" && q.options && (
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt) => {
                const currentSel = (answers[q.id] as string[]) || [];
                const isSelected = currentSel.includes(opt);

                const handleMultiToggle = () => {
                  let updated: string[];
                  if (opt === "None of the above" || opt === "None known") {
                    updated = isSelected ? [] : [opt];
                  } else {
                    // Deselect none options
                    const filtered = currentSel.filter(
                      (item) => item !== "None of the above" && item !== "None known"
                    );
                    if (isSelected) {
                      updated = filtered.filter((item) => item !== opt);
                    } else {
                      updated = [...filtered, opt];
                    }
                  }
                  handleAnswerChange(q.id, updated, q.category);
                };

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={handleMultiToggle}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex justify-between items-center ${
                      isSelected
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white font-medium"
                        : "border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    <span>{opt}</span>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      isSelected ? "border-[#C9A84C] bg-[#C9A84C]" : "border-neutral-600"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-black font-extrabold" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* BOOLEAN */}
          {q.type === "boolean" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Yes", val: true },
                { label: "No", val: false }
              ].map((btn) => {
                const currentVal = answers[q.id];
                const isSelected = currentVal === btn.val || String(currentVal).toLowerCase() === btn.label.toLowerCase();

                return (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => handleAnswerChange(q.id, btn.val, q.category)}
                    className={`py-3 rounded-xl border text-sm transition-all font-medium text-center ${
                      isSelected
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 text-white"
                        : "border-neutral-800 bg-neutral-900/50 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* SCALE SELECTOR */}
          {q.type === "scale" && (
            <div className="space-y-4 px-2 py-3 bg-neutral-900/30 rounded-xl border border-neutral-800/45">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-neutral-400">
                  {q.scaleLabels?.min || "Low"}
                </span>
                <span className="text-2xl font-semibold text-white font-mono bg-[#C9A84C]/10 border border-[#C9A84C]/25 px-3 py-1 rounded-lg">
                  {answers[q.id] !== undefined ? answers[q.id] : "-"}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {q.scaleLabels?.max || "High"}
                </span>
              </div>
              <input
                type="range"
                min={q.scaleMin || 1}
                max={q.scaleMax || 10}
                value={answers[q.id] || q.scaleMin || 1}
                onChange={(e) =>
                  handleAnswerChange(
                    q.id,
                    parseInt(e.target.value),
                    q.category
                  )
                }
                className="w-full accent-[#C9A84C] h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* TEXT INPUT */}
          {q.type === "text" && (
            q.category === "demographics" ? (
              <input
                type="text"
                value={answers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value, q.category)}
                placeholder="Please type your response here..."
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all touch-manipulation"
              />
            ) : (
              <textarea
                value={answers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, e.target.value, q.category)}
                placeholder="Please type your response here..."
                rows={4}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all touch-manipulation"
              />
            )
          )}

          {/* NUMBER INPUT */}
          {q.type === "number" && (
            <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-2 w-full max-w-[200px] mx-auto">
              <button
                type="button"
                onClick={() => {
                  const curr = parseInt(answers[q.id]) || 0;
                  handleAnswerChange(q.id, Math.max(0, curr - 1), q.category);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800 text-white font-semibold hover:bg-neutral-700 disabled:opacity-50"
              >
                -
              </button>
              <input
                type="number"
                value={answers[q.id] || ""}
                onChange={(e) => handleAnswerChange(q.id, parseInt(e.target.value) || 0, q.category)}
                className="flex-1 bg-transparent text-center text-white text-lg font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => {
                  const curr = parseInt(answers[q.id]) || 0;
                  handleAnswerChange(q.id, curr + 1, q.category);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800 text-white font-semibold hover:bg-neutral-700 disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}

            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-24 md:pb-0" id="adaptive-intake-form-outer">

      {/* Progress & Header (sticky/above the card) */}
      <div className="mb-2 animate-fade-in relative z-10 px-4 md:px-0" id="intake-header-progress">
        <div className="flex justify-between items-center text-xs font-mono text-neutral-400 mb-2">
          <span className="font-semibold text-neutral-300">
            {phase === 2 ? "Phase 2 — " : ""}Question {currentIndex + 1} of {displayQuestions.length}
          </span>
          <span className="font-semibold text-[#C9A84C]">{progressPercent}%</span>
        </div>
        <div className="w-full bg-neutral-800/80 h-2 rounded-full overflow-hidden relative z-10 shadow-inner">
          <div
            className="bg-[#C9A84C] h-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(201,168,76,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Card (hugs content, flexible height, padded) */}
      <div className="w-full md:max-w-[480px] mx-auto bg-black md:bg-neutral-950/40 md:backdrop-blur-md rounded-none md:rounded-2xl border-0 md:border md:border-neutral-800/60 p-4 md:p-6 flex flex-col gap-6 h-auto min-h-0 pb-6" id="adaptive-intake-form-wrapper">

        {/* Main Active Question Card Area */}
        <div className="relative h-auto min-h-0" id="intake-card-viewport">
          <div className="w-full animate-fade-in" key={currentQuestion?.id}>
            {currentQuestion && renderQuestion(currentQuestion)}
          </div>
        </div>

      {/* Navigation Buttons */}
      <div
        className="flex justify-between items-center gap-4 border-t border-neutral-800/40 pt-4 bg-neutral-950/95 backdrop-blur-md px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] fixed bottom-0 left-0 right-0 z-30 md:static md:p-0 md:bg-transparent md:border-none md:pt-0 md:z-auto"
        id="intake-navigation-controls"
      >
        <button
          type="button"
          onClick={handleBack}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1.5 text-xs font-mono px-3 py-2.5 md:py-2 rounded-lg transition-all ${
            currentIndex === 0
              ? "text-neutral-600 cursor-not-allowed"
              : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={!isCurrentAnswerValid()}
          className="flex items-center gap-1.5 bg-[#C9A84C] text-black hover:bg-[#b0913e] px-5 py-2.5 md:py-2.5 rounded-xl text-sm font-medium font-mono tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{currentIndex === displayQuestions.length - 1 ? "Submit" : "Next"}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Red Flag Confirmation Modal */}
      {redFlagModal && redFlagModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-red-950/50 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">Safety Warning</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {redFlagModal.message}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={confirmRedFlag}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                I confirm this is correct
              </button>
              <button
                type="button"
                onClick={declineRedFlag}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                Let me correct my answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent Decline Explanation Modal */}
      {consentDeclineModal && consentDeclineModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-white font-semibold text-lg">This Consent Is Required</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              PrivyDoc can only operate safely as a telemedicine service if every patient understands and accepts how the platform works, how their health information is handled, and what to do in an emergency. Without this consent, a doctor cannot safely review your case, so we're unable to continue your assessment.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleAnswerChange(consentDeclineModal.questionId, true, "consent");
                  setConsentDeclineModal(null);
                }}
                className="w-full bg-[#C9A84C] hover:bg-[#b0913e] text-black py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                I Understand and Agree
              </button>
              <button
                type="button"
                onClick={() => {
                  setConsentDeclineModal(null);
                  onCancel?.();
                }}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                Exit Assessment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
}
