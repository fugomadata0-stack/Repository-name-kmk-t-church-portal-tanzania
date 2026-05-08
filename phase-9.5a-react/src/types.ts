export type RoleName =
  | "Super Admin"
  | "Bishop"
  | "Pastor"
  | "Treasurer"
  | "Secretary"
  | "Branch Leader";

export type AttendanceItems = {
  wakubwa: number;
  watoto: number;
  wageniMe: number;
  wageniKe: number;
  waliotubu: number;
  waliookoka: number;
  waliobatizwa: number;
};

export type OfferingItems = {
  sadaka: number;
  zaka: number;
  matoleo: number;
  fedhaTaslimu: number;
  fedhaSimuBank: number;
  matumizi: number;
  salioLilipita: number;
};

export type WorshipServiceRecord = {
  id: number;
  tarehe: string;
  dayosisi: string;
  jimbo: string;
  tawi: string;
  ainaYaIbada: string;
  ibada1: number;
  ibada2: number;
  jumlaMahudhurio: number;
  jumlaMapato: number;
  salioJipya: number;
  mhubiri: string;
  approvalStatus: string;
  createdBy: string;
  lastUpdated: string;
};

export type ApprovalStep = {
  name: string;
  role: string;
  status: string;
  date: string;
  comments: string;
};

export type Attachment = {
  recordId: number;
  fileName: string;
  type: string;
  uploadedBy: string;
  uploadDate: string;
  visibility: string;
};

export type AuditLog = {
  date: string;
  user: string;
  role: string;
  action: string;
  recordId: number;
  oldValue: string;
  newValue: string;
  status: string;
};
