import { getSupabase } from "../lib/supabaseClient";
import type { PortalNotificationType } from "../types";

/** Arifa za mfumo kupitia RPC (haitaji ruhusa ya moduli ya Notifications). */
export async function enqueueAidWorkflowNotification(input: {
  title: string;
  message: string;
  type?: PortalNotificationType;
  targetRole?: string | null;
  targetUserId?: string | null;
  isGlobal?: boolean;
}): Promise<void> {
  const c = getSupabase();
  if (!c) return;
  try {
    const priority = input.type === "error" || input.type === "warning" ? "warning" : input.type === "success" ? "success" : "info";
    const payload = {
      p_title: input.title.slice(0, 500),
      p_message: input.message.slice(0, 4000),
      p_type: input.type ?? "system",
      p_target_role: input.targetRole?.trim() || null,
      p_target_user_id: input.targetUserId?.trim() || null,
      p_is_global: Boolean(input.isGlobal),
      p_module: "aid_management",
      p_priority: priority,
      p_action_url: "/portal?module=aid_management",
    };
    let { error } = await c.rpc("portal_enqueue_notification", payload);
    if (error) {
      // Backward compatibility kwa deployment ambazo bado zina signature ya zamani.
      ({ error } = await c.rpc("portal_enqueue_notification", {
        p_title: payload.p_title,
        p_message: payload.p_message,
        p_type: payload.p_type,
        p_target_role: payload.p_target_role,
        p_target_user_id: payload.p_target_user_id,
        p_is_global: payload.p_is_global,
      }));
    }
    if (error) throw error;
  } catch {
    /* RPC inaweza kuwa bado haija-deploy — si lazima kuvunja workflow */
  }
}

export async function notifyAidSubmitted(params: { beneficiaryName: string }): Promise<void> {
  await enqueueAidWorkflowNotification({
    title: "Ombi jipya la msaada",
    message: `Ombi limewasilishwa kwa mwanufaika: ${params.beneficiaryName}.`,
    type: "system",
    targetRole: "reviewer",
  });
}

export async function notifyAidInReview(params: { beneficiaryName: string }): Promise<void> {
  await enqueueAidWorkflowNotification({
    title: "Ombi katika ukaguzi",
    message: `Ombi la ${params.beneficiaryName} limehamishwa kwenye ukaguzi.`,
    type: "system",
    targetRole: "approver",
  });
}

export async function notifyAidApproved(params: { beneficiaryName: string }): Promise<void> {
  await enqueueAidWorkflowNotification({
    title: "Ombi limeidhinishwa",
    message: `Ombi la ${params.beneficiaryName} limeidhinishwa.`,
    type: "finance",
    targetRole: "finance_admin",
  });
}

export async function notifyAidRejected(params: {
  beneficiaryName: string;
  creatorUserId?: string | null;
}): Promise<void> {
  await enqueueAidWorkflowNotification({
    title: "Ombi limekataliwa",
    message: `Ombi la ${params.beneficiaryName} limekataliwa.`,
    type: "warning",
    targetUserId: params.creatorUserId ?? null,
    targetRole: params.creatorUserId ? null : "office_admin",
  });
}

export async function notifyAidDelivered(params: {
  beneficiaryName: string;
  creatorUserId?: string | null;
}): Promise<void> {
  await enqueueAidWorkflowNotification({
    title: "Msaada umetolewa",
    message: `Msaada kwa ${params.beneficiaryName} umetolewa / umekamilishwa.`,
    type: "finance",
    targetRole: "finance_admin",
  });
  if (params.creatorUserId) {
    await enqueueAidWorkflowNotification({
      title: "Ombi limekamilishwa",
      message: `Ombi lako la ${params.beneficiaryName} limekamilishwa.`,
      type: "success",
      targetUserId: params.creatorUserId,
    });
  }
}
