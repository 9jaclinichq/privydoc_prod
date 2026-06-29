import React from "react";
import { Shield, Activity, ArrowRight, ClipboardCheck, PhoneCall, HeartPulse } from "lucide-react";
import { MEN_HEALTH_CONDITIONS } from "../data";
import Logo from "./Logo";

interface PatientLandingProps {
  onSelectSymptom: (id: string) => void;
  onStartIntake: (condition: any) => void;
  onEnterPortal: () => void;
  searchPhone: string;
  setSearchPhone: (phone: string) => void;
  onSearchPortal: () => void;
  patientSession?: any;
  onLogout?: () => void;
  onSelectClinician?: () => void;
}

export default function PatientLanding({
  onSelectSymptom,
  onStartIntake,
  onEnterPortal,
  searchPhone,
  setSearchPhone,
  onSearchPortal,
  patientSession = null,
  onLogout = () => {},
  onSelectClinician = () => {}
}: PatientLandingProps) {
  return (
    <div className="space-y-16 animate-slide-up">
      {/* Visual Header / Splash Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/60 to-black border border-zinc-900 px-6 py-16 text-center space-y-6 shadow-2xl">
        {/* Shimmer Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(212,175,55,0.06),transparent_50%)] pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-[#E5C158] uppercase tracking-widest mx-auto">
          <Shield className="w-3.5 h-3.5" /> Certified Telemedicine Protocol • Secure AES-256 Encryption
        </div>

        <div className="flex justify-center">
          <Logo className="h-24" showText={false} />
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          <h2 
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.2]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Confidential Healthcare for Men,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2D4] via-[#E5C158] to-[#AA7C11]">
              Handled with Absolute Discretion
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed font-sans">
            Connect confidentially with certified medical doctors in Nigeria. Get expert clinical reviews, custom-tailored treatment recommendations, and secure delivery of prescription therapies. No awkward waiting rooms, no physical exposure, and no public queues.
          </p>
        </div>

        {/* Action Button & Secure Vault Entrance */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
          {patientSession ? (
            <div className="w-full bg-zinc-950/90 rounded-2xl border border-zinc-900 p-4 space-y-3.5 shadow-inner">
              <div className="text-xs text-zinc-400">
                Logged in as <strong className="text-white font-medium">{patientSession.name}</strong> ({patientSession.phone})
              </div>
              <div className="flex gap-2.5 justify-center">
                <button 
                  onClick={onEnterPortal}
                  className="bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all"
                >
                  Enter Secure Vault Dashboard
                </button>
                <button 
                  onClick={onLogout}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-xs px-5 py-2.5 rounded-xl transition-all border border-zinc-800"
                >
                  Lock Vault (Log Out)
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full relative flex items-center bg-zinc-950 rounded-xl border border-zinc-900 focus-within:border-amber-500/30 transition-all p-1 shadow-inner">
              <input 
                type="tel" 
                placeholder="Enter WhatsApp number to unlock patient vault..." 
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                className="flex-1 bg-transparent px-3 text-xs text-white focus:outline-none placeholder-zinc-600 font-mono"
                onKeyDown={(e) => e.key === "Enter" && onSearchPortal()}
              />
              <button 
                onClick={onSearchPortal}
                className="bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1"
              >
                Access Vault
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Program Chooser Section */}
      <div className="space-y-6">
        <div className="text-center sm:text-left border-b border-zinc-900 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <HeartPulse className="w-5 h-5 text-[#d4af37]" /> Licensed Clinical Intake Portals
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Select a certified therapeutic health pathway below to explore guidelines, evaluate symptoms, or submit clinical logs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5">
          {MEN_HEALTH_CONDITIONS.map((cond) => (
            <div 
              key={cond.id}
              className="luxury-hover bg-zinc-950/80 rounded-2xl border border-zinc-900 p-6 flex flex-col justify-between gap-5 transition-all group shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-white group-hover:text-[#E5C158] transition-colors" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {cond.title}
                  </h4>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-[#d4af37] bg-amber-500/5 px-2 py-0.5 rounded border border-[#d4af37]/15">Active Pathway</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {cond.id === "GHC" 
                    ? "Proactive check of your overall vitality, sleep, metabolic health, and performance markers. Includes personalized advice from a certified medical practitioner to optimize your long-term stamina."
                    : cond.id === "ED" 
                    ? "A completely private, physician-led evaluation of your erectile performance and confidence. Get tailored medical reviews and clinically proven therapeutic treatments with absolute confidentiality."
                    : cond.id === "PE" 
                    ? "Access professional, proven clinical strategies and customized delay therapies. Improve latency, build endurance, and work with licensed doctors to reclaim complete bedroom control."
                    : cond.id === "STI" 
                    ? "Confidential assessment of symptoms, discharge, localized lesions, or generic exposure concerns. Receive a prompt, private treatment recommendations or testing guidelines from a verified physician."
                    : "Comprehensive medical evaluation of physical stamina, fatigue indicators, low energy levels, and lifestyle factors to safely revitalize your natural libido and confidence."}
                </p>
              </div>

              <div className="flex items-center justify-end border-t border-zinc-900/80 pt-4 mt-auto">
                <div className="flex gap-2">
                  <button 
                    onClick={() => onSelectSymptom(cond.id)}
                    className="px-2.5 py-1.5 rounded-lg border border-zinc-900 hover:border-zinc-800 text-[10.5px] font-bold text-zinc-400 hover:text-white transition-colors"
                  >
                    Clinical Guidelines
                  </button>
                  <button 
                    onClick={() => onStartIntake(cond)}
                    className="px-3 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-[10.5px] transition-colors shadow-md"
                  >
                    Initiate Intake
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works / Trust Badges */}
      <div className="grid grid-cols-1 gap-4 pt-4">
        <div className="bg-zinc-950/30 border border-zinc-900/60 rounded-2xl p-6 flex gap-4 items-start luxury-hover">
          <div className="p-2.5 bg-amber-500/10 text-[#d4af37] rounded-xl border border-amber-500/15 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-zinc-200 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>1. Secure Diagnostic Intake</h5>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">Submit your medical questionnaire safely in 3 minutes. Your responses are encrypted and processed through our clinical proxy pipeline.</p>
          </div>
        </div>

        <div className="bg-zinc-950/30 border border-zinc-900/60 rounded-2xl p-6 flex gap-4 items-start luxury-hover">
          <div className="p-2.5 bg-amber-500/10 text-[#d4af37] rounded-xl border border-amber-500/15 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-zinc-200 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>2. Certified Medical Review</h5>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">A verified, licensed medical practitioner reviews your clinical records and claims your case within minutes.</p>
          </div>
        </div>

        <div className="bg-zinc-950/30 border border-zinc-900/60 rounded-2xl p-6 flex gap-4 items-start luxury-hover">
          <div className="p-2.5 bg-amber-500/10 text-[#d4af37] rounded-xl border border-amber-500/15 shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h5 className="font-bold text-zinc-200 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>3. Pharmacotherapy Vault</h5>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">Retrieve official digital prescriptions, medication schedules, and clinical reports directly from your personal encrypted secure locker.</p>
          </div>
        </div>
      </div>

      {/* Clinician Onboarding CTA Section */}
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/20 p-6 text-center space-y-4">
        <h5 className="font-bold text-zinc-300 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Are you a licensed clinician?</h5>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Help expand men's healthcare access across Nigeria. Log in to your clinical workstation or submit your practice application with your MDCN credentials.
        </p>
        <button
          onClick={onSelectClinician}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-[#d4af37] border border-zinc-800 hover:border-zinc-700 font-bold text-xs transition-colors"
        >
          Access Clinician Workstation <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
