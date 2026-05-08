import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BellRing,
  CalendarRange,
  CheckCircle2,
  Coins,
  FileText,
  Info,
  Landmark,
  LockKeyhole,
  PartyPopper,
  Shield,
  Siren,
  TriangleAlert,
  Users,
  XCircle,
} from "lucide-react";
import type { PortalNotificationPriority, PortalNotificationType } from "../../types";

export function notificationTypeMeta(t: PortalNotificationType): {
  label: string;
  Icon: LucideIcon;
  chip: string;
} {
  switch (t) {
    case "success":
      return { label: "Mafaniko", Icon: PartyPopper, chip: "bg-emerald-100 text-emerald-900" };
    case "warning":
      return { label: "Onyo", Icon: AlertTriangle, chip: "bg-amber-100 text-amber-900" };
    case "error":
      return { label: "Hitilafu", Icon: XCircle, chip: "bg-rose-100 text-rose-900" };
    case "event":
      return { label: "Tukio", Icon: CalendarRange, chip: "bg-violet-100 text-violet-900" };
    case "finance":
      return { label: "Fedha", Icon: Coins, chip: "bg-teal-100 text-teal-900" };
    case "auth":
      return { label: "Auth", Icon: LockKeyhole, chip: "bg-blue-100 text-blue-900" };
    case "approval":
      return { label: "Approval", Icon: CheckCircle2, chip: "bg-emerald-100 text-emerald-900" };
    case "document":
      return { label: "Nyaraka", Icon: FileText, chip: "bg-indigo-100 text-indigo-900" };
    case "structure":
      return { label: "Muundo", Icon: Landmark, chip: "bg-cyan-100 text-cyan-900" };
    case "media":
      return { label: "Media", Icon: BellRing, chip: "bg-fuchsia-100 text-fuchsia-900" };
    case "system":
      return { label: "Mfumo", Icon: Shield, chip: "bg-slate-200 text-slate-900" };
    case "info":
    default:
      return { label: "Taarifa", Icon: Info, chip: "bg-sky-100 text-sky-900" };
  }
}

export const NOTIFICATION_TYPE_OPTIONS: { value: PortalNotificationType; label: string }[] = [
  { value: "auth", label: "Auth" },
  { value: "approval", label: "Approvals" },
  { value: "document", label: "Documents" },
  { value: "structure", label: "Church Structure" },
  { value: "media", label: "Media" },
  { value: "event", label: "Events" },
  { value: "system", label: "System" },
  { value: "finance", label: "Finance" },
  { value: "info", label: "Taarifa" },
  { value: "success", label: "Mafaniko" },
  { value: "warning", label: "Onyo" },
  { value: "error", label: "Hitilafu" },
];

export function priorityMeta(priority: PortalNotificationPriority): {
  label: string;
  Icon: LucideIcon;
  chip: string;
} {
  switch (priority) {
    case "critical":
      return { label: "Critical", Icon: Siren, chip: "bg-rose-100 text-rose-900" };
    case "warning":
      return { label: "Warning", Icon: TriangleAlert, chip: "bg-amber-100 text-amber-900" };
    case "success":
      return { label: "Success", Icon: Users, chip: "bg-emerald-100 text-emerald-900" };
    case "info":
    default:
      return { label: "Info", Icon: Info, chip: "bg-sky-100 text-sky-900" };
  }
}

export const PRIORITY_OPTIONS: { value: PortalNotificationPriority; label: string }[] = [
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];
