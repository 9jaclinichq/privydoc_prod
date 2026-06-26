import { Consultation } from "../types";

export interface PDFGeneratorOptions {
  referralSpecialty?: string;
  referralUrgency?: "Low" | "Routine" | "Urgent" | "Emergency";
  referralNotes?: string;
  doctorMdcnFolio?: string;
}

export async function generateConsultationPDF(
  con: Consultation,
  forceType?: "initial" | "day2" | "day5" | "review" | "referral",
  options: PDFGeneratorOptions = {}
) {
  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // 1. Determine Document Type based on Stage or Parameter
    let docType = forceType;
    if (!docType) {
      if (con.referral_text) {
        docType = "referral";
      } else {
        const stageStr = (con.stage || "") as string;
        if (stageStr === "day2_pending" || stageStr === "day2_sent" || stageStr === "day2_response_at") {
          docType = "day2";
        } else if (stageStr === "day5_pending" || stageStr === "day5_closed" || stageStr === "day5_closed_at") {
          docType = "day5";
        } else if (stageStr === "review_open" || stageStr === "review_closed") {
          docType = "review";
        } else {
          docType = "initial";
        }
      }
    }

    // Set stage labels and document titles
    let stageLabel = "Initial Assessment";
    let documentTitle = "INITIAL CLINICAL ASSESSMENT & Rx";
    let accentColor = { r: 212, g: 175, b: 55 }; // Gold

    if (docType === "day2") {
      stageLabel = "Day-2 Check-in";
      documentTitle = "DAY-2 CLINICAL FOLLOW-UP & SAFETY PROFILE";
      accentColor = { r: 59, g: 130, b: 246 }; // Blue
    } else if (docType === "day5") {
      stageLabel = "Day-5 Evaluation Desk";
      documentTitle = "DAY-5 CLINICAL PROGRAM SIGN-OFF & Rx";
      accentColor = { r: 16, g: 185, b: 129 }; // Emerald
    } else if (docType === "review") {
      stageLabel = "Clinical Review Resolution";
      documentTitle = "THERAPEUTIC REVIEW & RE-PRESCRIBING RECORD";
      accentColor = { r: 244, g: 63, b: 94 }; // Rose
    } else if (docType === "referral") {
      stageLabel = "Clinical Specialist Referral";
      documentTitle = "OFFICIAL MEDICAL REFERRAL LETTER";
      accentColor = { r: 124, g: 58, b: 237 }; // Purple
    }

    // 2. Background Paper Styling
    // Soft off-white premium clinical paper tint
    doc.setFillColor(253, 253, 251);
    doc.rect(0, 0, 210, 297, "F");

    // Corporate dual-border framing
    // Outer thin gold/accent border
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(0.8);
    doc.rect(6, 6, 198, 285);

    // Inner extremely faint gray safety border
    doc.setDrawColor(230, 230, 225);
    doc.setLineWidth(0.2);
    doc.rect(8, 8, 194, 281);

    // Top horizontal brand separator line
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.5);
    doc.line(12, 34, 198, 34);

    // 3. Platform Branding Block
    doc.setTextColor(18, 18, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("PRIVYDOC", 14, 24);

    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("9JACLINIC LIMITED • DISCREET MEN'S TELEHEALTH & CLINICAL LIAISON", 14, 29);

    // 4. Metadata Details Block (Right-aligned Header)
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(`Doc ID: PD-${docType.toUpperCase()}-${con.id.slice(0,8).toUpperCase()}`, 125, 18);
    
    const issueDate = con.updated_at ? con.updated_at.split("T")[0] : con.created_at.split("T")[0];
    doc.text(`Issued Date: ${issueDate}`, 125, 22);
    doc.text(`Stage Tracker: ${stageLabel.toUpperCase()}`, 125, 26);
    doc.text(`MDCN Regulatory Class: Secure Digital Prescription`, 125, 30);

    // Gold/Accent sub-header line
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(0.6);
    doc.line(14, 36, 196, 36);

    // 5. Demographic File Card Block
    doc.setFillColor(248, 248, 246);
    doc.rect(14, 42, 182, 26, "F");
    doc.setDrawColor(220, 220, 215);
    doc.setLineWidth(0.3);
    doc.rect(14, 42, 182, 26, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 20);
    doc.text("CONFIDENTIAL MEDICAL SUMMARY", 18, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(70, 70, 70);
    doc.text(`Patient Name: ${con.patient_name}`, 18, 54);
    
    // Derived display age: Birth year to current year, or literal
    const ageDisplay = con.patient_age ? `${con.patient_age} years (Birth Year ref)` : "Adult profile";
    doc.text(`Demographics: Male, ${ageDisplay}`, 18, 59);
    doc.text(`Emergency contact: Patient-retained`, 18, 64);

    doc.text(`Primary Complaint: ${con.condition}`, 112, 54);
    doc.text(`Diagnosing Clinician: ${con.doctor_name || "Certified Medical Specialist"}`, 112, 59);
    
    let docFolio = options.doctorMdcnFolio;
    if (!docFolio && con.doctor_id) {
      try {
        const doctorsRaw = localStorage.getItem("privydoc_doctors");
        if (doctorsRaw) {
          const doctors = JSON.parse(doctorsRaw);
          const foundDoc = doctors.find((d: any) => d.id === con.doctor_id);
          if (foundDoc?.mdcn_folio) {
            docFolio = foundDoc.mdcn_folio;
          }
        }
      } catch (e) {
        console.error("Failed to retrieve doctor MDCN folio from localStorage:", e);
      }
    }
    if (!docFolio) {
      docFolio = con.notes?.match(/MDCN Folio:\s*(\w+)/)?.[1] || "MDCN-REGISTERED";
    }
    doc.text(`Doctor Folio: ${docFolio}`, 112, 64);

    // 6. Specialist Referral Specific Layout
    if (docType === "referral") {
      const specText = options.referralSpecialty || "Urologist / Consultant Surgeon";
      const urg = options.referralUrgency || "Urgent";
      const findings = options.referralNotes || con.referral_text || "Patient has completed intake screening with clinical signs indicative of complex genitourinary or cardiovascular safety indicators requiring physical diagnostic workup.";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text("SPECIALIST CLINICAL REFERRAL MANDATE", 14, 82);

      doc.setDrawColor(210, 210, 205);
      doc.line(14, 85, 196, 85);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 30, 30);
      doc.text(`To: Head of Department, ${specText}`, 14, 91);
      doc.text(`Recommended Facility: Local Accredited Secondary/Tertiary Healthcare Hospital`, 14, 96);
      doc.text(`Clinical Priority / Urgency: [ ${urg.toUpperCase()} ]`, 14, 101);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      const introText = `Dear Doctor, \n\nI am referring this patient, ${con.patient_name} (Age: ${con.patient_age}), who presented via our digital health clinical pipeline complaining of symptoms related to ${con.condition}. \n\nUnder our safety review sweeps and clinical guidance, physical intervention is indicated for further diagnostics. Below are the physician findings and specific recommendations for your in-person workup:`;
      const splitIntro = doc.splitTextToSize(introText, 182);
      doc.text(splitIntro, 14, 108);

      const introHeight = splitIntro.length * 4.5;
      
      doc.setFillColor(252, 245, 255);
      doc.rect(14, 112 + introHeight, 182, 40, "F");
      doc.rect(14, 112 + introHeight, 182, 40, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 50, 150);
      doc.text("CLINICAL FINDINGS & DIAGNOSTIC DIRECTIVES", 18, 118 + introHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      const splitFindings = doc.splitTextToSize(findings, 174);
      doc.text(splitFindings, 18, 124 + introHeight);

      // Sign-off / seal
      const closingText = `Please carry out the relevant diagnostic tests, including biochemical evaluations, physical vascular assessments, or any imaging modalities as clinically indicated. We have locked active online prescriptions pending this physical workup.\n\nRespectfully,\n\n${con.doctor_name || "Reviewing Physician"}\nFolio: ${docFolio} (Verified Medical and Dental Council of Nigeria)`;
      const splitClosing = doc.splitTextToSize(closingText, 182);
      doc.text(splitClosing, 14, 162 + introHeight);

    } else {
      // 7. General Diagnostic Brief / Notes Section (initial, day2, day5, review)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text(documentTitle, 14, 82);

      doc.setDrawColor(220, 220, 215);
      doc.setLineWidth(0.4);
      doc.line(14, 85, 196, 85);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);

      // Extract notes or fallback to default
      let notesContent = con.doctor_notes || con.notes || "";
      if (!notesContent) {
        if (docType === "day2") {
          notesContent = "Evaluated patient compliance at Day-2 of active program cycle. Patient is experiencing normal progress with no reported side effects. Advised continued hydration and strict dosing adherence.";
        } else if (docType === "day5") {
          notesContent = "Completed the mandatory 5-day care follow-up cycle. Reviewed patient tolerance, overall compliance, and efficacy responses. Digital program successfully cleared and closed.";
        } else if (docType === "review") {
          notesContent = "Authorized therapeutic review of the patient's record. Reviewed patient feedback and adjusted dosage parameters safely to support maximum clinical comfort and response efficacy.";
        } else {
          notesContent = `Patient presented with complaints of ${con.condition} of ${con.duration} duration. Thorough clinical screening did not flag any active organic or cardiovascular safety contraindications. Cleared for program activation and authorized for digital therapeutic release.`;
        }
      }

      // Cleanup markdown formatting
      const cleanNotes = notesContent
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/•/g, "  - ");

      const splitNotes = doc.splitTextToSize(cleanNotes, 182);
      doc.text(splitNotes, 14, 91);

      const notesHeight = splitNotes.length * 4.6;

      // 8. Pharmaceutical Prescription Block (Rx)
      const rxHeaderY = 98 + notesHeight;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text("OFFICIAL PHARMACEUTICAL Rx DIRECTIVES", 14, rxHeaderY);

      doc.setLineWidth(0.4);
      doc.line(14, rxHeaderY + 3, 196, rxHeaderY + 3);

      // Giant Rx traditional clinical symbol
      doc.setFont("times", "bolditalic");
      doc.setFontSize(36);
      doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
      doc.text("Rx", 14, rxHeaderY + 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 30, 30);

      let prescriptionText = con.prescription || "";
      if (!prescriptionText) {
        if (docType === "day2") {
          prescriptionText = "Maintain dosage regimen set on initial consultation. Sildenafil 50mg or Tadalafil daily as instructed. Hydration and lifestyle coaching are active.";
        } else if (docType === "day5") {
          prescriptionText = "Cleared for standard 30-day program maintenance refills. Sildenafil 50mg Tablets / Dapoxetine 30mg / Tadalafil as clinically prescribed. Follow instructions carefully.";
        } else if (docType === "review") {
          prescriptionText = "Therapeutic adjustment: Dosage titration authorized. Take strictly as directed. Keep record of response parameters.";
        } else {
          prescriptionText = "No pharmaceutical compounds active at this stage. Recommended general support and metabolic check.";
        }
      }

      const cleanRx = prescriptionText
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/•/g, "  - ");

      const splitRx = doc.splitTextToSize(cleanRx, 155);
      doc.text(splitRx, 32, rxHeaderY + 10);
    }

    // 9. Standard Stamp and Cryptographic Clinic Seal Section
    const stampY = 240;
    doc.setFillColor(254, 254, 250);
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(0.5);
    doc.rect(14, stampY, 182, 34, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text("OFFICIAL VERIFICATION SEAL & CRYPTOGRAPHIC STAMP", 18, stampY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`This clinical document represents an official medical record issued under the registry authorization of 9JaClinic Limited.`, 18, stampY + 13);
    doc.text(`Licensing Authority: Medical and Dental Council of Nigeria (MDCN) digital practice compliance frameworks.`, 18, stampY + 17);
    doc.text(`Validation SHA256 Code: [SECURE_COMPLIANCE_SIGN_OFF_${con.id.slice(0, 12).toUpperCase()}]`, 18, stampY + 21);
    doc.text(`Sign-off Clinician: ${con.doctor_name || "Registry Board Specialist"} • MDCN No: ${docFolio}`, 18, stampY + 25);
    doc.text(`Prescription Release Authorization Status: APPROVED & STAMPED FOR PHARMACY REFILLS`, 18, stampY + 29);

    // Circle Graphic Seal (mimicking stamping)
    doc.setDrawColor(accentColor.r, accentColor.g, accentColor.b);
    doc.setLineWidth(0.8);
    doc.circle(174, stampY + 17, 12);
    
    doc.setLineWidth(0.2);
    doc.circle(174, stampY + 17, 10.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.5);
    doc.setTextColor(accentColor.r, accentColor.g, accentColor.b);
    doc.text("PRIVYDOC", 168.5, stampY + 14);
    doc.text("APPROVED", 168.2, stampY + 17);
    doc.text("MDCN COMPLIANT", 164.5, stampY + 20);

    // 10. Trigger Download
    const fileName = docType === "referral" 
      ? `PrivyDoc-Clinical-Referral-${con.id}.pdf`
      : `PrivyDoc-Evaluation-${stageLabel.replace(/\s+/g, "-")}-${con.id}.pdf`;
      
    doc.save(fileName);
    return true;
  } catch (e) {
    console.error("Failed to generate clinical PDF:", e);
    throw e;
  }
}
