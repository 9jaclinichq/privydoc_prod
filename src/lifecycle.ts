export type ConsultationStage =
  | "initial"
  | "day2_pending"
  | "day2_sent"
  | "day5_pending"
  | "day5_closed"
  | "review_open"
  | "review_closed";

export type ConsultationStatus = "pending" | "active" | "completed";

export function getCoarseStatus(stage: ConsultationStage): ConsultationStatus {
  switch (stage) {
    case "initial":
      return "pending";
    case "day2_pending":
    case "day2_sent":
    case "day5_pending":
    case "review_open":
      return "active";
    case "day5_closed":
    case "review_closed":
      return "completed";
    default:
      return "pending";
  }
}

export function getStageLabel(stage: ConsultationStage): string {
  switch (stage) {
    case "initial":
      return "initial";
    case "day2_pending":
    case "day2_sent":
      return "day2";
    case "day5_pending":
    case "day5_closed":
      return "day5";
    case "review_open":
    case "review_closed":
      return "review";
    default:
      return "initial";
  }
}

export function getSLAHours(stage: ConsultationStage): number {
  switch (stage) {
    case "initial":
      return 24; // 24 hours to claim and respond
    case "day2_pending":
    case "day2_sent":
      return 48; // 48 hours for day-2 follow-up
    case "day5_pending":
      return 120; // 5 days for full cycle closing
    case "review_open":
      return 24; // 24 hours to reply to a review
    default:
      return 24;
  }
}

export function getStageTitle(stage: ConsultationStage): string {
  switch (stage) {
    case "initial":
      return "Initial Consultation";
    case "day2_pending":
      return "Day-2 Follow-up Pending";
    case "day2_sent":
      return "Day-2 Check-in Sent";
    case "day5_pending":
      return "Day-5 Evaluation Pending";
    case "day5_closed":
      return "Consultation Closed";
    case "review_open":
      return "Review Requested";
    case "review_closed":
      return "Review Resolved";
    default:
      return "Consultation";
  }
}
