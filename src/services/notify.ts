import { DATA } from "./data";

export const NOTIFY = {
  /**
   * Dispatches a WhatsApp message using a registered Meta Cloud API utility template.
   * Runs in a strict fire-and-forget manner, catching any errors to protect core UX.
   */
  sendWhatsApp(phone: string, templateName: string, variables: string[] = []): void {
    console.log(`[WhatsApp] Triggering template '${templateName}' to phone: ${phone} with params:`, variables);
    
    // Always fire-and-forget and capture errors silently to protect UX flow.
    DATA.fn("send-whatsapp", { phone, template: templateName, variables })
      .then((res) => {
        console.log(`[WhatsApp] Sent successfully to ${phone}:`, res);
      })
      .catch((err) => {
        console.warn(`[WhatsApp] Notification error (silently absorbed to protect core UX):`, err);
      });
  },

  /**
   * Logs an in-app notification to the notifications table.
   * Runs as a fire-and-forget operation.
   */
  createInApp(
    recipientId: string,
    recipientRole: "patient" | "doctor" | "admin",
    type: "flag" | "suspension" | "new_case" | "response" | "payout" | "broadcast",
    title: string,
    message: string
  ): void {
    console.log(`[InApp Notification] Dispatching [${type.toUpperCase()}] to ${recipientRole} ${recipientId}: ${title}`);
    
    const row = {
      recipient_id: recipientId,
      recipient_role: recipientRole,
      type,
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString()
    };

    DATA.post("notifications", row)
      .then((res) => {
        console.log(`[InApp Notification] Persisted successfully:`, res);
      })
      .catch((err) => {
        console.warn(`[InApp Notification] Error (silently absorbed):`, err);
      });
  }
};
