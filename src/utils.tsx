import React from "react";

// Generate a unique random ID
export function generateId(prefix: string = "id"): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 11)}`;
}

// Friendly PD-XXXXXX reference for patient-facing/clinician-facing display, instead of
// the raw internal consultation ID (e.g. "cons_07dmkwt8e"). Shared by PatientPortal and
// ClinicianArea so the same consultation shows the identical reference on both sides.
export function formatConsultationRef(consultationId: string): string {
  return `PD-${consultationId.slice(-6).toUpperCase()}`;
}

// Format currency in Nigerian Naira (NGN)
export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// Format date to local standard
export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Just now";
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// WhatsApp-style chat timestamp: "01:27" for a message sent today, "Jul 2" for older
// messages. Shared by both the doctor (ClinicianArea) and patient (PatientPortal)
// chat views so timestamps read identically on both sides of the same conversation.
export function formatChatTimestamp(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (isToday) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Simple debounce helper
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Simple inline formatting function
export function parseInlineFormatting(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let key = 0;
  
  while (currentText.length > 0) {
    const boldMatch = currentText.match(/\*\*([^*]+)\*\*/);
    const italicMatch = currentText.match(/\*([^*]+)\*/);
    
    // Find the first match
    let firstMatch: { index: number; length: number; type: 'bold' | 'italic'; content: string } | null = null;
    
    if (boldMatch && boldMatch.index !== undefined) {
      firstMatch = {
        index: boldMatch.index,
        length: boldMatch[0].length,
        type: 'bold',
        content: boldMatch[1]
      };
    }
    
    if (italicMatch && italicMatch.index !== undefined) {
      if (!firstMatch || italicMatch.index < firstMatch.index) {
        firstMatch = {
          index: italicMatch.index,
          length: italicMatch[0].length,
          type: 'italic',
          content: italicMatch[1]
        };
      }
    }
    
    if (firstMatch) {
      // Add text before match
      if (firstMatch.index > 0) {
        parts.push(currentText.substring(0, firstMatch.index));
      }
      
      // Add formatted match
      if (firstMatch.type === 'bold') {
        parts.push(<strong key={`bold-${key++}`} className="font-extrabold text-white">{firstMatch.content}</strong>);
      } else {
        parts.push(<em key={`italic-${key++}`} className="italic text-zinc-200">{firstMatch.content}</em>);
      }
      
      // Advance
      currentText = currentText.substring(firstMatch.index + firstMatch.length);
    } else {
      // No matches left
      parts.push(currentText);
      break;
    }
  }
  
  return parts;
}

// Convert markdown-like text to React elements
export function renderRichText(text: string): React.ReactNode {
  if (!text) return "";
  
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listKeyCounter = 0;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith("•") || trimmed.startsWith("*") || trimmed.startsWith("-");

    if (isBullet) {
      // Remove bullet character
      const cleanLine = trimmed.replace(/^[•*\-]\s*/, "");
      currentList.push(
        <li key={`li-${idx}`} className="list-disc ml-5 pl-1 my-0.5 text-zinc-300">
          {parseInlineFormatting(cleanLine)}
        </li>
      );
    } else {
      // If we had an active list, render it first
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${listKeyCounter++}`} className="space-y-1 my-1">
            {currentList}
          </ul>
        );
        currentList = [];
      }

      if (trimmed === "") {
        elements.push(<div key={`spacer-${idx}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${idx}`} className="my-1 text-zinc-300 leading-relaxed">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }
  });

  // Render any remaining list
  if (currentList.length > 0) {
    elements.push(
      <ul key={`ul-${listKeyCounter++}`} className="space-y-1 my-1">
        {currentList}
      </ul>
    );
  }

  return <div className="space-y-1">{elements}</div>;
}
