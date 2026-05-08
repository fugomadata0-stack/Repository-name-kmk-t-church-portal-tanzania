/**
 * Recipient shaping + pending rows for send-communication Edge Function.
 * Primary path: rows already exist in communication_recipients (created when user queued the campaign).
 */

export type CommunicationChannel = "sms" | "email" | "both";

export type RecipientRow = {
  id: string;
  communication_id: string;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_type: string | null;
  delivery_status: string;
};

/** Beem expects MSISDN digits (often without +). */
export function normalizeSmsDestination(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length < 9) return null;
  if (d.startsWith("255")) return d;
  if (d.startsWith("0")) return `255${d.slice(1)}`;
  return d;
}

export function needsSms(channel: CommunicationChannel): boolean {
  return channel === "sms" || channel === "both";
}

export function needsEmail(channel: CommunicationChannel): boolean {
  return channel === "email" || channel === "both";
}

/** Split work per channel for one recipient row. */
export function recipientChannels(
  channel: CommunicationChannel,
  rec: Pick<RecipientRow, "recipient_email" | "recipient_phone">
): { sendSms: boolean; sendEmail: boolean } {
  const sendSms = needsSms(channel) && !!normalizeSmsDestination(rec.recipient_phone);
  const sendEmail = needsEmail(channel) && !!rec.recipient_email?.trim();
  return { sendSms, sendEmail };
}
