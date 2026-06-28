import React from "react";
import { ShieldCheck, ChevronRight, ArrowLeft } from "lucide-react";
import { getPhase1Summary, calculateShimScore } from "../utils/intakeEngine";

interface PrePaymentSummaryProps {
  track: string;
  answers: Record<string, any>;
  onProceedToPayment: () => void;
  onGoBack: () => void;
}

export default function PrePaymentSummary({
  track,
  answers,
  onProceedToPayment,
  onGoBack
}: PrePaymentSummaryProps) {
  // Calculate SHIM score only if it's the ED track
  const shimScore = track === "ED" ? calculateShimScore(answers) : undefined;
  const { severityLabel, factors, cta } = getPhase1Summary(track, answers, shimScore);

  // Take at most 5 factors
  const displayedFactors = factors.slice(0, 5);

  return (
    <div className="w-full max-w-[480px] mx-auto bg-neutral-950/40 backdrop-blur-md rounded-2xl border border-neutral-800/60 p-6 flex flex-col space-y-6" id="pre-payment-summary-container">
      
      {/* Top section: Assessment Header Card */}
      <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-5 text-center space-y-3" id="summary-header-card">
        <div className="w-12 h-12 bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] rounded-full flex items-center justify-center mx-auto" id="shield-icon-container">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-semibold">
            Confidential Assessment
          </p>
          <h2 className="text-white text-lg font-semibold tracking-tight">
            Your Clinical Assessment
          </h2>
        </div>
        
        <div className="py-2 border-t border-b border-neutral-800/50 my-1">
          <span className="text-[#C9A84C] text-base font-medium tracking-wide block" id="severity-label">
            {severityLabel}
          </span>
          {track === "ED" && shimScore && shimScore.severity !== "No Assessment" && (
            <div className="inline-block mt-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded px-2.5 py-0.5 text-[10px] text-neutral-300 font-mono" id="shim-score-badge">
              SHIM Score: {shimScore.score}/25 ({shimScore.severity})
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Key Factors */}
      <div className="space-y-3" id="summary-factors-section">
        <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
          Key factors identified in your responses:
        </h3>
        <ul className="space-y-2.5" id="factors-list">
          {displayedFactors.map((factor, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-neutral-300 leading-relaxed" id={`factor-item-${idx}`}>
              <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full shrink-0 mt-2" />
              <span>{factor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-neutral-800/60" />

      {/* Bottom section: CTA & Payment info */}
      <div className="space-y-5" id="summary-cta-section">
        <p className="text-sm text-neutral-300 leading-relaxed" id="summary-cta-text">
          {cta}
        </p>

        <div className="flex justify-between items-center bg-neutral-900/40 border border-neutral-900 px-4 py-3 rounded-xl" id="price-display-box">
          <span className="text-xs font-mono text-neutral-400">Consultation Fee</span>
          <span className="text-white font-mono font-bold text-base">₦7,500</span>
        </div>

        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={onProceedToPayment}
            className="w-full bg-[#C9A84C] text-black hover:bg-[#b0913e] py-3.5 rounded-xl text-sm font-semibold font-mono tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#C9A84C]/10"
            id="btn-proceed-to-payment"
          >
            <span>Proceed to Payment</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onGoBack}
            className="w-full text-center text-xs font-mono text-neutral-500 hover:text-neutral-400 flex items-center justify-center gap-1 py-1 transition-colors"
            id="btn-review-answers"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Review My Answers</span>
          </button>
        </div>

        <p className="text-[10px] text-neutral-500 text-center leading-relaxed font-sans">
          Your answers are saved. You will complete the full assessment after payment.
        </p>
      </div>

    </div>
  );
}
