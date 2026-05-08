import type { Status } from "../../types";

const map: Record<Status, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Inactive: "bg-slate-200 text-slate-700",
  Archived: "bg-zinc-200 text-zinc-700",
  "Needs Review": "bg-rose-100 text-rose-700",
  Draft: "bg-slate-100 text-slate-700",
  Submitted: "bg-sky-100 text-sky-800",
  Verified: "bg-indigo-100 text-indigo-800",
  Approved: "bg-emerald-200 text-emerald-900",
  "Posted to Ledger": "bg-teal-100 text-teal-900",
  Locked: "bg-orange-100 text-orange-900",
  "Reversed / Cancelled": "bg-rose-200 text-rose-900",
};
export function StatusBadge({ status }: { status: Status | string }) {
  const cls = map[status as Status] || "bg-slate-100 text-slate-700";
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${cls}`}>{status}</span>;
}
