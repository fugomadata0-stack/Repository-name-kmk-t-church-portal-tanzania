export const paymentRoleAccess = {
  super_admin: { add: true, edit: true, verify: true, refund: true, clear: true, export: true, print: true },
  admin: { add: true, edit: true, verify: true, refund: true, clear: true, export: true, print: true },
  finance_officer: { add: true, edit: true, verify: true, refund: true, clear: false, export: true, print: true },
  askofu_dayosisi: { add: true, edit: false, verify: true, refund: false, clear: false, export: true, print: true },
  member: { add: true, edit: false, verify: false, refund: false, clear: false, export: false, print: false },
};

export const paymentFields = [
  { key: "tarehe", label: "Tarehe", type: "date", required: true },
  { key: "mlipaji", label: "Mlipaji", required: true },
  { key: "mawasiliano", label: "Simu / Email", required: true },
  { key: "channel", label: "Payment Channel", options: ["M-Pesa", "Airtel Money", "Tigo Pesa", "HaloPesa", "Card"], required: true },
  { key: "purpose", label: "Purpose", required: true },
  { key: "amount", label: "Amount", type: "number", required: true },
  { key: "reference", label: "Reference", required: true },
  { key: "verification_status", label: "Verification Status", options: ["pending", "verified", "rejected"], required: true },
  { key: "final_status", label: "Final Status", options: ["pending", "success", "failed", "refunded"], required: true },
];
