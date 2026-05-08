/**
 * Provider adapters for SMS/Email (server-side only).
 *
 * Never send SMS/Email directly from the frontend using secret keys.
 * Wire Twilio, Africa's Talking, Beem, SendGrid, Resend, or SMTP in a
 * Supabase Edge Function (see supabase/functions/send-communication/README.md).
 */

export type SmsProviderId = "twilio" | "africastalking" | "beem" | "generic_http";

export type EmailProviderId = "sendgrid" | "resend" | "smtp_edge";

/** Placeholder: real dispatch happens in Edge Functions with env secrets. */
export function describeSmsAdapter(provider: SmsProviderId): string {
  switch (provider) {
    case "twilio":
      return "Twilio REST API — TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN";
    case "africastalking":
      return "Africa's Talking — AFRICASTALKING_API_KEY, username";
    case "beem":
      return "Beem Africa — BEEM_API_KEY";
    case "generic_http":
      return "Generic HTTP POST — custom URL + auth header in Edge env";
    default:
      return "unknown";
  }
}

export function describeEmailAdapter(provider: EmailProviderId): string {
  switch (provider) {
    case "sendgrid":
      return "SendGrid — SENDGRID_API_KEY";
    case "resend":
      return "Resend — RESEND_API_KEY";
    case "smtp_edge":
      return "SMTP or transactional API via Edge Function (no browser secrets)";
    default:
      return "unknown";
  }
}
