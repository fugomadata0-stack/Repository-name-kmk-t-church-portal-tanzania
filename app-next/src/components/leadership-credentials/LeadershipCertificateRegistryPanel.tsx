import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Archive, CheckCircle2, Clock, ExternalLink, FileCheck2, XCircle } from "lucide-react";
import {
  CREDENTIAL_DOCUMENT_LABELS,
  type CredentialDocumentKind,
} from "../../lib/certificateEngine";
import { buildOfficialCertificateVerificationUrl } from "../../lib/kmktExecutiveInstitution";
import {
  approveOfficialCertificateOptional,
  archiveOfficialCertificateOptional,
  rejectOfficialCertificateOptional,
  submitCertificateForApprovalOptional,
  type OfficialCertificateRow,
} from "../../services/leadershipOfficialCertificateService";
import { LeadershipVerificationBadge } from "./LeadershipVerificationBadge";

type Props = {
  certificates: OfficialCertificateRow[];
  canEdit: boolean;
  approverName?: string;
  approverTitle?: string;
  selectedId?: string | null;
  onSelect?: (cert: OfficialCertificateRow) => void;
  onRefresh: () => void;
};

export function LeadershipCertificateRegistryPanel({
  certificates,
  canEdit,
  approverName,
  approverTitle,
  selectedId,
  onSelect,
  onRefresh,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const runAction = useCallback(
    async (id: string, fn: () => Promise<boolean>) => {
      setBusyId(id);
      try {
        const ok = await fn();
        if (ok) onRefresh();
      } finally {
        setBusyId(null);
      }
    },
    [onRefresh],
  );

  if (!certificates.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-xs text-slate-500">
        Hakuna cheti rasmi bado — pakua PDF ili kusajili kwenye database.
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-[#0B1F3A]/10 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-bold text-[#0B1F3A]">
        <FileCheck2 className="h-4 w-4 text-amber-600" aria-hidden />
        Usajili wa Vyeti Rasmi
      </p>
      <p className="mt-0.5 text-[11px] text-slate-500">Bofya cheti kuona ratiba ya uidhinishaji</p>
      <ul className="mt-3 space-y-2">
        {certificates.map((cert, i) => {
          const doc =
            CREDENTIAL_DOCUMENT_LABELS[cert.document_kind as CredentialDocumentKind]?.sw ??
            cert.document_kind;
          const busy = busyId === cert.id;
          const selected = selectedId === cert.id;
          const verifyUrl =
            cert.verify_url?.trim() ||
            buildOfficialCertificateVerificationUrl(origin, cert.verification_id);
          return (
            <motion.li
              key={cert.id}
              layout
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(cert)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect?.(cert);
              }}
              className={`cursor-pointer rounded-xl border px-3 py-2.5 transition ${
                selected
                  ? "border-amber-400 bg-amber-50/60 shadow-md ring-1 ring-amber-300/50"
                  : "border-slate-100 bg-gradient-to-r from-slate-50/80 to-white hover:border-amber-200/60 hover:shadow-sm"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0B1F3A]">{doc}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-emerald-800">{cert.certificate_number}</p>
                  <p className="font-mono text-[10px] text-sky-800">VRF: {cert.verification_id}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {new Date(cert.created_at).toLocaleString("sw-TZ")}
                  </p>
                </div>
                <LeadershipVerificationBadge status={cert.status} size="md" />
              </div>
              {verifyUrl ? (
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#123C69] underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Uhakiki wa umma
                </a>
              ) : null}
              {canEdit ? (
                <div className="mt-2 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {cert.status === "verified" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(cert.id, () =>
                          submitCertificateForApprovalOptional(cert.id, {
                            approverName,
                            approverTitle,
                          }),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <Clock className="h-3 w-3" />
                      Wasilisha
                    </button>
                  ) : null}
                  {cert.status === "pending" || cert.status === "verified" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(cert.id, () =>
                          approveOfficialCertificateOptional(cert.id, {
                            approverName,
                            approverTitle,
                          }),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Idhinisha
                    </button>
                  ) : null}
                  {cert.status !== "rejected" && cert.status !== "archived" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(cert.id, () =>
                          rejectOfficialCertificateOptional(cert.id, "Imekataliwa na msimamizi."),
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                    >
                      <XCircle className="h-3 w-3" />
                      Kataa
                    </button>
                  ) : null}
                  {cert.status !== "archived" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void runAction(cert.id, () => archiveOfficialCertificateOptional(cert.id))}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <Archive className="h-3 w-3" />
                      Hifadhi
                    </button>
                  ) : null}
                </div>
              ) : null}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
