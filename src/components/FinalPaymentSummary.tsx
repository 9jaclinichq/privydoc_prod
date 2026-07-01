import React from "react";
import { ShieldCheck, ChevronRight } from "lucide-react";

interface FinalPaymentSummaryProps {
  conditionTitle: string;
  isProcessing?: boolean;
  onProceedToPayment: () => void;
}

export default function FinalPaymentSummary({
  conditionTitle,
  isProcessing = false,
  onProceedToPayment
}: FinalPaymentSummaryProps) {
  return (
    <div className="w-full max-w-[480px] mx-auto bg-neutral-950/40 md:backdrop-blur-md rounded-2xl border border-neutral-800/60 p-6 flex flex-col space-y-6" id="final-payment-summary-container">

      <div className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-5 text-center space-y-3" id="final-summary-header-card">
        <div className="w-12 h-12 bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 font-semibold">
            Assessment Complete
          </p>
          <h2 className="text-white text-lg font-semibold tracking-tight">
            You are ready for your doctor consultation
          </h2>
        </div>
        <p className="text-sm text-[#C9A84C] font-medium tracking-wide">
          {conditionTitle}
        </p>
      </div>

      <div className="flex justify-between items-center bg-neutral-900/40 border border-neutral-900 px-4 py-3 rounded-xl" id="final-price-display-box">
        <span className="text-xs font-mono text-neutral-400">Consultation Fee</span>
        <span className="text-white font-mono font-bold text-base">₦7,500</span>
      </div>

      <button
        type="button"
        onClick={onProceedToPayment}
        disabled={isProcessing}
        className="w-full bg-[#C9A84C] text-black hover:bg-[#b0913e] py-3.5 rounded-xl text-sm font-semibold font-mono tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#C9A84C]/10 disabled:opacity-50"
        id="btn-proceed-to-secure-payment"
      >
        <span>{isProcessing ? "Processing..." : "Proceed to Secure Payment"}</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      <p className="text-[10px] text-neutral-500 text-center leading-relaxed font-sans">
        Your assessment is saved. Payment is processed securely by Flutterwave, then your case is submitted to a licensed doctor.
      </p>

    </div>
  );
}
