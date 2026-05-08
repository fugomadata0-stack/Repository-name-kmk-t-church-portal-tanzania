/** Majukumu yanayoweza kuombwa kwenye fomu ya usajili wa umma — orodha ya kibali (sio data ya mfano). */

export const PHASE33_PUBLIC_ROLES = [
  "Diocese Data Officer",
  "Jimbo Data Officer",
  "Branch Data Officer",
  "Department Officer",
  "Fellowship Officer",
  "Choir Officer",
  "Institution Officer",
  "Events Officer",
  "Publications/Media Officer",
  "Viewer / Mtazamaji",
] as const;

export type Phase33PublicRole = (typeof PHASE33_PUBLIC_ROLES)[number];
