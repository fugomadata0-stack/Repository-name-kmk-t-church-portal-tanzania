import { motion } from "framer-motion";
import { CheckCircle2, UserPlus, UserRound } from "lucide-react";
import type { RoleSlotAssignment } from "../../services/executiveLeadershipProfileService";
import { LeadershipVerificationBadge } from "../leadership-credentials/LeadershipVerificationBadge";

type Props = {
  slots: RoleSlotAssignment[];
  selectedLeaderId: string | null;
  onSelectLeader: (leaderId: string) => void;
  onAssignSlot: (roleKey: string) => void;
};

export function HierarchyRoleBoard({ slots, selectedLeaderId, onSelectLeader, onAssignSlot }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {slots.map((slot, i) => {
        const filled = slot.assignedLeader || slot.nationalRow;
        const name =
          slot.assignedLeader?.jina ||
          slot.assignedLeader?.full_name ||
          slot.nationalRow?.full_name ||
          null;
        const leaderId = slot.assignedLeader?.id ?? null;
        const selected = leaderId && selectedLeaderId === leaderId;
        return (
          <motion.article
            key={slot.role.role_key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`rounded-2xl border p-4 shadow-sm transition ${
              selected
                ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-300/40"
                : filled
                  ? "border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40"
                  : "border-dashed border-slate-200 bg-slate-50/60"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">{slot.role.title_sw}</p>
                <p className="text-[10px] text-slate-500">{slot.role.title_en}</p>
              </div>
              {filled ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <UserPlus className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              )}
            </div>
            {slot.role.role_key === "mkuu_wa_jimbo" && slot.role.jimbo_leader_variant ? (
              <p className="mt-1 text-[10px] font-medium text-amber-800">
                Aina: {slot.role.jimbo_leader_variant}
              </p>
            ) : null}
            <div className="mt-3 min-h-[2.5rem]">
              {name ? (
                <button
                  type="button"
                  onClick={() => leaderId && onSelectLeader(leaderId)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-2 text-left text-sm font-semibold text-[#0B1F3A] hover:border-amber-300"
                >
                  <UserRound className="h-4 w-4 text-[#123C69]" />
                  <span className="truncate">{name}</span>
                </button>
              ) : slot.nationalRow ? (
                <p className="text-sm font-semibold text-[#0B1F3A]">{slot.nationalRow.full_name}</p>
              ) : (
                <p className="text-xs italic text-slate-500">Nafasi haijajazwa</p>
              )}
            </div>
            {slot.nationalRow ? (
              <div className="mt-2">
                <LeadershipVerificationBadge
                  status={slot.nationalRow.status === "active" ? "verified" : "pending"}
                  size="sm"
                />
              </div>
            ) : null}
            {!filled && slot.role.level_key !== "national" ? (
              <button
                type="button"
                onClick={() => onAssignSlot(slot.role.role_key)}
                className="mt-3 w-full rounded-lg border border-[#0B1F3A]/15 bg-white py-1.5 text-[11px] font-semibold text-[#0B1F3A] hover:bg-amber-50"
              >
                Chagua kiongozi
              </button>
            ) : null}
          </motion.article>
        );
      })}
    </div>
  );
}
