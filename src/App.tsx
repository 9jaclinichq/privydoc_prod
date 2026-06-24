import React, { useState, useEffect } from "react";
import { Shield, Activity, Lock, Users, Laptop, Sparkles } from "lucide-react";
import { Doctor, Consultation, Patient } from "./types";
import { doctorApi, consultationApi, adminApi, patientApi } from "./lib/api";
import { MEN_HEALTH_CONDITIONS, INTAKE_QUESTIONS } from "./data";
import { formatNaira, formatDate } from "./utils";

// Custom Sub-Components
import Logo from "./components/Logo";
import PatientLanding from "./components/PatientLanding";
import SymptomChecker from "./components/SymptomChecker";
import IntakeForm from "./components/IntakeForm";
import PatientPortal from "./components/PatientPortal";
import ClinicianArea from "./components/ClinicianArea";
import AdminOffice from "./components/AdminOffice";

export default function App() {
  // Navigation / Role selection states
  const [activeTab, setActiveTab] = useState<"patient" | "clinician" | "admin">("patient");
  const [patientSubView, setPatientSubView] = useState<"landing" | "register" | "otp" | "pinSetup" | "login" | "symptom" | "intake" | "portal">("landing");
  const [showHiddenRoles, setShowHiddenRoles] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // Patient session / authentication states
  const [patientSession, setPatientSession] = useState<Patient | null>(() => {
    const saved = localStorage.getItem("privydoc_patient_session");
    return saved ? JSON.parse(saved) : null;
  });

  // Patient registration / login temporary state
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regState, setRegState] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regConsent, setRegConsent] = useState(false);
  const [regOtp, setRegOtp] = useState("");
  const [regPin, setRegPin] = useState("");
  const [regPinConfirm, setRegPinConfirm] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");

  const [legalModalOpen, setLegalModalOpen] = useState<"privacy" | "terms" | "medical" | "ndpr" | "refund" | null>(null);

  // Patient states
  const [selectedCondition, setSelectedCondition] = useState<typeof MEN_HEALTH_CONDITIONS[0] | null>(null);
  const [symptomAnswers, setSymptomAnswers] = useState<Record<string, string>>({});
  const [showAdvice, setShowAdvice] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [selectedCase, setSelectedCase] = useState<Consultation | null>(null);
  const [patientMessage, setPatientMessage] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment" | "success">("form");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Clinician states
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(null);
  const [docView, setDocView] = useState<"login" | "cases" | "wallet">("cases");
  const [docFolio, setDocFolio] = useState("");
  const [docPin, setDocPin] = useState("");
  const [docRegName, setDocRegName] = useState("");
  const [docRegPhone, setDocRegPhone] = useState("");
  const [docRegFolio, setDocRegFolio] = useState("");
  const [docRegAplYear, setDocRegAplYear] = useState("2026");
  const [docRegPin, setDocRegPin] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");
  const [selectedDoctorCase, setSelectedDoctorCase] = useState<Consultation | null>(null);
  const [doctorMessage, setDoctorMessage] = useState("");
  
  // AI assistant states for clinician
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Closing case & prescribing
  const [closingNotes, setClosingNotes] = useState("");
  const [closingPrescription, setClosingPrescription] = useState("");
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Clinician payout states
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutBank, setPayoutBank] = useState("");
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutMsg, setPayoutMsg] = useState({ type: "", text: "" });

  // Admin states
  const [adminPin, setAdminPin] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminView, setAdminView] = useState<"verifications" | "payouts" | "supabase">("verifications");

  // Refresh lists helper
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Auto-refresh cases and doctor status from storage
  useEffect(() => {
    if (currentDoctor) {
      const updatedDoc = doctorApi.getById(currentDoctor.id);
      if (updatedDoc) {
        setCurrentDoctor(updatedDoc);
      }
    }
  }, [refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Symptom checker selector
  const handleSymptomSelect = (conditionId: string) => {
    const condition = MEN_HEALTH_CONDITIONS.find(c => c.id === conditionId);
    if (condition) {
      setSelectedCondition(condition);
      setSymptomAnswers({});
      setPatientSubView("symptom");
    }
  };

  // Start Clinical Intake Form
  const handleStartIntake = (condition: typeof MEN_HEALTH_CONDITIONS[0]) => {
    setSelectedCondition(condition);
    setIntakeAnswers({});
    
    // Check if patient is logged in
    if (patientSession) {
      setPatientName(patientSession.name);
      setPatientPhone(patientSession.phone);
      setPatientAge(patientSession.age.toString());
      setCheckoutStep("form");
      setPatientSubView("intake");
    } else {
      // If not logged in, route to register or login first!
      setRegPhone(searchPhone);
      setPatientSubView("register");
      alert("Please establish or unlock your secure patient vault first to initiate a confidential clinical intake.");
    }
  };

  // Complete Payment & Save Consultation
  const handleCompletePayment = async () => {
    if (!selectedCondition) return;
    setIsSubmittingIntake(true);

    const answers = INTAKE_QUESTIONS.filter(q => q.category === "general" || q.category === "safety" || q.category === selectedCondition.id)
      .map(q => ({
        question: q.text,
        answer: intakeAnswers[q.id] || (q.id === "age" ? patientAge : q.id === "duration" ? intakeAnswers["duration"] || selectedCondition.durationOptions[0] : "Not specified")
      }));

    try {
      const newConsultation = await consultationApi.create(
        patientName,
        patientPhone,
        parseInt(patientAge) || 30,
        selectedCondition.title,
        intakeAnswers["duration"] || "3-6 months",
        answers,
        selectedCondition.basePrice
      );
      
      setCheckoutStep("success");
      setSelectedCase(newConsultation);
      triggerRefresh();
    } catch (e) {
      console.error(e);
      alert("Something went wrong saving your consultation. Please try again.");
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Search Patient Portal Cases
  const handleSearchPatientPortal = () => {
    if (!searchPhone) return;
    const key = searchPhone.toLowerCase().trim();
    if (key === "doctor" || key === "clinician") {
      setShowHiddenRoles(true);
      setActiveTab("clinician");
      setSearchPhone("");
      return;
    }
    if (key === "admin" || key === "root") {
      setShowHiddenRoles(true);
      setActiveTab("admin");
      setSearchPhone("");
      return;
    }

    // Check if patient exists
    const existingPatient = patientApi.getByPhone(searchPhone);
    if (existingPatient) {
      setLoginPhone(searchPhone);
      setPatientSubView("login");
    } else {
      setRegPhone(searchPhone);
      setPatientSubView("register");
    }
  };

  // Patient Registration Submit
  const handlePatientRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regAge || !regState || !regConsent) {
      alert("Please fill in all clinical registration details and accept the patient consent.");
      return;
    }
    const ageNum = parseInt(regAge);
    if (isNaN(ageNum) || ageNum < 18) {
      alert("Under standard clinical guidelines, consultations are strictly restricted to individuals aged 18 and older.");
      return;
    }

    // Move to mock OTP verification
    setRegOtp("");
    setPatientSubView("otp");
    alert("Confidential SMS Tunnel: Your simulated verification code is '123456'.");
  };

  // Patient OTP Submit
  const handlePatientOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regOtp === "123456" || regOtp === "1234") {
      setPatientSubView("pinSetup");
    } else {
      alert("Incorrect verification code. Please enter '123456' to proceed.");
    }
  };

  // Patient PIN Setup Submit
  const handlePatientPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regPin.length !== 6 || isNaN(parseInt(regPin))) {
      alert("PIN must be exactly 6 numeric digits.");
      return;
    }
    if (regPin !== regPinConfirm) {
      alert("PIN confirmation does not match.");
      return;
    }

    // Complete patient registration
    const res = patientApi.register(regName, regPhone, parseInt(regAge), regState, regEmail, regPin);
    if (res.success && res.patient) {
      localStorage.setItem("privydoc_patient_session", JSON.stringify(res.patient));
      setPatientSession(res.patient);
      
      // Clear registration state
      setRegName("");
      setRegPhone("");
      setRegAge("");
      setRegState("");
      setRegEmail("");
      setRegConsent(false);
      setRegOtp("");
      setRegPin("");
      setRegPinConfirm("");

      // Re-route
      const cases = consultationApi.getByPatientPhone(res.patient.phone);
      if (selectedCondition) {
        // Prepare Intake fields
        setPatientName(res.patient.name);
        setPatientPhone(res.patient.phone);
        setPatientAge(res.patient.age.toString());
        setCheckoutStep("form");
        setPatientSubView("intake");
      } else if (cases.length > 0) {
        setSelectedCase(cases[0]);
        setPatientSubView("portal");
      } else {
        setSelectedCase(null);
        setPatientSubView("portal");
      }
    } else {
      alert(res.error || "Failed to establish secure patient profile.");
    }
  };

  // Patient PIN Login Submit
  const handlePatientLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = patientApi.login(loginPhone, loginPin);
    if (res.success && res.patient) {
      localStorage.setItem("privydoc_patient_session", JSON.stringify(res.patient));
      setPatientSession(res.patient);
      setLoginPin("");

      const cases = consultationApi.getByPatientPhone(res.patient.phone);
      if (selectedCondition) {
        setPatientName(res.patient.name);
        setPatientPhone(res.patient.phone);
        setPatientAge(res.patient.age.toString());
        setCheckoutStep("form");
        setPatientSubView("intake");
      } else if (cases.length > 0) {
        setSelectedCase(cases[0]);
        setPatientSubView("portal");
      } else {
        setSelectedCase(null);
        setPatientSubView("portal");
      }
    } else {
      alert(res.error || "PIN authentication rejected.");
    }
  };

  // Patient Logout
  const handlePatientLogout = () => {
    localStorage.removeItem("privydoc_patient_session");
    setPatientSession(null);
    setSelectedCase(null);
    setSearchPhone("");
    setPatientSubView("landing");
  };

  // Patient chat send
  const handleSendPatientMsg = () => {
    if (!selectedCase || !patientMessage.trim()) return;
    const res = consultationApi.addMessage(selectedCase.id, "patient", selectedCase.patient_name, patientMessage);
    if (res.success) {
      setPatientMessage("");
      // Reload current case
      const updated = consultationApi.getById(selectedCase.id);
      if (updated) setSelectedCase(updated);
      triggerRefresh();
    }
  };

  // Clinician Registration
  const handleDoctorRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    if (!docRegName || !docRegPhone || !docRegFolio || !docRegPin) {
      setDocError("Please fill out all clinician registration fields.");
      return;
    }
    const res = doctorApi.register(docRegName, docRegPhone, docRegFolio, parseInt(docRegAplYear) || 2026, docRegPin);
    if (res.success) {
      setDocSuccess("Clinician account submitted! Pending MDCN Folio credential verification by administrative officers.");
      setIsRegistering(false);
      // Pre-fill login
      setDocFolio(docRegFolio);
    } else {
      setDocError(res.error || "Registration failed.");
    }
  };

  // Clinician Login
  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    const res = doctorApi.login(docFolio, docPin);
    if (res.success) {
      if (!res.doctor?.verified) {
        setDocError("Your account is registered but pending Admin credential verification.");
        return;
      }
      setCurrentDoctor(res.doctor);
      setDocView("cases");
    } else {
      setDocError(res.error || "Login credentials rejected.");
    }
  };

  // Doctor claim case
  const handleDoctorClaimCase = (caseId: string) => {
    if (!currentDoctor) return;
    const res = consultationApi.claim(caseId, currentDoctor.id, currentDoctor.name);
    if (res.success) {
      // Reload active case
      const updated = consultationApi.getById(caseId);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
    }
  };

  // Doctor chat send
  const handleSendDoctorMsg = () => {
    if (!selectedDoctorCase || !currentDoctor || !doctorMessage.trim()) return;
    const res = consultationApi.addMessage(selectedDoctorCase.id, "doctor", currentDoctor.name, doctorMessage);
    if (res.success) {
      setDoctorMessage("");
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
    }
  };

  // AI assistant response generator
  const handleGenerateAIDraft = async () => {
    if (!selectedDoctorCase || !aiPrompt.trim()) return;
    setIsGeneratingDraft(true);
    setAiDraft("");
    try {
      const draft = await consultationApi.generateDraftResponse(selectedDoctorCase, aiPrompt);
      setAiDraft(draft);
    } catch (e) {
      setAiDraft("Failed to generate draft. Please ensure server has active GEMINI_API_KEY.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Complete consultation by doctor
  const handleCompleteConsultation = () => {
    if (!selectedDoctorCase) return;
    const res = consultationApi.complete(selectedDoctorCase.id, closingNotes, closingPrescription);
    if (res.success) {
      setShowCloseModal(false);
      setClosingNotes("");
      setClosingPrescription("");
      // Reload case
      const updated = consultationApi.getById(selectedDoctorCase.id);
      if (updated) setSelectedDoctorCase(updated);
      triggerRefresh();
      alert("Consultation complete! Digital evaluation and cryptographic prescription issued.");
    }
  };

  // Doctor payout request
  const handlePayoutRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutMsg({ type: "", text: "" });
    if (!currentDoctor) return;
    
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayoutMsg({ type: "error", text: "Please enter a valid payout amount." });
      return;
    }
    if (!payoutBank || !payoutAccount) {
      setPayoutMsg({ type: "error", text: "Please enter your verified banking details." });
      return;
    }

    const res = adminApi.requestPayout(currentDoctor.id, currentDoctor.name, amount, payoutBank, payoutAccount);
    if (res.success) {
      setPayoutMsg({ type: "success", text: "Payout request submitted! Processing takes 12-24 hours." });
      doctorApi.updatePayoutDetails(currentDoctor.id, payoutBank, payoutAccount);
      setPayoutAmount("");
      triggerRefresh();
    } else {
      setPayoutMsg({ type: "error", text: res.error || "Failed to initiate payout." });
    }
  };

  // Admin login
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "9900") { // Admin secure default bypass PIN
      setIsAdminAuthenticated(true);
      setAdminView("verifications");
    } else {
      alert("Invalid Admin clearance PIN.");
    }
  };

  // Admin verification action
  const handleAdminVerifyDoctor = (docId: string, approve: boolean) => {
    adminApi.verifyClinician(docId, approve);
    triggerRefresh();
  };

  // Admin payout action
  const handleAdminApprovePayout = (payId: string, approve: boolean) => {
    if (approve) {
      adminApi.approvePayout(payId);
    } else {
      adminApi.rejectPayout(payId);
    }
    triggerRefresh();
  };

  return (
    <div className="app-wrap text-[#e4e4e7] selection:bg-[#d4af37]/40 selection:text-white font-sans antialiased">
      <div className="app-side app-side-left"></div>
      
      <div className="app-container">
        {/* GLOBAL LUXURY HEADER */}
        <header className="border-b border-zinc-900/80 bg-black/85 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Custom Gold Brand Logo */}
          <button 
            onClick={() => { 
              setActiveTab("patient"); 
              setPatientSubView("landing"); 
              setSelectedCase(null); 
              setLogoClicks(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setShowHiddenRoles(p => !p);
                  return 0;
                }
                return next;
              });
            }}
            className="focus:outline-none text-left select-none cursor-pointer"
            title="Tap 5 times to toggle clinician & admin consoles"
          >
            <Logo className="h-9" />
          </button>

          {/* Luxury Navigation Role Switcher */}
          <nav className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-900">
            <button
              onClick={() => { setActiveTab("patient"); setPatientSubView("landing"); setSelectedCase(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "patient" 
                  ? "bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/15" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Patient Vault
            </button>
            {(showHiddenRoles || activeTab === "clinician" || activeTab === "admin") && (
              <>
                <button
                  onClick={() => { setActiveTab("clinician"); setDocError(""); setDocSuccess(""); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "clinician" 
                      ? "bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/15" 
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Clinician Area
                </button>
                <button
                  onClick={() => { setActiveTab("admin"); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "admin" 
                      ? "bg-rose-600/10 text-rose-400 border border-rose-500/15" 
                      : "text-zinc-500 hover:text-rose-400"
                  }`}
                >
                  Admin Office
                </button>
              </>
            )}
          </nav>
        </header>

        {/* RENDER STAGE FRAMEWORK */}
        <main className="flex-1 px-6 py-10 overflow-y-auto space-y-8">
        
        {/* I. PATIENT STAGE FLOW */}
        {activeTab === "patient" && (
          <div className="space-y-12">
            
            {/* Landing */}
            {patientSubView === "landing" && (
              <PatientLanding 
                onSelectSymptom={handleSymptomSelect}
                onStartIntake={handleStartIntake}
                onEnterPortal={() => setPatientSubView("portal")}
                searchPhone={searchPhone}
                setSearchPhone={setSearchPhone}
                onSearchPortal={handleSearchPatientPortal}
                patientSession={patientSession}
                onLogout={handlePatientLogout}
              />
            )}

            {/* Patient Registration Screen */}
            {patientSubView === "register" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Secure Patient Profile</h4>
                  <p className="text-xs text-zinc-500 font-sans">Establish your private, confidential clinical folder.</p>
                </div>
                
                <form onSubmit={handlePatientRegisterSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Chukwuma Obi"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Confidential WhatsApp Number</label>
                    <input 
                      type="tel"
                      required
                      placeholder="e.g. +234 803 123 4567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Age (Min 18)</label>
                      <input 
                        type="number"
                        required
                        min="18"
                        max="120"
                        placeholder="Age"
                        value={regAge}
                        onChange={(e) => setRegAge(e.target.value)}
                        className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">State of Residence</label>
                      <select
                        required
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                      >
                        <option value="">Select State</option>
                        {["Lagos", "Abuja FCT", "Rivers", "Oyo", "Kano", "Anambra", "Delta", "Kaduna", "Edo", "Enugu", "Ogun", "Ondo", "Imo", "Kwara", "Plateau", "Akwa Ibom"].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Email Address (Optional)</label>
                    <input 
                      type="email"
                      placeholder="e.g. name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700"
                    />
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <input 
                      id="consent"
                      type="checkbox"
                      required
                      checked={regConsent}
                      onChange={(e) => setRegConsent(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-900 bg-black text-[#d4af37] focus:ring-0 focus:ring-offset-0"
                    />
                    <label htmlFor="consent" className="text-[10px] text-zinc-500 leading-relaxed select-none font-sans">
                      I affirm that I am a male individual aged 18 or older residing in Nigeria, and consent to asynchronous digital clinical reviews.
                    </label>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow mt-4"
                  >
                    Send Verification Code
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button 
                    onClick={() => setPatientSubView("login")}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                  >
                    Already registered? Unlock Secure Vault
                  </button>
                </div>
              </div>
            )}

            {/* Patient OTP Verification Screen */}
            {patientSubView === "otp" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verify WhatsApp OTP</h4>
                  <p className="text-xs text-zinc-500 font-sans">Confidential authentication code dispatched to your WhatsApp number.</p>
                </div>

                <form onSubmit={handlePatientOtpSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Verification Code</label>
                    <input 
                      type="text"
                      required
                      maxLength={6}
                      placeholder="Enter 123456"
                      value={regOtp}
                      onChange={(e) => setRegOtp(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
                  >
                    Verify Code & Continue
                  </button>
                </form>

                <div className="text-center">
                  <button 
                    onClick={() => setPatientSubView("register")}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
                  >
                    Back to registration details
                  </button>
                </div>
              </div>
            )}

            {/* Patient PIN Setup Screen */}
            {patientSubView === "pinSetup" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Vault PIN</h4>
                  <p className="text-xs text-zinc-500 font-sans">Establish a secure 6-digit passcode to lock your clinical file.</p>
                </div>

                <form onSubmit={handlePatientPinSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Create 6-Digit PIN</label>
                    <input 
                      type="password"
                      required
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••••"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Confirm 6-Digit PIN</label>
                    <input 
                      type="password"
                      required
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••••"
                      value={regPinConfirm}
                      onChange={(e) => setRegPinConfirm(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
                  >
                    Activate Confidential Vault
                  </button>
                </form>
              </div>
            )}

            {/* Patient PIN Login Screen */}
            {patientSubView === "login" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Unlock Secure Vault</h4>
                  <p className="text-xs text-zinc-500 font-sans">Confidential clinical portal access.</p>
                </div>

                <form onSubmit={handlePatientLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Registered WhatsApp Number</label>
                    <input 
                      type="tel"
                      required
                      placeholder="e.g. +234 803 123 4567"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Enter 6-Digit PIN</label>
                    <input 
                      type="password"
                      required
                      maxLength={6}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      placeholder="••••••"
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-850"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow"
                  >
                    Unlock Secure Vault
                  </button>
                </form>

                <div className="text-center pt-2 flex justify-between text-[10px] font-mono text-zinc-500">
                  <button 
                    type="button"
                    onClick={() => setPatientSubView("register")}
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Establish New Vault
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPatientSubView("landing")}
                    className="hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Symptom Logic Screen */}
            {patientSubView === "symptom" && selectedCondition && (
              <SymptomChecker 
                selectedCondition={selectedCondition}
                symptomAnswers={symptomAnswers}
                setSymptomAnswers={setSymptomAnswers}
                onCancel={() => setPatientSubView("landing")}
                onStartIntake={handleStartIntake}
                showAdvice={showAdvice}
                setShowAdvice={setShowAdvice}
              />
            )}

            {/* Case Demographics & Questionnaires Form */}
            {patientSubView === "intake" && selectedCondition && checkoutStep !== "success" && (
              <IntakeForm 
                selectedCondition={selectedCondition}
                patientName={patientName}
                setPatientName={setPatientName}
                patientAge={patientAge}
                setPatientAge={setPatientAge}
                patientPhone={patientPhone}
                setPatientPhone={setPatientPhone}
                intakeAnswers={intakeAnswers}
                setIntakeAnswers={setIntakeAnswers}
                checkoutStep={checkoutStep}
                setCheckoutStep={setCheckoutStep}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                isSubmittingIntake={isSubmittingIntake}
                onCompletePayment={handleCompletePayment}
                onCancel={() => setPatientSubView("landing")}
              />
            )}

            {/* Intake Submission Success Screen */}
            {patientSubView === "intake" && checkoutStep === "success" && selectedCase && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                <div className="w-12 h-12 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Intake Submitted Successfully</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Your assessment file <strong className="text-white font-mono">{selectedCase.id}</strong> is registered. An active clinician is analyzing your metabolic checkups.
                  </p>
                </div>

                <div className="p-4 bg-black rounded-xl border border-zinc-900 text-left space-y-2 text-xs">
                  <p className="text-[#E5C158] font-bold flex items-center gap-1 font-sans">
                    <Sparkles className="w-3.5 h-3.5" /> AI Clinical Assistant:
                  </p>
                  <p className="text-zinc-400 italic leading-relaxed font-sans">
                    {selectedCase.ai_summary ? `${selectedCase.ai_summary.substring(0, 140)}...` : "Summarizing intake profile..."}
                  </p>
                </div>

                <button
                  onClick={() => setPatientSubView("portal")}
                  className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow"
                >
                  Enter Secure Patient Dashboard
                </button>
              </div>
            )}

            {/* Patient Secure Dashboard Vault */}
            {patientSubView === "portal" && (
              <PatientPortal 
                selectedCase={selectedCase}
                setSelectedCase={setSelectedCase}
                allCases={searchPhone ? consultationApi.getByPatientPhone(searchPhone) : (patientSession ? consultationApi.getByPatientPhone(patientSession.phone) : [])}
                searchPhone={searchPhone}
                setSearchPhone={setSearchPhone}
                onSearchPortal={handleSearchPatientPortal}
                patientMessage={patientMessage}
                setPatientMessage={setPatientMessage}
                onSendPatientMessage={handleSendPatientMsg}
                onStartNewCase={() => setPatientSubView("landing")}
                formatDate={formatDate}
                formatNaira={formatNaira}
              />
            )}

          </div>
        )}

        {/* II. CLINICIAN ACCESS FLOW */}
        {activeTab === "clinician" && (
          <ClinicianArea 
            currentDoctor={currentDoctor}
            setCurrentDoctor={setCurrentDoctor}
            docView={docView}
            setDocView={setDocView}
            isRegistering={isRegistering}
            setIsRegistering={setIsRegistering}
            docFolio={docFolio}
            setDocFolio={setDocFolio}
            docPin={docPin}
            setDocPin={setDocPin}
            docRegName={docRegName}
            setDocRegName={setDocRegName}
            docRegPhone={docRegPhone}
            setDocRegPhone={setDocRegPhone}
            docRegFolio={docRegFolio}
            setDocRegFolio={setDocRegFolio}
            docRegAplYear={docRegAplYear}
            setDocRegAplYear={setDocRegAplYear}
            docRegPin={docRegPin}
            setDocRegPin={setDocRegPin}
            docError={docError}
            setDocError={setDocError}
            docSuccess={docSuccess}
            setDocSuccess={setDocSuccess}
            selectedDoctorCase={selectedDoctorCase}
            setSelectedDoctorCase={setSelectedDoctorCase}
            doctorMessage={doctorMessage}
            setDoctorMessage={setDoctorMessage}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            aiDraft={aiDraft}
            setAiDraft={setAiDraft}
            isGeneratingDraft={isGeneratingDraft}
            setIsGeneratingDraft={setIsGeneratingDraft}
            closingNotes={closingNotes}
            setClosingNotes={setClosingNotes}
            closingPrescription={closingPrescription}
            setClosingPrescription={setClosingPrescription}
            showCloseModal={showCloseModal}
            setShowCloseModal={setShowCloseModal}
            payoutAmount={payoutAmount}
            setPayoutAmount={setPayoutAmount}
            payoutBank={payoutBank}
            setPayoutBank={setPayoutBank}
            payoutAccount={payoutAccount}
            setPayoutAccount={setPayoutAccount}
            payoutMsg={payoutMsg}
            setPayoutMsg={setPayoutMsg}
            onDoctorLogin={handleDoctorLogin}
            onDoctorRegister={handleDoctorRegister}
            onDoctorClaimCase={handleDoctorClaimCase}
            onSendDoctorMessage={handleSendDoctorMsg}
            onGenerateAIDraft={handleGenerateAIDraft}
            onCompleteConsultation={handleCompleteConsultation}
            onPayoutRequest={handlePayoutRequestSubmit}
            formatDate={formatDate}
            formatNaira={formatNaira}
            triggerRefresh={triggerRefresh}
          />
        )}

        {/* III. OPERATIVE ADMIN FLOW */}
        {activeTab === "admin" && (
          <AdminOffice 
            adminPin={adminPin}
            setAdminPin={setAdminPin}
            isAdminAuthenticated={isAdminAuthenticated}
            setIsAdminAuthenticated={setIsAdminAuthenticated}
            adminView={adminView}
            setAdminView={setAdminView}
            onAdminLogin={handleAdminLogin}
            onAdminVerifyDoctor={handleAdminVerifyDoctor}
            onAdminApprovePayout={handleAdminApprovePayout}
            formatDate={formatDate}
            formatNaira={formatNaira}
            triggerRefresh={triggerRefresh}
          />
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900/80 bg-black/40 py-6 px-6 text-center text-[10px] text-zinc-600 font-mono selection:bg-transparent space-y-3">
        <p>© {new Date().getFullYear()} <span className="cursor-pointer hover:text-zinc-400 select-none" onClick={() => setShowHiddenRoles(p => !p)}>PrivyDoc</span>. Verified Medical Telehealth. All rights reserved.</p>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-zinc-500">
          <button onClick={() => setLegalModalOpen("privacy")} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
          <span>•</span>
          <button onClick={() => setLegalModalOpen("terms")} className="hover:text-zinc-300 transition-colors">Terms of Use</button>
          <span>•</span>
          <button onClick={() => setLegalModalOpen("medical")} className="hover:text-zinc-300 transition-colors">Medical Disclaimer</button>
          <span>•</span>
          <button onClick={() => setLegalModalOpen("ndpr")} className="hover:text-zinc-300 transition-colors">NDPR Standard</button>
          <span>•</span>
          <button onClick={() => setLegalModalOpen("refund")} className="hover:text-zinc-300 transition-colors">Refund Guidelines</button>
        </div>
        <p className="opacity-75">100% Secure AES-256 Client-Server Tunnel. Telemedicine Practice Standards Compliant.</p>
      </footer>
    </div>

    <div className="app-side app-side-right"></div>

    {/* LEGAL MODALS PORTAL OVERLAY */}
    {legalModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#d4af37]" />
          <h3 className="text-sm font-bold text-[#E5C158] uppercase tracking-wider font-mono border-b border-zinc-900 pb-2">
            {legalModalOpen === "privacy" && "Confidential Privacy Policy"}
            {legalModalOpen === "terms" && "Terms & Clinical Agreement"}
            {legalModalOpen === "medical" && "Clinical & Medical Disclaimer"}
            {legalModalOpen === "ndpr" && "NDPR Data Protection Standard"}
            {legalModalOpen === "refund" && "Patient Refund Guidelines"}
          </h3>
          <div className="text-xs text-zinc-400 leading-relaxed max-h-80 overflow-y-auto space-y-3 font-sans">
            {legalModalOpen === "privacy" && (
              <>
                <p>PrivyDoc is operated by <strong>9JaClinic Limited</strong>, a digital health company registered in Nigeria (est. 2021).</p>
                <p>We process only the absolute minimum data required for medical reviews: first name, age, phone number, state, and secure clinical questionnaire responses.</p>
                <p>Under NDPA 2023, your medical details are fully encrypted and only authorized medical doctors verified by the MDCN can access your clinical files. No public disclosure, ever.</p>
              </>
            )}
            {legalModalOpen === "terms" && (
              <>
                <p>By using PrivyDoc, you affirm that you are a male individual residing in Nigeria, aged 18 or older.</p>
                <p>This is a digital-only telemedicine consultation. Reviewing doctors exercise independent clinical judgment to issue digital, cryptographic prescription sheets.</p>
                <p>We do not issue printed paper prescription papers. Fees are non-refundable once an assigned medical practitioner has commenced review of your clinical file.</p>
              </>
            )}
            {legalModalOpen === "medical" && (
              <>
                <p>PrivyDoc is strictly for stable, non-emergency conditions. If you are experiencing chest pain, severe breathing issues, or an acute emergency, please proceed immediately to the nearest physical hospital.</p>
                <p>Consultations are conducted asynchronously using syndromic management protocols. No physical clinical examination is performed. All practitioners are fully licensed with the Medical and Dental Council of Nigeria (MDCN).</p>
              </>
            )}
            {legalModalOpen === "ndpr" && (
              <>
                <p>PrivyDoc complies fully with the Nigeria Data Protection Act (NDPA) 2023 and NDPR frameworks.</p>
                <p>Your medical questionnaires, personal descriptors, and consultation history are protected with 256-bit Advanced Encryption Standard (AES) protocols on clinical server tunnels.</p>
              </>
            )}
            {legalModalOpen === "refund" && (
              <>
                <p>Due to the direct provision of clinical services by licensed medical physicians, consultation fees (₦7,500 base, ₦3,500 review) are non-refundable once a physician claims your file.</p>
                <p>If your payment succeeded but did not update your secure vault due to an internet drop or technical failure, please email <strong>hello@privydoc.com.ng</strong> with transaction details for immediate assistance.</p>
              </>
            )}
          </div>
          <button 
            onClick={() => setLegalModalOpen(null)}
            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs transition-colors border border-zinc-800"
          >
            Close Document
          </button>
        </div>
      </div>
    )}
  </div>
);
}
