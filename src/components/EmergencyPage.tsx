import React from "react";
import { AlertOctagon, Phone, ShieldAlert, ArrowLeft } from "lucide-react";

interface EmergencyPageProps {
  messages: string[];
  track: string;
  onGoBack: () => void;
}

export default function EmergencyPage({
  messages,
  track,
  onGoBack
}: EmergencyPageProps) {
  return (
    <div className="w-full max-w-[480px] mx-auto bg-neutral-950/50 backdrop-blur-md rounded-2xl border border-red-900/30 overflow-hidden shadow-2xl" id="emergency-page-container">
      
      {/* Red Warning Banner */}
      <div className="bg-red-600 px-6 py-4 flex items-center gap-3 text-white" id="emergency-red-banner">
        <AlertOctagon className="w-6 h-6 shrink-0 animate-pulse" />
        <span className="font-mono text-xs uppercase font-extrabold tracking-widest">
          Clinical Safety Halt
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* PrivyDoc Identity Header */}
        <div className="text-center space-y-2" id="emergency-identity-header">
          <div className="flex justify-center items-center gap-1.5 text-white font-serif tracking-wider text-xl font-bold">
            <span className="text-[#C9A84C]">Privy</span>Doc
          </div>
          <h2 className="text-white text-lg font-semibold tracking-tight">
            Important — Please Read
          </h2>
          <p className="text-xs text-neutral-400">
            Our medical intake engine has detected specific risk factors that require immediate clinical attention.
          </p>
        </div>

        {/* Triggered Red Flags Box */}
        <div className="bg-red-950/20 border border-red-900/45 rounded-xl p-4 space-y-3" id="emergency-redflags-box">
          <span className="text-[10px] uppercase font-mono tracking-wider bg-red-950 text-red-400 px-2 py-1 rounded inline-block font-bold">
            Identified Risk Factors
          </span>
          <ul className="space-y-2.5 text-xs text-neutral-300 leading-relaxed">
            {messages.map((msg, idx) => (
              <li key={idx} className="flex items-start gap-2 text-red-200">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Emergency Actions list */}
        <div className="space-y-3" id="emergency-actions-section">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-bold">
            Emergency Action Required:
          </h3>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-3 bg-neutral-900/60 border border-neutral-800/60 rounded-xl px-4 py-3 text-sm text-white font-mono">
              <Phone className="w-4 h-4 text-[#C9A84C]" />
              <div className="flex-1 flex justify-between items-center">
                <span className="text-neutral-300 text-xs">Emergency Services</span>
                <strong className="text-red-400">Call 199</strong>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-neutral-900/60 border border-neutral-800/60 rounded-xl px-4 py-3 text-sm text-white font-mono">
              <Phone className="w-4 h-4 text-[#C9A84C]" />
              <div className="flex-1 flex justify-between items-center">
                <span className="text-neutral-300 text-xs">LASAMBUS (Lagos)</span>
                <strong className="text-[#C9A84C]">08000LASAMBUS</strong>
              </div>
            </div>

            <div className="bg-neutral-900/40 border border-neutral-800/40 rounded-xl px-4 py-3 text-xs text-neutral-300 leading-relaxed">
              🏥 Go to your nearest hospital emergency department immediately.
            </div>
          </div>
        </div>

        {/* Reassurance text */}
        <p className="text-xs text-neutral-400 leading-relaxed text-center font-sans bg-neutral-900/25 p-3.5 rounded-xl border border-neutral-800/20">
          We care about your safety. PrivyDoc is designed for non-emergency consultations. Please get the urgent help you need first. You can return to PrivyDoc once you have been seen by a doctor.
        </p>

        {/* Back Link Button */}
        <button
          type="button"
          onClick={onGoBack}
          className="w-full bg-[#C9A84C] text-black hover:bg-[#b0913e] py-3 rounded-xl text-sm font-semibold font-mono tracking-wide transition-all flex items-center justify-center gap-2"
          id="btn-emergency-go-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back and Review</span>
        </button>

      </div>

    </div>
  );
}
