import React from "react";
import { 
  Shield, Key, Lock, Users, Sparkles, Send, FileText, 
  Wallet, ArrowRight, HelpCircle, Activity, Building, LogOut, CheckCircle, Clock 
} from "lucide-react";
import { Doctor, Consultation } from "../types";
import { consultationApi, doctorApi } from "../lib/api";

interface ClinicianAreaProps {
  currentDoctor: Doctor | null;
  setCurrentDoctor: (doc: Doctor | null) => void;
  docView: "login" | "cases" | "wallet";
  setDocView: (v: "login" | "cases" | "wallet") => void;
  isRegistering: boolean;
  setIsRegistering: (v: boolean) => void;
  docFolio: string;
  setDocFolio: (v: string) => void;
  docPin: string;
  setDocPin: (v: string) => void;
  docRegName: string;
  setDocRegName: (v: string) => void;
  docRegPhone: string;
  setDocRegPhone: (v: string) => void;
  docRegFolio: string;
  setDocRegFolio: (v: string) => void;
  docRegAplYear: string;
  setDocRegAplYear: (v: string) => void;
  docRegPin: string;
  setDocRegPin: (v: string) => void;
  docError: string;
  setDocError: (v: string) => void;
  docSuccess: string;
  setDocSuccess: (v: string) => void;
  selectedDoctorCase: Consultation | null;
  setSelectedDoctorCase: (c: Consultation | null) => void;
  doctorMessage: string;
  setDoctorMessage: (v: string) => void;
  aiPrompt: string;
  setAiPrompt: (v: string) => void;
  aiDraft: string;
  setAiDraft: (v: string) => void;
  isGeneratingDraft: boolean;
  setIsGeneratingDraft: (v: boolean) => void;
  closingNotes: string;
  setClosingNotes: (v: string) => void;
  closingPrescription: string;
  setClosingPrescription: (v: string) => void;
  showCloseModal: boolean;
  setShowCloseModal: (v: boolean) => void;
  payoutAmount: string;
  setPayoutAmount: (v: string) => void;
  payoutBank: string;
  setPayoutBank: (v: string) => void;
  payoutAccount: string;
  setPayoutAccount: (v: string) => void;
  payoutMsg: { type: string; text: string };
  setPayoutMsg: (v: { type: string; text: string }) => void;
  onDoctorLogin: (e: React.FormEvent) => void;
  onDoctorRegister: (e: React.FormEvent) => void;
  onDoctorClaimCase: (id: string) => void;
  onSendDoctorMessage: () => void;
  onGenerateAIDraft: () => void;
  onCompleteConsultation: () => void;
  onPayoutRequest: (e: React.FormEvent) => void;
  formatDate: (d: string) => string;
  formatNaira: (n: number) => string;
  triggerRefresh: () => void;
}

export default function ClinicianArea({
  currentDoctor,
  setCurrentDoctor,
  docView,
  setDocView,
  isRegistering,
  setIsRegistering,
  docFolio,
  setDocFolio,
  docPin,
  setDocPin,
  docRegName,
  setDocRegName,
  docRegPhone,
  setDocRegPhone,
  docRegFolio,
  setDocRegFolio,
  docRegAplYear,
  setDocRegAplYear,
  docRegPin,
  setDocRegPin,
  docError,
  setDocError,
  docSuccess,
  setDocSuccess,
  selectedDoctorCase,
  setSelectedDoctorCase,
  doctorMessage,
  setDoctorMessage,
  aiPrompt,
  setAiPrompt,
  aiDraft,
  setAiDraft,
  isGeneratingDraft,
  setIsGeneratingDraft,
  closingNotes,
  setClosingNotes,
  closingPrescription,
  setClosingPrescription,
  showCloseModal,
  setShowCloseModal,
  payoutAmount,
  setPayoutAmount,
  payoutBank,
  setPayoutBank,
  payoutAccount,
  setPayoutAccount,
  payoutMsg,
  setPayoutMsg,
  onDoctorLogin,
  onDoctorRegister,
  onDoctorClaimCase,
  onSendDoctorMessage,
  onGenerateAIDraft,
  onCompleteConsultation,
  onPayoutRequest,
  formatDate,
  formatNaira,
  triggerRefresh
}: ClinicianAreaProps) {
  
  // Re-fetch calculations inside context
  const activeConsultations = consultationApi.getAll();
  const pendingCases = activeConsultations.filter(c => c.status === "pending");
  const claimedCases = currentDoctor ? activeConsultations.filter(c => c.doctor_id === currentDoctor.id) : [];

  return (
    <div className="w-full">
      {/* SECTION 1: CLINICIAN GUEST PORTAL (LOGIN & REGISTER) */}
      {!currentDoctor ? (
        <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-600" />
          
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto mb-1">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Clinician Administration Access
            </h3>
            <p className="text-xs text-zinc-400">
              {isRegistering ? "Register your credentials for active clinical cycle" : "Enter folio and PIN to authorize clinician console"}
            </p>
          </div>

          {docError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
              {docError}
            </div>
          )}

          {docSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs">
              {docSuccess}
            </div>
          )}

          {/* REGISTER DRAWER */}
          {isRegistering ? (
            <form onSubmit={onDoctorRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Physician Name (as on registry)</label>
                <input required type="text" placeholder="e.g. Dr. Adeola Martins" value={docRegName} onChange={(e) => setDocRegName(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Mobile Phone Number</label>
                <input required type="tel" placeholder="e.g. +234 805..." value={docRegPhone} onChange={(e) => setDocRegPhone(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">Medical Folio Code</label>
                  <input required type="text" placeholder="e.g. FM12487" value={docRegFolio} onChange={(e) => setDocRegFolio(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-400">APL Active Year</label>
                  <input required type="number" placeholder="e.g. 2025" value={docRegAplYear} onChange={(e) => setDocRegAplYear(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Set Console PIN (Numerical)</label>
                <input required type="password" placeholder="e.g. ****" value={docRegPin} onChange={(e) => setDocRegPin(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow">
                Submit Practice Application
              </button>
              <button type="button" onClick={() => { setIsRegistering(false); setDocError(""); setDocSuccess(""); }} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-400 transition-colors py-1">
                Already registered? Access Console
              </button>
            </form>
          ) : (
            /* LOGIN DRAWER */
            <form onSubmit={onDoctorLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Verified Folio Number</label>
                <input required type="text" placeholder="e.g. FM12487" value={docFolio} onChange={(e) => setDocFolio(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">Console Security PIN</label>
                <input required type="password" placeholder="e.g. ****" value={docPin} onChange={(e) => setDocPin(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
              </div>
              <button type="submit" className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow">
                Authorize Practice Console
              </button>
              <button type="button" onClick={() => { setIsRegistering(true); setDocError(""); setDocSuccess(""); }} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-400 transition-colors py-1">
                New physician? Register credentials
              </button>
            </form>
          )}
        </div>
      ) : (
        /* SECTION 2: CLINICIAN PORTAL INTERFACES (CASES, CHAT, WALLET) */
        <div className="space-y-8 animate-fade-in">
          
          {/* Authenticated Physician Banner */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#E5C158] font-mono font-bold flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-[#d4af37]" /> Verified Practitioner
              </span>
              <h3 className="text-xl font-bold text-white mt-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Welcome, {currentDoctor.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Folio Code: <span className="font-mono text-zinc-300 font-bold">{currentDoctor.mdcn_folio}</span> • Licensed cycle active.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2.5 items-center">
              <button 
                onClick={() => { setDocView("cases"); setSelectedDoctorCase(null); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  docView === "cases" ? "bg-[#d4af37] text-black" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                Case Caseloads ({claimedCases.length})
              </button>
              <button 
                onClick={() => { setDocView("wallet"); setPayoutMsg({ type: "", text: "" }); }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  docView === "wallet" ? "bg-[#d4af37] text-black" : "border border-zinc-900 text-zinc-400 hover:text-white"
                }`}
              >
                <Wallet className="w-4 h-4" /> Wallet ({formatNaira(currentDoctor.payout_balance)})
              </button>
              <button 
                onClick={() => { setCurrentDoctor(null); setSelectedDoctorCase(null); }}
                className="p-2 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                title="Disconnect clinic console"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VIEW A: MAIN ACTIVE & PENDING CASE DESK */}
          {docView === "cases" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Queues List (Active claimed & Open unassigned) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Active Claimed Caseloads */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Your Assigned Caseloads ({claimedCases.length})
                  </h4>
                  {claimedCases.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No claimed consultations. Pick up active files below.</p>
                  ) : (
                    <div className="space-y-2">
                      {claimedCases.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedDoctorCase(c); triggerRefresh(); }}
                          className={`w-full p-3.5 rounded-xl text-left border text-xs transition-all flex justify-between items-center ${
                            selectedDoctorCase?.id === c.id 
                              ? "bg-[#d4af37]/10 border-[#d4af37] text-[#E5C158]" 
                              : "bg-black border-zinc-900 hover:border-zinc-850 text-zinc-300"
                          }`}
                        >
                          <div>
                            <span className="font-bold block truncate max-w-[140px]">{c.patient_name}</span>
                            <span className="text-[10px] text-zinc-500 mt-0.5 block truncate max-w-[140px]">{c.condition}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono tracking-widest uppercase ${
                            c.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {c.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Open Pending Queue */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-[#E5C158] uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Open Consultations Queue ({pendingCases.length})
                  </h4>
                  {pendingCases.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No open case files pending pickup in this cycle.</p>
                  ) : (
                    <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                      {pendingCases.map(c => (
                        <div key={c.id} className="p-4 bg-black rounded-xl border border-zinc-900 space-y-3">
                          <div>
                            <span className="font-bold text-white block text-xs">{c.condition}</span>
                            <span className="text-[9.5px] text-zinc-500 font-mono mt-0.5 block">File ID: {c.id} • Age: {c.patient_age}</span>
                          </div>
                          
                          <div className="text-[10.5px] text-zinc-400 space-y-1 leading-relaxed italic border-l border-zinc-800 pl-2">
                            {c.raw_answers.slice(0, 2).map((ans, idx) => (
                              <p key={idx}>• {ans.question}: <strong className="text-zinc-200">{ans.answer}</strong></p>
                            ))}
                          </div>

                          <button
                            onClick={() => onDoctorClaimCase(c.id)}
                            className="w-full py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-[10.5px] rounded-lg transition-colors"
                          >
                            Accept & Claim Case File
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Case Details & Messaging stage */}
              <div className="lg:col-span-8">
                {selectedDoctorCase ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Panel 1: Patient file card & Gemini AI assessment summaries (MD-Left) */}
                    <div className="md:col-span-5 space-y-6">
                      
                      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3.5">
                        <div className="flex justify-between items-start border-b border-zinc-900 pb-2">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            Patient Metadata
                          </h4>
                          <span className="text-[10px] font-mono text-[#E5C158] font-bold">PD-{selectedDoctorCase.id}</span>
                        </div>
                        <div className="text-xs space-y-2 text-zinc-300">
                          <p>Patient: <strong className="text-white">{selectedDoctorCase.patient_name}</strong></p>
                          <p>Age Reference: <strong className="text-white">{selectedDoctorCase.patient_age} years</strong></p>
                          <p>Consult Category: <strong className="text-white">{selectedDoctorCase.condition}</strong></p>
                          <p>Duration: <strong className="text-zinc-200">{selectedDoctorCase.duration}</strong></p>
                        </div>
                      </div>

                      {/* Gemini clinical contraindications assessment */}
                      <div className="bg-gradient-to-br from-amber-500/5 to-black border border-[#d4af37]/15 rounded-2xl p-5 space-y-3">
                        <h5 className="font-bold text-[#E5C158] flex items-center gap-1.5 text-xs tracking-wider uppercase font-mono border-b border-[#d4af37]/10 pb-2">
                          <Sparkles className="w-4 h-4 text-[#d4af37]" /> Gemini Clinical Brief
                        </h5>
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                          {selectedDoctorCase.ai_summary || "Gemini is examining safety contraindications..."}
                        </p>
                      </div>

                    </div>

                    {/* Panel 2: Secure live chat (MD-Center/Right) */}
                    <div className="md:col-span-7 space-y-6">
                      
                      <div className="bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col h-[320px] overflow-hidden">
                        <div className="px-4 py-3 bg-zinc-900/10 border-b border-zinc-900 flex justify-between items-center text-xs">
                          <span className="font-bold text-white">Direct Medical Dialogue</span>
                          <span className="text-[9.5px] font-mono text-zinc-500">AES Encrypted</span>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-black/10 text-xs">
                          {selectedDoctorCase.messages.map(msg => {
                            if (msg.sender === "system") {
                              return (
                                <div key={msg.id} className="text-center py-0.5">
                                  <span className="inline-block px-2.5 py-0.5 bg-zinc-900 text-[8px] text-zinc-500 rounded-full">
                                    {msg.text}
                                  </span>
                                </div>
                              );
                            }
                            const isDoctor = msg.sender === "doctor";
                            return (
                              <div key={msg.id} className={`flex ${isDoctor ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[240px] rounded-2xl p-3 space-y-1 ${
                                  isDoctor ? "bg-[#d4af37] text-black font-semibold rounded-tr-none" : "bg-zinc-900 text-zinc-200 rounded-tl-none"
                                }`}>
                                  <span className="text-[8px] block opacity-75 uppercase font-mono tracking-wider font-extrabold">{msg.sender_name}</span>
                                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Send Inputs */}
                        {selectedDoctorCase.status !== "completed" ? (
                          <div className="p-2 border-t border-zinc-900 flex gap-2">
                            <input
                              type="text"
                              placeholder="Reply with clinical instructions..."
                              value={doctorMessage}
                              onChange={(e) => setDoctorMessage(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && onSendDoctorMessage()}
                              className="flex-1 bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                            />
                            <button onClick={onSendDoctorMessage} className="p-2 bg-[#d4af37] text-black rounded-xl hover:brightness-110 transition-all">
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-zinc-900/40 border-t border-zinc-900 text-center text-[10px] text-zinc-500 italic">
                            Caseload file closed. Evaluation archived.
                          </div>
                        )}
                      </div>

                      {/* Gemini Copilot response drawer & Closing file drawers */}
                      {selectedDoctorCase.status !== "completed" && (
                        <div className="space-y-4">
                          {/* Copilot */}
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
                            <h5 className="text-xs font-bold text-[#E5C158] flex items-center gap-1.5 uppercase tracking-wider font-mono">
                              <Sparkles className="w-4 h-4 text-[#d4af37]" /> Gemini Response Copilot
                            </h5>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Draft advice for pelvic muscles..."
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="flex-1 bg-black border border-zinc-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                              />
                              <button
                                onClick={onGenerateAIDraft}
                                disabled={isGeneratingDraft || !aiPrompt.trim()}
                                className="px-3.5 py-2 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all disabled:opacity-40"
                              >
                                {isGeneratingDraft ? "Drafting..." : "Draft"}
                              </button>
                            </div>
                            
                            {aiDraft && (
                              <div className="space-y-2 pt-1 animate-fade-in">
                                <label className="text-[9.5px] uppercase font-mono text-zinc-500 font-bold block">Gemini Output (Click to append)</label>
                                <div 
                                  onClick={() => {
                                    setDoctorMessage(doctorMessage ? `${doctorMessage}\n\n${aiDraft}` : aiDraft);
                                    setAiDraft("");
                                  }}
                                  className="text-xs text-zinc-400 leading-relaxed bg-black p-3.5 rounded-xl border border-zinc-900 cursor-pointer hover:border-zinc-700 max-h-40 overflow-y-auto"
                                >
                                  {aiDraft}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Close Case Form Panel */}
                          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-900 pb-2.5">
                              <h5 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Complete Consultation & Sign Rx</h5>
                            </div>
                            
                            <div className="space-y-3.5">
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Reviewer Clinical Notes</label>
                                <textarea
                                  placeholder="Type diagnosis notes..."
                                  rows={2}
                                  value={closingNotes}
                                  onChange={(e) => setClosingNotes(e.target.value)}
                                  className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">Pharmaceutical Prescription (Rx details)</label>
                                <textarea
                                  placeholder="e.g. Sildenafil 50mg, Tab 1 to be taken as directed..."
                                  rows={2}
                                  value={closingPrescription}
                                  onChange={(e) => setClosingPrescription(e.target.value)}
                                  className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37] font-mono"
                                />
                              </div>

                              <button
                                onClick={onCompleteConsultation}
                                disabled={!closingNotes.trim()}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs rounded-xl transition-colors disabled:opacity-40"
                              >
                                Certify Consultation & Issue Signed Rx
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                ) : (
                  <div className="p-16 bg-zinc-950 border border-zinc-900 rounded-2xl text-center space-y-2">
                    <Activity className="w-10 h-10 text-zinc-800 mx-auto" />
                    <h5 className="font-bold text-zinc-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>No Active Case Workspace Opened</h5>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                      Select any claimed case from your left caseloads panel, or accept an open patient questionnaire from the waiting queue.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW B: PAYOUT DESK WALLET */}
          {docView === "wallet" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-fade-in">
              
              {/* Wallet Payout Request Form (MD-Left/Center) */}
              <div className="md:col-span-5 bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Request Verified Revenue Payout
                  </h4>
                  <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                    Withdraw cleared clinician earnings. Payout requests undergo standard administrative settlement validation within 12-24 hours.
                  </p>
                </div>

                {payoutMsg.text && (
                  <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                    payoutMsg.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
                  }`}>
                    {payoutMsg.text}
                  </div>
                )}

                <form onSubmit={onPayoutRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Withdrawal Amount (₦)</label>
                    <input required type="number" placeholder="Enter amount..." value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Recipient Bank Name</label>
                    <input required type="text" placeholder="e.g. Access Bank" value={payoutBank} onChange={(e) => setPayoutBank(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400">Recipient Account Number (NUBAN)</label>
                    <input required type="text" placeholder="10-digit account number" value={payoutAccount} onChange={(e) => setPayoutAccount(e.target.value)} className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]" />
                  </div>

                  <button type="submit" className="w-full py-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow">
                    Initiate Clearance Settlement
                  </button>
                </form>
              </div>

              {/* Wallet Ledger and Balances details (MD-Right) */}
              <div className="md:col-span-7 space-y-6">
                
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-zinc-900 pb-2.5">
                    Physician Wallet Ledger
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Available Balance</span>
                      <strong className="text-xl font-extrabold text-[#E5C158] block">{formatNaira(currentDoctor.payout_balance)}</strong>
                    </div>
                    <div className="p-4 bg-black rounded-xl border border-zinc-900 space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Clinician Split Fee</span>
                      <strong className="text-sm font-extrabold text-zinc-300 block">70% Commission</strong>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
}
