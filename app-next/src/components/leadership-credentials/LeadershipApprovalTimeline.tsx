import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import {
  fetchApprovalsForCertificateOptional,
  type LeadershipApprovalRow,
  type OfficialCertificateRow,
  type OfficialCertificateStatus,
} from "../../services/leadershipOfficialCertificateService";
import { LeadershipVerificationBadge } from "./LeadershipVerificationBadge";

const WORKFLOW_STEPS: { status: OfficialCertificateStatus; label: string }[] = [
  { status: "draft", label: "Rasimu" },
  { status: "verified", label: "Imethibitishwa" },
  { status: "pending", label: "Inasubiri idhini" },
  { status: "approved", label: "Imeidhinishwa" },
];

function stepIndex(status: OfficialCertificateStatus): number {
  const i = WORKFLOW_STEPS.findIndex((s) => s.status === status);
  if (i >= 0) return i;
  if (status === "rejected") return 2;
  if (status === "archived") return WORKFLOW_STEPS.length;
  return 0;
}

type Props = {
  certificate: OfficialCertificateRow | null;
};

export function LeadershipApprovalTimeline({ certificate }: Props) {
  const [approvals, setApprovals] = useState<LeadershipApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!certificate?.id) {
      setApprovals([]);
      return;
    }
    let stop = false;
    setLoading(true);
    void (async () => {
      const rows = await fetchApprovalsForCertificateOptional(certificate.id);
      if (!stop) {
        setApprovals(rows);
        setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [certificate?.id]);

  if (!certificate) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-xs text-slate-500">
        Chagua cheti kutoka orodha ili kuona ratiba ya uidhinishaji.
      </div>
    );
  }

  const current = stepIndex(certificate.status);
  const rejected = certificate.status === "rejected";

  return (
    <section className="rounded-2xl border border-[#0B1F3A]/10 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm">
      <motion.div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-[#0B1F3A]">Ratiba ya uidhinishaji</p>
        <LeadershipVerificationBadge status={certificate.status} size="md" />
      </motion.div>
      <p className="mt-0.5 font-mono text-[10px] text-slate-500">{certificate.certificate_number}</p>

      <ol className="relative mt-5 space-y-0 pl-1">
        <div className="absolute bottom-2 left-[11px] top-2 w-0.5 bg-gradient-to-b from-amber-300 via-sky-300 to-emerald-400" aria-hidden />
        {WORKFLOW_STEPS.map((step, i) => {
          const done = !rejected && i <= current;
          const active = !rejected && i === current;
          return (
            <motion.li
              key={step.status}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-amber-400 bg-amber-100 text-amber-800"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-xs font-bold ${done || active ? "text-[#0B1F3A]" : "text-slate-400"}`}>
                  {step.label}
                </p>
                {active && certificate.issued_at ? (
                  <p className="text-[10px] text-slate-500">
                    {new Date(certificate.issued_at).toLocaleString("sw-TZ")}
                  </p>
                ) : null}
              </div>
            </motion.li>
          );
        })}
        {rejected ? (
          <li className="relative flex gap-3 pb-0">
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-red-400 bg-red-100 text-red-700">
              <XCircle className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-bold text-red-800">Imekataliwa</p>
          </li>
        ) : null}
      </ol>

      {loading ? (
        <p className="mt-2 text-[10px] text-slate-500">Inapakia maamuzi…</p>
      ) : approvals.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {approvals.map((a) => (
            <li key={a.id} className="rounded-lg bg-white px-2 py-1.5 text-[10px] text-slate-600 ring-1 ring-slate-100">
              <span className="font-semibold text-[#0B1F3A]">
                {a.approver_name || "Msimamizi"} · Hatua {a.approval_step}
              </span>
              {a.decided_at ? (
                <span className="ml-1 text-slate-400">— {new Date(a.decided_at).toLocaleString("sw-TZ")}</span>
              ) : (
                <Clock className="ml-1 inline h-3 w-3 text-amber-600" />
              )}
              {a.decision_notes ? <p className="mt-0.5 italic">{a.decision_notes}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
