import { BadgeCheck, Clock, ShieldAlert, ShieldOff } from "lucide-react";
import type { OfficialCertificateStatus } from "../../services/leadershipOfficialCertificateService";
import { OFFICIAL_CERT_STATUS_LABELS } from "../../services/leadershipOfficialCertificateService";

const ICONS: Partial<Record<OfficialCertificateStatus, typeof BadgeCheck>> = {
  approved: BadgeCheck,
  verified: BadgeCheck,
  pending: Clock,
  rejected: ShieldOff,
  archived: ShieldAlert,
  draft: Clock,
};

type Props = {
  status: OfficialCertificateStatus;
  size?: "sm" | "md";
  showEn?: boolean;
};

export function LeadershipVerificationBadge({ status, size = "sm", showEn = false }: Props) {
  const meta = OFFICIAL_CERT_STATUS_LABELS[status] ?? OFFICIAL_CERT_STATUS_LABELS.draft;
  const Icon = ICONS[status] ?? Clock;
  const pad = size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold ring-1 ring-inset ${pad} ${meta.tone}`}
      title={showEn ? meta.en : meta.sw}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} aria-hidden />
      {meta.sw}
    </span>
  );
}
