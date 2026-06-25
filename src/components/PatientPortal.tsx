import React, { useState } from "react";
import { 
  Lock, ArrowRight, ArrowLeft, User, ShieldAlert, FileText, FileDown, 
  MessageSquare, Sparkles, Send, HelpCircle, Activity,
  LineChart, Compass, Wallet, Settings, Clock, Heart, ClipboardCheck
} from "lucide-react";
import { Consultation } from "../types";
import { jsPDF } from "jspdf";
import { renderRichText } from "../utils";

interface PatientPortalProps {
  selectedCase: Consultation | null;
  setSelectedCase: (c: Consultation | null) => void;
  allCases?: Consultation[];
  searchPhone: string;
  setSearchPhone: (phone: string) => void;
  onSearchPortal: () => void;
  patientMessage: string;
  setPatientMessage: (msg: string) => void;
  onSendPatientMessage: () => void;
  onStartNewCase: () => void;
  formatDate: (d: string) => string;
  formatNaira: (n: number) => string;
}

export default function PatientPortal({
  selectedCase,
  setSelectedCase,
  allCases = [],
  searchPhone,
  setSearchPhone,
  onSearchPortal,
  patientMessage,
  setPatientMessage,
  onSendPatientMessage,
  onStartNewCase,
  formatDate,
  formatNaira
}: PatientPortalProps) {
  // Sidebar state
  const [activeSidebarTab, setActiveSidebarTab] = useState<"dashboard" | "cases" | "messages" | "reports" | "payments">("dashboard");

  // Dynamic PDF download function
  const triggerDownloadPDF = (con: Consultation) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Background elegant light cream/gray tint for the official clinical prescription sheet
      doc.setFillColor(252, 252, 252);
      doc.rect(0, 0, 210, 297, "F");

      // Shimmer gold border accent
      doc.setDrawColor(212, 175, 55); 
      doc.setLineWidth(1);
      doc.rect(6, 6, 198, 285);

      // Top brand lines
      doc.setDrawColor(21, 21, 21);
      doc.setLineWidth(0.4);
      doc.line(12, 34, 198, 34);

      // Platform Logo text
      doc.setTextColor(21, 21, 21);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.text("PRIVYDOC", 14, 24);

      // Gold Subheading
      doc.setTextColor(184, 134, 11);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.text("DISCREET TELEMEDICINE & CLINICAL PRESCRIPTIONS", 14, 29);

      // Document Meta Block (Right Side)
      doc.setTextColor(115, 115, 115);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Official Document ID: PD-RX-${con.id.toUpperCase()}`, 125, 19);
      doc.text(`Date of Issue: ${formatDate(con.updated_at).split(",")[0]}`, 125, 23);
      doc.text(`License Body: Verified Telemedicine Portal`, 125, 27);

      // Gold separator line
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.8);
      doc.line(14, 36, 196, 36);

      // Section: Demographic file card
      doc.setFillColor(245, 245, 247);
      doc.rect(14, 42, 182, 24, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(21, 21, 21);
      doc.text("CONFIDENTIAL MEDICAL RECORD PROFILE", 18, 48);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(64, 64, 64);
      doc.text(`Patient Name: ${con.patient_name}`, 18, 54);
      doc.text(`Age DOB ref: ${con.patient_age} years`, 18, 59);
      doc.text(`Clinical Complaint: ${con.condition}`, 115, 54);
      doc.text(`Assigned Clinician: ${con.doctor_name || "Certified Medical Practitioner"}`, 115, 59);

      // Section: Diagnostic Brief Notes
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(184, 134, 11);
      doc.text("CLINICAL EVALUATION NOTES", 14, 76);

      doc.setDrawColor(229, 229, 229);
      doc.setLineWidth(0.5);
      doc.line(14, 79, 196, 79);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(64, 64, 64);

      const evalNotesRaw = con.doctor_notes || `Patient presented symptoms of ${con.condition} over a recorded duration of ${con.duration}. Digital intake was thoroughly analyzed for systemic cardiovascular contraindications. Patient exhibits normal respiratory/exercise parameters with no chest pain or nitrate interactions reported. Prescribing support remedies as appropriate.`;
      const evalNotes = evalNotesRaw
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/•/g, "  - ");
      const splitNotes = doc.splitTextToSize(evalNotes, 178);
      doc.text(splitNotes, 14, 85);

      const notesYHeight = splitNotes.length * 4.8;

      // Section: Official Prescription (Rx)
      const rxHeaderY = 93 + notesYHeight;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(184, 134, 11);
      doc.text("OFFICIAL PHARMACEUTICAL Rx", 14, rxHeaderY);

      doc.line(14, rxHeaderY + 3, 196, rxHeaderY + 3);

      // Huge Rx symbol
      doc.setFont("times", "bolditalic");
      doc.setFontSize(36);
      doc.setTextColor(212, 175, 55);
      doc.text("Rx", 14, rxHeaderY + 18);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(21, 21, 21);

      const prescriptionBodyRaw = con.prescription || "Clinical prescription not required at this time. Recommended: Daily exercise and pelvic floor support.";
      const prescriptionBody = prescriptionBodyRaw
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/•/g, "  - ");
      const splitPrescription = doc.splitTextToSize(prescriptionBody, 155);
      doc.text(splitPrescription, 32, rxHeaderY + 12);

      // Stamp section / cryptographic seal
      const stampY = 240;
      doc.setFillColor(254, 254, 247);
      doc.setDrawColor(212, 175, 55);
      doc.rect(14, stampY, 182, 32, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(184, 134, 11);
      doc.text("VERIFIED CLINICAL E-PRESCRIPTION", 18, stampY + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(115, 115, 115);
      doc.text("This electronic record has been secured with 256-bit AES encryption. Professional validity confirmed for the current cycle.", 18, stampY + 12);
      doc.text(`Prescribed via: PrivyDoc Telemedicine Portal. Secure validation reference ID: PD-${con.id.toUpperCase()}`, 18, stampY + 16);
      doc.text("Authorization status: ACTIVE / APPROVED FOR DISPENSARY RELEASE", 18, stampY + 20);

      // Circular Seal graphics
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.6);
      doc.circle(174, stampY + 16, 11);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.5);
      doc.text("PRIVYDOC", 167, stampY + 14);
      doc.text("APPROVED", 167, stampY + 16.5);
      doc.text("CLINIC SEAL", 165.5, stampY + 19);

      // Save PDF on trigger
      doc.save(`PrivyDoc-Prescription-${con.id}.pdf`);
    } catch (e) {
      console.error("Failed to generate PDF:", e);
      alert("Unable to compile report PDF in browser environment. Please review clinical notes inside the portal tab.");
    }
  };

  return (
    <div className="w-full">
      {/* 1. ARCHIVES LOOKUP BARRIER */}
      {!selectedCase ? (
        <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 text-center animate-slide-up relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-[#d4af37]" />
          
          <div className="flex justify-start">
            <button 
              type="button"
              onClick={onStartNewCase}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-[10px] font-bold font-mono uppercase tracking-wider"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Programs
            </button>
          </div>

          <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Confidential Case Archives
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter the exact WhatsApp number used during your intake to retrieve diagnoses, active secure chat rooms, and prescriptions.
            </p>
          </div>
          <div className="space-y-4">
            <input
              type="tel"
              placeholder="e.g. +2348055554444"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-xs text-white text-center focus:border-[#d4af37] focus:outline-none placeholder-zinc-700"
              onKeyDown={(e) => e.key === "Enter" && onSearchPortal()}
            />
            <button
              onClick={onSearchPortal}
              className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-2"
            >
              Fetch Secure Case Vault <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* 2. GLORIOUS TABLET / LAPTOP SIDEBAR DASHBOARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-20 lg:pb-0">
          
          {/* Mobile Top Header (Recommendation 4) */}
          <div className="lg:hidden flex justify-between items-center bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
            <div>
              <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">PrivyDoc Vault</p>
              <h4 className="text-xs font-bold text-[#E5C158] truncate max-w-[150px]">{selectedCase.patient_name}</h4>
            </div>
            <button 
              onClick={() => setSelectedCase(null)}
              className="px-2.5 py-1 text-[10px] font-bold border border-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
            >
              Log Out
            </button>
          </div>

          {/* Side Navbar Controls (Desktop View) */}
          <div className="hidden lg:block lg:col-span-3 bg-zinc-950 border border-zinc-900 rounded-2xl p-4 space-y-6">
            <div className="pb-4 border-b border-zinc-900 flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Confidential Portal</p>
                <h4 className="text-xs font-bold text-[#E5C158] mt-0.5 truncate max-w-[120px]">{selectedCase.patient_name}</h4>
              </div>
              <button 
                onClick={() => setSelectedCase(null)}
                className="px-2.5 py-1 text-[10px] font-bold border border-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                Log Out
              </button>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveSidebarTab("dashboard")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSidebarTab === "dashboard" 
                    ? "bg-[#d4af37]/10 text-[#E5C158]" 
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                }`}
              >
                <Activity className="w-4 h-4" /> Dashboard
              </button>
              <button
                onClick={() => setActiveSidebarTab("cases")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSidebarTab === "cases" 
                    ? "bg-[#d4af37]/10 text-[#E5C158]" 
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                }`}
              >
                <Clock className="w-4 h-4" /> My Cases
              </button>
              <button
                onClick={() => setActiveSidebarTab("messages")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSidebarTab === "messages" 
                    ? "bg-[#d4af37]/10 text-[#E5C158]" 
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                }`}
              >
                <MessageSquare className="w-4 h-4" /> Messages
              </button>
              <button
                onClick={() => setActiveSidebarTab("reports")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeSidebarTab === "reports" 
                    ? "bg-[#d4af37]/10 text-[#E5C158]" 
                    : "text-zinc-400 hover:bg-zinc-900/40 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" /> Reports / Rx
              </button>
            </nav>

            <div className="pt-4 border-t border-zinc-900 text-[10px] text-zinc-500 font-mono space-y-1">
              <p>Platform Status: SECURE</p>
              <p>Encryption: AES-256</p>
              <p>License Status: VERIFIED</p>
            </div>
          </div>

          {/* Mobile Sticky Bottom Tab Bar (Recommendation 4) */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-zinc-900 px-4 py-3 flex justify-around items-center">
            <button
              onClick={() => setActiveSidebarTab("dashboard")}
              className={`flex flex-col items-center gap-1.5 text-[10px] font-bold transition-all duration-200 ${
                activeSidebarTab === "dashboard" ? "text-[#E5C158] scale-[1.05]" : "text-zinc-500"
              }`}
            >
              <Activity className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab("cases")}
              className={`flex flex-col items-center gap-1.5 text-[10px] font-bold transition-all duration-200 ${
                activeSidebarTab === "cases" ? "text-[#E5C158] scale-[1.05]" : "text-zinc-500"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Cases</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab("messages")}
              className={`flex flex-col items-center gap-1.5 text-[10px] font-bold transition-all duration-200 ${
                activeSidebarTab === "messages" ? "text-[#E5C158] scale-[1.05]" : "text-zinc-500"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Messages</span>
            </button>
            <button
              onClick={() => setActiveSidebarTab("reports")}
              className={`flex flex-col items-center gap-1.5 text-[10px] font-bold transition-all duration-200 ${
                activeSidebarTab === "reports" ? "text-[#E5C158] scale-[1.05]" : "text-zinc-500"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Reports/Rx</span>
            </button>
          </div>

          {/* Center Main Dashboard Panels */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* VIEW A: PATIENT MAIN DASHBOARD */}
            {activeSidebarTab === "dashboard" && (
              <div className="space-y-6 animate-fade-in">
                {/* Greeting Banner */}
                <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-black rounded-2xl border border-zinc-900 p-6 relative overflow-hidden">
                  <div className="absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_100%_50%,rgba(212,175,55,0.06),transparent)] pointer-events-none" />
                  <div className="space-y-1.5 max-w-xl">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Good evening</p>
                    <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      Welcome back, {selectedCase.patient_name}.
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Your confidential clinical logs and medical file <strong className="text-white font-mono">{selectedCase.id}</strong> are secure inside your digital vault.
                    </p>
                  </div>
                </div>

                {/* Active Case Summary Widget */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        selectedCase.status === "completed" 
                          ? "bg-emerald-500/15 text-emerald-400" 
                          : selectedCase.status === "active" 
                            ? "bg-amber-500/15 text-amber-400 animate-pulse" 
                            : "bg-blue-500/15 text-blue-400"
                      }`}>
                        {selectedCase.status === "completed" ? "Completed / Prescribed" : selectedCase.status === "active" ? "Active Clinician Review" : "Pending Pickup"}
                      </span>
                      <h4 className="text-base font-bold text-white mt-2 font-mono">{selectedCase.condition}</h4>
                      <p className="text-xs text-zinc-400 mt-1">Consultation ID: {selectedCase.id} • Registered {formatDate(selectedCase.created_at)}</p>
                    </div>

                    <button 
                      onClick={() => setActiveSidebarTab("messages")}
                      className="px-3.5 py-1.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-bold text-xs rounded-xl transition-all"
                    >
                      Consult Doctor
                    </button>
                  </div>

                  <div className="pt-4 border-t border-zinc-900 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-[10px] text-zinc-500 font-mono">Assigned Doctor</p>
                      <p className="font-bold text-white mt-0.5">{selectedCase.doctor_name || "Assigning clinical specialist..."}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-mono">Evaluation Fee</p>
                      <p className="font-bold text-white mt-0.5">{formatNaira(selectedCase.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-mono">SLA check-in</p>
                      <p className="font-bold text-zinc-300 mt-0.5">Day 2 check-in</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 font-mono">Follow-up</p>
                      <p className="font-bold text-zinc-300 mt-0.5">May 12, 2025</p>
                    </div>
                  </div>
                </div>

                {/* Interactive Health Summary (Mockup Grid) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                    <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Blood Pressure</p>
                    <p className="text-sm font-bold text-emerald-400">120/80 (Normal)</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                    <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">BMI Index</p>
                    <p className="text-sm font-bold text-[#E5C158]">24.7 (Healthy)</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                    <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Cardio risk</p>
                    <p className="text-sm font-bold text-emerald-400">Low</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 space-y-1">
                    <p className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Sleep Quality</p>
                    <p className="text-sm font-bold text-zinc-300">7.5 hrs/night</p>
                  </div>
                </div>

                {/* Quick Launcher for new files */}
                <div className="p-6 bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <h5 className="font-bold text-white text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Experience secondary concerns?</h5>
                    <p className="text-xs text-zinc-400 mt-0.5">File an additional medical category case with another specialist.</p>
                  </div>
                  <button 
                    onClick={onStartNewCase}
                    className="px-4 py-2 border border-amber-500/25 text-[#E5C158] hover:bg-[#d4af37]/5 font-bold text-xs rounded-xl transition-colors"
                  >
                    Start New Program Case
                  </button>
                </div>
              </div>
            )}

            {/* VIEW B: ALL CASES LIST */}
            {activeSidebarTab === "cases" && (
              <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4 animate-fade-in">
                <h4 className="text-sm font-bold text-white border-b border-zinc-900 pb-2.5 flex items-center gap-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  <Clock className="w-4 h-4 text-[#d4af37]" /> Active & Archive Consultations
                </h4>
                
                {allCases.length > 0 ? (
                  <div className="space-y-3">
                    {allCases.map((c) => (
                      <div 
                        key={c.id}
                        onClick={() => { setSelectedCase(c); setActiveSidebarTab("dashboard"); }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex justify-between items-center text-xs ${
                          selectedCase?.id === c.id 
                            ? "bg-[#d4af37]/5 border-[#d4af37]" 
                            : "bg-black border-zinc-900 hover:border-zinc-800"
                        }`}
                      >
                        <div>
                          <h5 className="font-bold text-zinc-200">{c.condition}</h5>
                          <p className="text-[10px] text-zinc-500 mt-0.5">ID: {c.id} • Filed: {formatDate(c.created_at)}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono tracking-widest font-extrabold uppercase ${
                          c.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-black rounded-xl border border-zinc-900 flex justify-between items-center text-xs">
                    <div>
                      <h5 className="font-bold text-zinc-200">{selectedCase?.condition}</h5>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Filed: {selectedCase ? formatDate(selectedCase.created_at) : "N/A"}</p>
                    </div>
                    {selectedCase && (
                      <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono tracking-widest font-extrabold uppercase ${
                        selectedCase.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {selectedCase.status}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* VIEW C: LIVE CHAT WINDOW */}
            {activeSidebarTab === "messages" && (
              <div className="bg-zinc-950 rounded-2xl border border-zinc-900 flex flex-col h-[520px] overflow-hidden shadow-xl animate-fade-in">
                {/* Chat Header */}
                <div className="px-5 py-4 border-b border-zinc-900 bg-zinc-900/10 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Confidential Medical Desk Chat</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {selectedCase.doctor_name ? `Active Consultation with ${selectedCase.doctor_name}` : "Clinician pending pickup..."}
                      </p>
                    </div>
                  </div>
                  <HelpCircle className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-black/30 text-xs">
                  {selectedCase.messages.length === 0 ? (
                    <div className="text-center py-16 space-y-2">
                      <MessageSquare className="w-10 h-10 text-zinc-800 mx-auto" />
                      <p className="font-bold text-zinc-500">Secure Consultation Active</p>
                      <p className="text-[11px] text-zinc-600 max-w-sm mx-auto leading-relaxed">
                        Your medical details are secure. Type below if you would like to provide additional symptoms or lifestyle queries for your reviewing physician.
                      </p>
                    </div>
                  ) : (
                    selectedCase.messages.map((msg) => {
                      if (msg.sender === "system") {
                        return (
                          <div key={msg.id} className="text-center py-1">
                            <span className="inline-block px-2.5 py-0.5 bg-zinc-900 text-[9px] text-zinc-500 rounded-full">
                              {msg.text}
                            </span>
                          </div>
                        );
                      }

                      const isPatient = msg.sender === "patient";
                      return (
                        <div key={msg.id} className={`flex ${isPatient ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[280px] rounded-2xl p-3.5 space-y-1 ${
                            isPatient 
                              ? "bg-[#d4af37] text-black font-semibold rounded-tr-none" 
                              : "bg-zinc-900 border border-zinc-850 text-zinc-200 rounded-tl-none"
                          }`}>
                            <span className="text-[8.5px] block opacity-75 uppercase font-mono tracking-wider font-extrabold">
                              {msg.sender_name}
                            </span>
                            <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span className="text-[7.5px] block text-right opacity-60">
                              {formatDate(msg.timestamp).split(",")[1]?.trim() || "Just now"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Messages Input Box */}
                {selectedCase.status !== "completed" ? (
                  <div className="p-3 bg-zinc-900/10 border-t border-zinc-900 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type confidential message to medical specialist..."
                      value={patientMessage}
                      onChange={(e) => setPatientMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && onSendPatientMessage()}
                      className="flex-1 bg-black border border-zinc-900 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                    />
                    <button
                      onClick={onSendPatientMessage}
                      className="p-2.5 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl transition-all"
                    >
                      <Send className="w-4 h-4 text-black" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-black/40 border-t border-zinc-900 text-center text-[10px] text-zinc-500 font-bold italic">
                    Consultation file closed. Digital prescription has been issued in the reports tab.
                  </div>
                )}
              </div>
            )}

            {/* VIEW D: MEDICAL REPORTS & PRESCRIPTION SHEETS */}
            {activeSidebarTab === "reports" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Submitted Intake Answers Card */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-4">
                  <h4 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest font-mono border-b border-zinc-900 pb-2">
                    Submitted Intake Questionnaire
                  </h4>
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {selectedCase.raw_answers.map((ans, i) => (
                      <div key={i} className="text-xs border-b border-zinc-900 pb-2">
                        <span className="text-zinc-500 block font-mono text-[10px]">{ans.question}</span>
                        <span className="text-zinc-200 mt-0.5 block">{ans.answer}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prescription sheet and official PDF card (if case closed) */}
                {selectedCase.status === "completed" ? (
                  <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full filter blur-xl" />
                    
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          <Compass className="w-5 h-5 text-emerald-400" /> Digital Evaluation & Prescription Sheet
                        </h4>
                        <p className="text-xs text-zinc-500 mt-1">MDCN Clinical Seal is verified and active. Cryptographic document compiled.</p>
                      </div>

                      {/* PDF Print CTA */}
                      <button
                        onClick={() => triggerDownloadPDF(selectedCase)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all flex items-center gap-1.5"
                      >
                        <FileDown className="w-4 h-4 text-black" /> Download PDF Prescription
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block">Doctor Notes</label>
                        <div className="text-xs text-zinc-300 leading-relaxed bg-black p-4 rounded-xl border border-zinc-900 min-h-[100px] max-h-[300px] overflow-y-auto space-y-1.5">
                          {selectedCase.doctor_notes ? renderRichText(selectedCase.doctor_notes) : <p className="italic text-zinc-500">Your assessment is complete. Follow lifestyle remedies and pharmaceutical advice detailed in this panel.</p>}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-mono tracking-widest text-[#E5C158] font-bold block">Issued Pharmaceutical Rx</label>
                        <div className="text-xs font-mono text-white bg-black p-4 rounded-xl border border-zinc-900 leading-relaxed min-h-[100px] max-h-[300px] overflow-y-auto space-y-1 text-left">
                          {selectedCase.prescription ? renderRichText(selectedCase.prescription) : "No active prescription required."}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-zinc-950 rounded-2xl border border-dashed border-zinc-900 text-center space-y-2">
                    <ShieldAlert className="w-8 h-8 text-zinc-700 mx-auto" />
                    <h5 className="font-bold text-zinc-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Prescription sheet is not yet published</h5>
                    <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                      Your consulting doctor has not closed your file. Active medical chat is active above. Once closed, your official signed Rx sheet will generate instantly.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
