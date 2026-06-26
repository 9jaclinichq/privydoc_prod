import React, { useState, useEffect } from "react";
import { Shield, Activity, Lock, Users, Laptop, Sparkles, ArrowLeft, HelpCircle, Info, Bell, MapPin, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Doctor, Consultation, Patient } from "./types";
import { doctorApi, consultationApi, adminApi, patientApi, pricingApi } from "./lib/api";
import { MEN_HEALTH_CONDITIONS, INTAKE_QUESTIONS } from "./data";
import { formatNaira, formatDate } from "./utils";

// Custom Sub-Components
import Logo from "./components/Logo";
import PatientLanding from "./components/PatientLanding";
import SymptomChecker from "./components/SymptomChecker";
import IntakeForm from "./components/IntakeForm";
import PatientPortal from "./components/PatientPortal";
import { validateTemplatePlaceholders } from "./templates";

const ClinicianArea = React.lazy(() => import("./components/ClinicianArea"));
const AdminOffice = React.lazy(() => import("./components/AdminOffice"));

export default function App() {
  // Navigation / Role selection states
  const [activeTab, setActiveTab] = useState<"patient" | "clinician" | "admin">("patient");
  const [patientSubView, setPatientSubView] = useState<"landing" | "register" | "otp" | "pinSetup" | "login" | "symptom" | "intake" | "portal">("landing");
  const [showHiddenRoles, setShowHiddenRoles] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  // Compliance and Alert Pre-Permissions states
  const [permissionModal, setPermissionModal] = useState<"location" | "notifications" | null>(null);
  const [pendingCondition, setPendingCondition] = useState<typeof MEN_HEALTH_CONDITIONS[0] | null>(null);

  // Patient session / authentication states
  const [patientSession, setPatientSession] = useState<Patient | null>(() => {
    try {
      const saved = localStorage.getItem("privydoc_patient_session");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse patient session from localStorage", e);
      return null;
    }
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

  // Patient secure PIN recovery/forgot states
  const [patientForgotMode, setPatientForgotMode] = useState<"none" | "phone" | "verify">("none");
  const [patientForgotPhone, setPatientForgotPhone] = useState("");
  const [patientForgotOtp, setPatientForgotOtp] = useState("");
  const [patientForgotNewPin, setPatientForgotNewPin] = useState("");
  const [patientForgotNewPinConfirm, setPatientForgotNewPinConfirm] = useState("");
  const [isPatientForgotSending, setIsPatientForgotSending] = useState(false);

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
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment" | "success" | "red_flag">("form");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Clinician states
  const [currentDoctor, setCurrentDoctor] = useState<Doctor | null>(() => {
    try {
      const saved = localStorage.getItem("privydoc_doctor_session");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse clinician session from localStorage", e);
      return null;
    }
  });
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("privydoc_admin_session") === "true";
  });
  const [adminView, setAdminView] = useState<"verifications" | "payouts" | "supabase" | "pricing">("verifications");

  // Inactivity & Success Screen Countdown states
  const [isPatientSessionLocked, setIsPatientSessionLocked] = useState(false);
  const [unlockPin, setUnlockPin] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [successCountdown, setSuccessCountdown] = useState(5);

  // Refresh lists helper
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Floating Navigation Scroll States
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-refresh cases and doctor status from storage
  useEffect(() => {
    if (currentDoctor) {
      const updatedDoc = doctorApi.getById(currentDoctor.id);
      if (updatedDoc) {
        setCurrentDoctor(updatedDoc);
      }
    }
  }, [refreshTrigger]);

  // Synchronize doctor session with localStorage
  useEffect(() => {
    if (currentDoctor) {
      localStorage.setItem("privydoc_doctor_session", JSON.stringify(currentDoctor));
    } else {
      localStorage.removeItem("privydoc_doctor_session");
    }
  }, [currentDoctor]);

  // Synchronize admin session with localStorage
  useEffect(() => {
    if (isAdminAuthenticated) {
      localStorage.setItem("privydoc_admin_session", "true");
    } else {
      localStorage.removeItem("privydoc_admin_session");
    }
  }, [isAdminAuthenticated]);

  // Scroll to top on view or tab transition to ensure pages land fully scrolled up
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab, patientSubView]);

  // Routing on mount & priority checks
  useEffect(() => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (hash === "#admin" || path === "/admin") {
      setActiveTab("admin");
      setShowHiddenRoles(true);
    } else if (path === "/doctor" || hash === "#doctor" || hash === "#clinician") {
      setActiveTab("clinician");
      setShowHiddenRoles(true);
    } else {
      // Priority: admin > doctor > patient
      const adminSessionSaved = localStorage.getItem("privydoc_admin_session") === "true";
      const doctorSessionSaved = localStorage.getItem("privydoc_doctor_session");
      const patientSessionSaved = localStorage.getItem("privydoc_patient_session");

      if (adminSessionSaved) {
        setActiveTab("admin");
        setShowHiddenRoles(true);
      } else if (doctorSessionSaved) {
        setActiveTab("clinician");
        setShowHiddenRoles(true);
      } else if (patientSessionSaved) {
        setActiveTab("patient");
      }
    }
  }, []);

  // Inactivity / Background TTL Lock (30 minutes)
  useEffect(() => {
    if (!patientSession) return;

    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes

    const updateActivity = () => {
      if (!isPatientSessionLocked) {
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      }
    };

    const checkInactivity = () => {
      const lastActive = localStorage.getItem("privydoc_patient_last_active");
      if (lastActive) {
        const diff = Date.now() - parseInt(lastActive);
        if (diff > INACTIVITY_LIMIT) {
          setIsPatientSessionLocked(true);
        }
      } else {
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      }
    };

    // Listen to user interactions
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);
    window.addEventListener("scroll", updateActivity);
    // Listen to window focus (returning from background)
    window.addEventListener("focus", checkInactivity);

    // Initial check and periodic check
    checkInactivity();
    const interval = setInterval(checkInactivity, 30 * 1000); // Check every 30 seconds

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
      window.removeEventListener("scroll", updateActivity);
      window.removeEventListener("focus", checkInactivity);
      clearInterval(interval);
    };
  }, [patientSession, isPatientSessionLocked]);

  // Success page redirect countdown
  useEffect(() => {
    if (patientSubView === "intake" && checkoutStep === "success") {
      setSuccessCountdown(5);
      const timer = setInterval(() => {
        setSuccessCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPatientSubView("portal");
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [patientSubView, checkoutStep]);

  // Synchronize state with browser history for back button navigation
  useEffect(() => {
    // Push initial state
    if (!window.history.state) {
      window.history.replaceState({ activeTab, patientSubView, selectedCaseId: selectedCase?.id, docView, adminView }, "");
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const state = event.state;
        if (state.activeTab) setActiveTab(state.activeTab);
        if (state.patientSubView) setPatientSubView(state.patientSubView);
        if (state.docView) setDocView(state.docView);
        if (state.adminView) setAdminView(state.adminView);
        if (state.selectedCaseId) {
          const c = consultationApi.getById(state.selectedCaseId);
          if (c) setSelectedCase(c);
        } else {
          setSelectedCase(null);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Whenever key navigation state changes, push state to history
  useEffect(() => {
    const currentState = window.history.state;
    const stateMatches = currentState &&
      currentState.activeTab === activeTab &&
      currentState.patientSubView === patientSubView &&
      currentState.selectedCaseId === selectedCase?.id &&
      currentState.docView === docView &&
      currentState.adminView === adminView;

    if (!stateMatches) {
      window.history.pushState({
        activeTab,
        patientSubView,
        selectedCaseId: selectedCase?.id,
        docView,
        adminView
      }, "");
    }
  }, [activeTab, patientSubView, selectedCase?.id, docView, adminView]);

  // Prevent accidental browser exit when in the middle of an intake form or active consultation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isFillingIntake = activeTab === "patient" && patientSubView === "intake" && checkoutStep !== "success";
      const isClinicianActive = activeTab === "clinician" && currentDoctor && selectedDoctorCase && selectedDoctorCase.status !== "completed";
      
      if (isFillingIntake || isClinicianActive) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to exit?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [activeTab, patientSubView, checkoutStep, currentDoctor, selectedDoctorCase]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const switchRoleSafely = (targetRole: "patient" | "clinician" | "admin", successAction: () => void) => {
    if (targetRole === activeTab) {
      successAction();
      return;
    }
    if (patientSession && activeTab === "patient") {
      alert("Active Patient Session: Please sign out of your Patient secure vault first to switch roles.");
      return;
    }
    if (currentDoctor && activeTab === "clinician") {
      alert("Active Clinician Session: Please sign out of your workstation first to switch roles.");
      return;
    }
    if (isAdminAuthenticated && activeTab === "admin") {
      alert("Active Admin Session: Please sign out of the Admin Office first to switch roles.");
      return;
    }
    successAction();
  };

  // Symptom checker selector
  const handleSymptomSelect = (conditionId: string) => {
    const condition = MEN_HEALTH_CONDITIONS.find(c => c.id === conditionId);
    if (condition) {
      setSelectedCondition(condition);
      setSymptomAnswers({});
      setPatientSubView("symptom");
    }
  };

  // Start Clinical Intake Form (triggers compliance pre-permission)
  const handleStartIntake = (condition: typeof MEN_HEALTH_CONDITIONS[0]) => {
    setPendingCondition(condition);
    setPermissionModal("location");
  };

  const proceedWithIntake = (condition: typeof MEN_HEALTH_CONDITIONS[0]) => {
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

  // Complete Payment & Save Consultation using real Flutterwave gateway
  const handleCompletePayment = async () => {
    if (!selectedCondition) return;
    setIsSubmittingIntake(true);

    const answers = INTAKE_QUESTIONS.filter(q => q.category === "general" || q.category === "safety" || q.category === selectedCondition.id)
      .map(q => ({
        question: q.text,
        answer: intakeAnswers[q.id] || (q.id === "age" ? patientAge : q.id === "duration" ? intakeAnswers["duration"] || selectedCondition.durationOptions[0] : "Not specified")
      }));

    const amount = pricingApi.getById("base_consultation")?.price ?? 7500;
    const tx_ref = `pd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const flwPublicKey = (import.meta as any).env?.VITE_FLW_PUBLIC_KEY || "FLWPUBK_TEST-9bbfffa3e76a6cfb9fa490b7936a7985-X";

    const customerEmail = localStorage.getItem("privydoc_patient_email") || `${patientPhone}@privydoc.com.ng`;

    // Open Flutterwave Checkout
    if (typeof (window as any).FlutterwaveCheckout === "function") {
      (window as any).FlutterwaveCheckout({
        public_key: flwPublicKey,
        tx_ref,
        amount,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd",
        customer: {
          email: customerEmail,
          phone_number: patientPhone,
          name: patientName,
        },
        customizations: {
          title: "PrivyDoc Nigeria",
          description: `Telehealth Consultation - ${selectedCondition.title}`,
          logo: "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE_sQb7BdupWIHOsK8rFyescGBIm0uzBIaRznUP7VGfzjICziVOWkNTZBqIt-t3HGbVcIOu5rl9QDV8XwK3KKUqiLc81E3qfvATTD8QhwgPjOPx"
        },
        callback: async (response: any) => {
          const transaction_id = response.transaction_id || response.id;
          
          try {
            // Verify payment server-side
            const res = await fetch("/api/payment/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                transaction_id,
                tx_ref,
                amount,
                payment_type: "new",
                patient_phone: patientPhone,
                patient_name: patientName,
                patient_age: parseInt(patientAge) || 30,
                condition_title: selectedCondition.title,
                duration: intakeAnswers["duration"] || "3-6 months",
                raw_answers: answers
              })
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.message || "Server verification of transaction failed.");
            }

            const data = await res.json();
            if (data.ok && data.consultation) {
              // Save to LocalStorage list to sync client state
              const cachedCons = JSON.parse(localStorage.getItem("privydoc_consultations") || "[]");
              cachedCons.push(data.consultation);
              localStorage.setItem("privydoc_consultations", JSON.stringify(cachedCons));

              setCheckoutStep("success");
              setSelectedCase(data.consultation);
              triggerRefresh();
            } else {
              alert(data.message || "Payment verification failed.");
            }
          } catch (e: any) {
            console.error(e);
            alert(e.message || "We encountered an issue verifying your payment. Please contact help@privydoc.com.ng");
          } finally {
            setIsSubmittingIntake(false);
          }
        },
        onclose: () => {
          setIsSubmittingIntake(false);
        }
      });
    } else {
      console.warn("Flutterwave script not loaded; executing offline auto-bypass/simulation.");
      // Auto-bypass for development environments when script fails to load
      try {
        const res = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            transaction_id: "dev_tx_" + Math.random().toString(36).substr(2, 9),
            tx_ref,
            amount,
            payment_type: "new",
            patient_phone: patientPhone,
            patient_name: patientName,
            patient_age: parseInt(patientAge) || 30,
            condition_title: selectedCondition.title,
            duration: intakeAnswers["duration"] || "3-6 months",
            raw_answers: answers
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Server verification of transaction failed.");
        }

        const data = await res.json();
        if (data.ok && data.consultation) {
          const cachedCons = JSON.parse(localStorage.getItem("privydoc_consultations") || "[]");
          cachedCons.push(data.consultation);
          localStorage.setItem("privydoc_consultations", JSON.stringify(cachedCons));

          setCheckoutStep("success");
          setSelectedCase(data.consultation);
          triggerRefresh();
        } else {
          alert(data.message || "Payment verification failed.");
        }
      } catch (e: any) {
        console.error(e);
        alert("Verification server offline. Please try again.");
      } finally {
        setIsSubmittingIntake(false);
      }
    }
  };

  // Search Patient Portal Cases
  const handleSearchPatientPortal = () => {
    if (!searchPhone) return;
    const key = searchPhone.toLowerCase().trim();
    if (key === "doctor" || key === "clinician") {
      switchRoleSafely("clinician", () => {
        setShowHiddenRoles(true);
        setActiveTab("clinician");
        setSearchPhone("");
      });
      return;
    }
    if (key === "admin" || key === "root") {
      switchRoleSafely("admin", () => {
        setShowHiddenRoles(true);
        setActiveTab("admin");
        setSearchPhone("");
      });
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
  const handlePatientRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regAge || !regState || !regConsent) {
      alert("Please fill in all clinical registration details and accept the patient consent.");
      return;
    }

    // Validate Name
    const nameTrimmed = regName.trim();
    if (!nameTrimmed.includes(" ") || nameTrimmed.split(/\s+/).length < 2) {
      alert("Please enter both your first name and last name for clinical prescription eligibility.");
      return;
    }

    // Validate Phone Number
    const cleanedPhone = regPhone.replace(/[\s\-\(\)]/g, "");
    const phoneRegex = /^(\+?234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      alert("Invalid phone format. Please enter a valid Nigerian WhatsApp number (e.g., +234 803 123 4567 or 08031234567).");
      return;
    }

    const ageNum = parseInt(regAge);
    if (isNaN(ageNum) || ageNum < 18) {
      alert("Under standard clinical guidelines, consultations are strictly restricted to individuals aged 18 and older.");
      return;
    }

    // Call real backend OTP send
    setRegOtp("");
    const res = await patientApi.sendOtp(regPhone);
    if (res.success) {
      setPatientSubView("otp");
      if (res.test_bypass) {
        alert(`Secure OTP Tunnel: A real OTP was generated for +${cleanedPhone}. For preview purposes, the code is '${res.test_bypass}'.`);
      } else {
        alert("A secure verification code has been sent to your WhatsApp number. Please check your messages.");
      }
    } else {
      alert(res.error || "Failed to dispatch verification code.");
    }
  };

  // Patient OTP Submit
  const handlePatientOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await patientApi.verifyOtp(regPhone, regOtp);
    if (res.success) {
      setPatientSubView("pinSetup");
    } else {
      alert(res.error || "Incorrect or expired verification code.");
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
      } else {
        if (cases.length > 0) {
          setSelectedCase(cases[0]);
        } else {
          setSelectedCase(null);
        }
        setPatientSubView("portal");
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
          setPermissionModal("notifications");
        }
      }
    } else {
      alert(res.error || "Failed to establish secure patient profile.");
    }
  };

  // Patient PIN Login Submit
  const handlePatientLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await patientApi.login(loginPhone, loginPin);
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
      } else {
        if (cases.length > 0) {
          setSelectedCase(cases[0]);
        } else {
          setSelectedCase(null);
        }
        setPatientSubView("portal");
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
          setPermissionModal("notifications");
        }
      }
    } else {
      alert(res.error || "PIN authentication rejected.");
    }
  };

  // Patient PIN Recovery Handlers
  const handlePatientForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientForgotPhone) {
      alert("Registered phone number is required.");
      return;
    }
    setIsPatientForgotSending(true);
    try {
      // First, verify that this patient exists in DB
      const res = await fetch(`/api/auth/patient/verify-forgot?phone=${encodeURIComponent(patientForgotPhone.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.message || "No matching patient vault found for this number.");
        setIsPatientForgotSending(false);
        return;
      }

      // Send OTP
      const otpRes = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientForgotPhone })
      });
      const otpData = await otpRes.json();
      if (otpRes.ok && otpData.ok) {
        setPatientForgotMode("verify");
        alert("Verification code has been dispatched to your registered WhatsApp number.");
      } else {
        alert(otpData.message || "Failed to dispatch verification code.");
      }
    } catch (err) {
      alert("Security service communication failed.");
    } finally {
      setIsPatientForgotSending(false);
    }
  };

  const handlePatientForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (patientForgotNewPin.length !== 6 || isNaN(Number(patientForgotNewPin))) {
      alert("PIN must be exactly 6 numeric digits.");
      return;
    }
    if (patientForgotNewPin !== patientForgotNewPinConfirm) {
      alert("PIN confirmation does not match.");
      return;
    }
    setIsPatientForgotSending(true);
    try {
      const resetRes = await fetch("/api/auth/patient/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: patientForgotPhone,
          otp: patientForgotOtp,
          pin: patientForgotNewPin
        })
      });
      const resetData = await resetRes.json();
      if (resetRes.ok && resetData.ok) {
        alert("Your Secure Vault PIN has been reset successfully! You can now log in with your new passcode.");
        setPatientForgotMode("none");
        setPatientForgotPhone("");
        setPatientForgotOtp("");
        setPatientForgotNewPin("");
        setPatientForgotNewPinConfirm("");
        setLoginPhone(patientForgotPhone);
        setPatientSubView("login");
      } else {
        alert(resetData.message || "Failed to reset vault PIN. Verify your OTP is correct.");
      }
    } catch (err) {
      alert("Security service verification failed.");
    } finally {
      setIsPatientForgotSending(false);
    }
  };

  // Secure Vault Unlock PIN verification
  const handleUnlockSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError("");
    if (unlockPin.length !== 6) {
      setUnlockError("PIN must be exactly 6 numeric digits.");
      return;
    }

    try {
      // Direct call to patient login endpoint or local fallback
      const response = await fetch("/api/auth/patient/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientSession?.phone, pin: unlockPin })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setIsPatientSessionLocked(false);
        setUnlockPin("");
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      } else {
        setUnlockError(data.message || "Incorrect 6-digit PIN.");
      }
    } catch (err) {
      if (patientSession && patientSession.pin_hash === unlockPin) {
        setIsPatientSessionLocked(false);
        setUnlockPin("");
        localStorage.setItem("privydoc_patient_last_active", Date.now().toString());
      } else {
        setUnlockError("Invalid PIN. Vault access denied.");
      }
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
  const handleDoctorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    const res = await doctorApi.login(docFolio, docPin);
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
    if (currentDoctor.status === "suspended" || currentDoctor.flagged) {
      setDocError("Compliance Restriction: Your clinical portfolio is currently suspended under MDCN Supervision. You cannot claim new clinical folders.");
      return;
    }
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

    const validation = validateTemplatePlaceholders(doctorMessage);
    if (!validation.ok) {
      alert(`Submission Blocked: Clinical templates contain 5 or more unedited placeholder tokens. Please customize these prior to sending:\n\n${validation.tokens.join(", ")}`);
      return;
    }

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

    const notesValidation = validateTemplatePlaceholders(closingNotes);
    const prescriptionValidation = validateTemplatePlaceholders(closingPrescription);
    if (!notesValidation.ok || !prescriptionValidation.ok) {
      const allPlaceholders = Array.from(new Set([...notesValidation.tokens, ...prescriptionValidation.tokens]));
      alert(`Submission Blocked: Clinical notes or prescription contain 5 or more unedited placeholder tokens. Please customize these prior to certifying:\n\n${allPlaceholders.join(", ")}`);
      return;
    }

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
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: adminPin })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setIsAdminAuthenticated(true);
        setAdminView("verifications");
      } else {
        alert(data.message || "Invalid Admin clearance PIN.");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      alert("Admin authentication service is currently offline. Please try again later.");
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
      {isPatientSessionLocked && patientSession && (
        <div className="fixed inset-0 bg-[#06080c]/98 z-[9999] flex items-center justify-center p-6 animate-fade-in" id="scrPinResume">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-2xl p-8 space-y-6 text-center shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-[#E5C158] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Secure Session Locked
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                For your clinical data confidentiality, your secure PrivyDoc Vault has been locked after 30 minutes of background or idle inactivity.
              </p>
            </div>

            <form onSubmit={handleUnlockSession} className="space-y-4">
              <div className="space-y-2 text-left">
                <label htmlFor="unlock-pin" className="text-[10px] uppercase font-mono text-zinc-400 font-bold block">
                  Enter Your Secure 6-Digit PIN
                </label>
                <input
                  id="unlock-pin"
                  required
                  type="password"
                  maxLength={6}
                  placeholder="••••••"
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-center text-lg tracking-[0.5em] text-[#E5C158] font-mono focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>

              {unlockError && (
                <p className="text-xs text-rose-400 bg-rose-950/20 border border-rose-900/30 px-3 py-2 rounded-xl text-center font-mono">
                  {unlockError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Unlock Session
              </button>
            </form>

            <button
              onClick={() => {
                localStorage.removeItem("privydoc_patient_session");
                setPatientSession(null);
                setIsPatientSessionLocked(false);
                setPatientSubView("landing");
                setUnlockPin("");
                setUnlockError("");
              }}
              className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors underline block mx-auto mt-2"
            >
              Sign Out / Switch Vault Account
            </button>
          </div>
        </div>
      )}
      <div className="app-side app-side-left"></div>
      
      <div className="app-container">
        {/* GLOBAL LUXURY HEADER */}
        <header className="border-b border-zinc-900/80 bg-black/85 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Custom Gold Brand Logo */}
          <button 
            onClick={() => { 
              switchRoleSafely("patient", () => {
                setActiveTab("patient"); 
                setPatientSubView("landing"); 
                setSelectedCase(null); 
              });
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
            {isAdminAuthenticated ? (
              /* Active Admin Session - Only show Admin Tab */
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-rose-600/10 text-rose-400 border border-rose-500/15 cursor-default"
              >
                Admin Office Active
              </button>
            ) : currentDoctor ? (
              /* Active Doctor Session - Only show Clinician Tab */
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/15 cursor-default"
              >
                Clinician Area Active
              </button>
            ) : patientSession ? (
              /* Active Patient Session - Only show Patient Tab */
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/15 cursor-default"
              >
                Patient Vault Active
              </button>
            ) : (
              /* Public View - Show Role Selection Tabs */
              <>
                <button
                  onClick={() => {
                    switchRoleSafely("patient", () => {
                      setActiveTab("patient"); 
                      setPatientSubView("landing"); 
                      setSelectedCase(null);
                    });
                  }}
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
                      onClick={() => {
                        switchRoleSafely("clinician", () => {
                          setActiveTab("clinician"); 
                          setDocError(""); 
                          setDocSuccess("");
                        });
                      }}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        activeTab === "clinician" 
                          ? "bg-[#d4af37]/10 text-[#E5C158] border border-[#d4af37]/15" 
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      Clinician Area
                    </button>
                    <button
                      onClick={() => {
                        switchRoleSafely("admin", () => {
                          setActiveTab("admin");
                        });
                      }}
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
                onSelectClinician={() => {
                  switchRoleSafely("clinician", () => {
                    setActiveTab("clinician");
                    setDocView("login");
                    setShowHiddenRoles(true);
                  });
                }}
              />
            )}

            {/* Patient Registration Screen */}
            {patientSubView === "register" && (
              <div className="max-w-md mx-auto bg-zinc-950 border border-zinc-900 rounded-3xl p-8 space-y-6 shadow-2xl animate-fade-in relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#d4af37]" />
                
                {/* Back Button to prevent strandings */}
                <div className="flex justify-between items-center">
                  <button 
                    type="button"
                    onClick={() => setPatientSubView("landing")}
                    className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-bold font-mono"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Programs
                  </button>
                </div>

                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Create Secure Patient Profile</h4>
                  <p className="text-xs text-zinc-500 font-sans">Establish your private, confidential clinical folder.</p>
                </div>
                
                <form onSubmit={handlePatientRegisterSubmit} className="space-y-4">
                  
                  {/* Full Name Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="reg-name" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                        Full Name
                        <span className="relative group inline-block">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-52 text-center leading-normal z-50 shadow-2xl">
                            Enter your legal name as on bank/ID records to ensure clinical prescription validity.
                          </span>
                        </span>
                      </label>
                      <span className="text-[9px] text-zinc-600 font-mono">Example: Adebayo Okafor</span>
                    </div>
                    <input 
                      id="reg-name"
                      type="text"
                      required
                      placeholder="e.g. Adebayo Okafor"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                    <p className="text-[9.5px] text-zinc-600 font-sans">Must match identification records if clinical prescriptions are issued.</p>
                  </div>

                  {/* Confidential WhatsApp Number Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="reg-phone" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                        Confidential WhatsApp Number
                        <span className="relative group inline-block">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-52 text-center leading-normal z-50 shadow-2xl">
                            Serves as your unique identifier to safely retrieve consult files and digital prescriptions.
                          </span>
                        </span>
                      </label>
                      <span className="text-[9px] text-zinc-600 font-mono">Example: +234 803 123 4567</span>
                    </div>
                    <input 
                      id="reg-phone"
                      type="tel"
                      required
                      placeholder="e.g. +234 803 123 4567"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono transition-colors"
                    />
                    <p className="text-[9.5px] text-zinc-600 font-sans">Used exclusively for secure vault verification and notifications.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Age Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label htmlFor="reg-age" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                          Age (Min 18)
                          <span className="relative group inline-block">
                            <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-40 text-center leading-normal z-50 shadow-2xl">
                              Consultations are strictly restricted to adults aged 18+ under MDCN regulations.
                            </span>
                          </span>
                        </label>
                      </div>
                      <input 
                        id="reg-age"
                        type="number"
                        required
                        min="18"
                        max="120"
                        placeholder="Age"
                        value={regAge}
                        onChange={(e) => setRegAge(e.target.value)}
                        className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono transition-colors"
                      />
                      <p className="text-[9px] text-zinc-600 font-sans">Min: 18, Max: 120.</p>
                    </div>

                    {/* State Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <label htmlFor="reg-state" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                          State
                          <span className="relative group inline-block">
                            <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-40 text-center leading-normal z-50 shadow-2xl">
                              Required for demographic logging and local pharmacy dispatch coordination.
                            </span>
                          </span>
                        </label>
                      </div>
                      <select
                        id="reg-state"
                        required
                        value={regState}
                        onChange={(e) => setRegState(e.target.value)}
                        className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors"
                      >
                        <option value="">Select State</option>
                        {[
                          "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
                          "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "Gombe", "Imo", 
                          "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
                          "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", 
                          "Sokoto", "Taraba", "Yobe", "Zamfara", "Abuja FCT"
                        ].map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <p className="text-[9px] text-zinc-600 font-sans">Current residence state.</p>
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="reg-email" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold flex items-center gap-1">
                        Email Address (Optional)
                        <span className="relative group inline-block">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-[#E5C158] cursor-help transition-colors" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-900 border border-zinc-850 text-zinc-300 text-[9px] py-1 px-2.5 rounded-lg w-52 text-center leading-normal z-50 shadow-2xl">
                            Used optionally to receive duplicate backup notifications of your diagnostic outcomes.
                          </span>
                        </span>
                      </label>
                      <span className="text-[9px] text-zinc-600 font-mono">Example: patient@domain.com</span>
                    </div>
                    <input 
                      id="reg-email"
                      type="email"
                      placeholder="e.g. name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-black border border-zinc-900 focus:border-[#d4af37]/40 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 transition-colors"
                    />
                    <p className="text-[9px] text-zinc-600 font-sans">Used to receive secure backup copies of your medical outcomes.</p>
                  </div>

                  {/* Consent Checkbox */}
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
                
                {patientForgotMode === "phone" ? (
                  /* PATIENT PIN RECOVERY - REQUEST OTP */
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Vault PIN Recovery</h4>
                      <p className="text-xs text-zinc-500 font-sans">Verify your registered number to receive a secure recovery code via WhatsApp.</p>
                    </div>

                    <form onSubmit={handlePatientForgotSendOtp} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-phone" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Registered WhatsApp Number</label>
                        <input 
                          id="forgot-patient-phone"
                          type="tel"
                          required
                          placeholder="e.g. +234 803 123 4567"
                          value={patientForgotPhone}
                          onChange={(e) => setPatientForgotPhone(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isPatientForgotSending}
                        className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow disabled:opacity-50"
                      >
                        {isPatientForgotSending ? "Verifying..." : "Dispatch Secure Code"}
                      </button>
                    </form>

                    <div className="text-center pt-2">
                      <button 
                        type="button"
                        onClick={() => { setPatientForgotMode("none"); }}
                        className="text-[10px] font-mono text-[#E5C158] hover:underline"
                      >
                        Back to Vault Unlock
                      </button>
                    </div>
                  </div>
                ) : patientForgotMode === "verify" ? (
                  /* PATIENT PIN RECOVERY - VERIFY & RESET */
                  <div className="space-y-6">
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Authorize Reset</h4>
                      <p className="text-xs text-zinc-500 font-sans">Verification code has been dispatched. Set your new clinical vault security PIN.</p>
                    </div>

                    <form onSubmit={handlePatientForgotResetSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-otp" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">WhatsApp Code (6-Digit)</label>
                        <input 
                          id="forgot-patient-otp"
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={patientForgotOtp}
                          onChange={(e) => setPatientForgotOtp(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-700"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-new-pin" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">New 6-Digit PIN</label>
                        <input 
                          id="forgot-patient-new-pin"
                          type="password"
                          required
                          maxLength={6}
                          placeholder="e.g. ••••••"
                          value={patientForgotNewPin}
                          onChange={(e) => setPatientForgotNewPin(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-700"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="forgot-patient-new-pin-confirm" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Confirm New PIN</label>
                        <input 
                          id="forgot-patient-new-pin-confirm"
                          type="password"
                          required
                          maxLength={6}
                          placeholder="e.g. ••••••"
                          value={patientForgotNewPinConfirm}
                          onChange={(e) => setPatientForgotNewPinConfirm(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-center text-sm font-mono tracking-widest text-white focus:outline-none placeholder-zinc-700"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={isPatientForgotSending}
                        className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow disabled:opacity-50"
                      >
                        {isPatientForgotSending ? "Applying Reset..." : "Establish New Vault PIN"}
                      </button>
                    </form>

                    <div className="text-center pt-2">
                      <button 
                        type="button"
                        onClick={() => { setPatientForgotMode("none"); }}
                        className="text-[10px] font-mono text-[#E5C158] hover:underline"
                      >
                        Cancel Recovery
                      </button>
                    </div>
                  </div>
                ) : (
                  /* STANDARD LOGIN SCREEN */
                  <>
                    <div className="text-center space-y-2">
                      <h4 className="text-lg font-bold text-white font-serif" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Unlock Secure Vault</h4>
                      <p className="text-xs text-zinc-500 font-sans">Confidential clinical portal access.</p>
                    </div>

                    <form onSubmit={handlePatientLoginSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label htmlFor="login-phone" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Registered WhatsApp Number</label>
                        <input 
                          id="login-phone"
                          type="tel"
                          required
                          placeholder="e.g. +234 803 123 4567"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          className="w-full bg-black border border-zinc-900 focus:border-amber-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none placeholder-zinc-700 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label htmlFor="login-pin" className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-extrabold">Enter 6-Digit PIN</label>
                          <button 
                            type="button"
                            onClick={() => { setPatientForgotMode("phone"); setPatientForgotPhone(loginPhone); }}
                            className="text-[9.5px] font-mono text-[#E5C158] hover:underline font-bold"
                          >
                            Forgot PIN?
                          </button>
                        </div>
                        <input 
                          id="login-pin"
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
                  </>
                )}
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
                  className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold rounded-xl text-xs transition-colors shadow flex items-center justify-center gap-1.5"
                >
                  Enter Secure Patient Dashboard <span className="font-mono text-[10px] opacity-80">(Redirecting in {successCountdown}s)</span>
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
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
              <span className="text-xs font-mono text-zinc-400">Decrypting Secure Clinician Console...</span>
            </div>
          }>
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
          </React.Suspense>
        )}

        {/* III. OPERATIVE ADMIN FLOW */}
        {activeTab === "admin" && (
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center py-24 text-zinc-400 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
              <span className="text-xs font-mono text-zinc-400">Decrypting Secure Administrative Console...</span>
            </div>
          }>
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
          </React.Suspense>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900/40 bg-zinc-950/20 py-3.5 px-4 text-center text-[9px] text-zinc-600 font-mono selection:bg-transparent">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2 text-left">
          <p className="text-center md:text-left">
            © {new Date().getFullYear()} <span className="cursor-pointer hover:text-zinc-400 transition-colors select-none font-bold" onClick={() => setShowHiddenRoles(p => !p)}>PrivyDoc</span> • <span className="text-zinc-500 font-sans font-medium">Verified Telehealth</span>
          </p>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-zinc-500 text-[9.5px]">
            <button onClick={() => setLegalModalOpen("privacy")} className="hover:text-zinc-300 transition-colors">Privacy Policy</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("terms")} className="hover:text-zinc-300 transition-colors">Terms of Use</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("medical")} className="hover:text-zinc-300 transition-colors">Disclaimer</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("ndpr")} className="hover:text-zinc-300 transition-colors">NDPR</button>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setLegalModalOpen("refund")} className="hover:text-zinc-300 transition-colors">Refunds</button>
          </div>
          <p className="text-[8.5px] opacity-75 text-zinc-600 hover:text-zinc-500 transition-colors">AES-256 Tunnel • MDCN Telemedicine Compliant</p>
        </div>
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
                <p>Due to the direct provision of clinical services by licensed medical physicians, consultation fees ({formatNaira(pricingApi.getById("base_consultation")?.price ?? 7500)} base, {formatNaira(pricingApi.getById("review_consultation")?.price ?? 3500)} review) are non-refundable once a physician claims your file.</p>
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

    {/* BRANDED PRE-PERMISSION MODAL */}
    {permissionModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="relative max-w-md w-full bg-zinc-950 border border-zinc-900 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl overflow-hidden text-zinc-200">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4af37] to-[#b8860b]" />
          
          {permissionModal === "location" ? (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                  <MapPin className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  MDCN CLINICAL COMPLIANCE CHECK
                </h3>
                <span className="inline-block px-2.5 py-0.5 bg-amber-500/5 text-[#E5C158] text-[8px] uppercase tracking-widest font-mono font-bold rounded-full border border-[#d4af37]/10">
                  Jurisdiction Audit
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">
                  Under clinical guidelines established by the <strong className="text-zinc-300">Medical and Dental Council of Nigeria (MDCN)</strong> for telemedicine, physicians are strictly licensed to evaluate patients physically residing in Nigeria.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  PrivyDoc requires a secure, one-time geographical check before initiating your private consultation dossier. Your precise coordinates are never stored or logged permanently.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          setPermissionModal(null);
                          if (pendingCondition) {
                            const cond = pendingCondition;
                            setPendingCondition(null);
                            proceedWithIntake(cond);
                          }
                        },
                        (err) => {
                          console.warn("Location permission denied", err);
                          setPermissionModal(null);
                          if (pendingCondition) {
                            const cond = pendingCondition;
                            setPendingCondition(null);
                            proceedWithIntake(cond);
                          }
                        }
                      );
                    } else {
                      setPermissionModal(null);
                      if (pendingCondition) {
                        const cond = pendingCondition;
                        setPendingCondition(null);
                        proceedWithIntake(cond);
                      }
                    }
                  }}
                  className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#d4af37]/5 flex items-center justify-center gap-2"
                >
                  Authorize Compliance Check <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setPermissionModal(null);
                    setPendingCondition(null);
                  }}
                  className="w-full py-2.5 bg-transparent hover:bg-zinc-900/50 text-zinc-500 hover:text-zinc-400 font-bold text-xs rounded-xl transition-colors"
                >
                  Cancel Consultation
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-3">
                <div className="w-14 h-14 bg-amber-500/10 text-[#d4af37] border border-amber-500/15 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  SECURE MEDICAL ALERT SYSTEM
                </h3>
                <span className="inline-block px-2.5 py-0.5 bg-amber-500/5 text-[#E5C158] text-[8px] uppercase tracking-widest font-mono font-bold rounded-full border border-[#d4af37]/10">
                  Encrypted Push Channel
                </span>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-1">
                  To maintain standard asynchronous clinic hours without delay, PrivyDoc utilizes secure instant alerts to notify you the moment your certified doctor:
                </p>
                <div className="text-left bg-black/40 border border-zinc-900 rounded-xl p-3 space-y-1.5 text-[10.5px] text-zinc-400">
                  <p className="flex gap-2 items-center"><strong className="text-[#E5C158]">•</strong> Claims your diagnostic folder file</p>
                  <p className="flex gap-2 items-center"><strong className="text-[#E5C158]">•</strong> Asks vital follow-up screening questions</p>
                  <p className="flex gap-2 items-center"><strong className="text-[#E5C158]">•</strong> Issues signed pharmacotherapy prescriptions</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    if ("Notification" in window) {
                      Notification.requestPermission().then((permission) => {
                        console.log("Notification permission:", permission);
                        setPermissionModal(null);
                      });
                    } else {
                      setPermissionModal(null);
                    }
                  }}
                  className="w-full py-3 bg-[#d4af37] hover:bg-[#b8860b] text-black font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-[#d4af37]/5 flex items-center justify-center gap-2"
                >
                  Enable Real-Time Alerts <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPermissionModal(null)}
                  className="w-full py-2.5 bg-transparent hover:bg-zinc-900/50 text-zinc-500 hover:text-zinc-400 font-bold text-xs rounded-xl transition-colors"
                >
                  Dismiss for Now
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    {/* Floating Scroll to Top / Bottom Helper Buttons */}
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2.5">
      {scrollY > 200 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          title="Scroll to Top"
          className="w-10 h-10 bg-zinc-950/90 hover:bg-[#d4af37] text-[#d4af37] hover:text-black border border-zinc-900 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group backdrop-blur-md"
        >
          <ChevronUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
      {scrollY < ((document.documentElement?.scrollHeight || 1000) - window.innerHeight - 200) && (
        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}
          title="Scroll to Bottom"
          className="w-10 h-10 bg-zinc-950/90 hover:bg-[#d4af37] text-[#d4af37] hover:text-black border border-zinc-900 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group backdrop-blur-md"
        >
          <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
        </button>
      )}
    </div>
  </div>
);
}
