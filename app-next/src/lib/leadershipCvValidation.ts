import type { LeadershipCvBundle } from "../types";
import type { KiongoziRecord } from "../types";
import { isOfficialNationalLeader } from "./officialNationalLeader";

const MIN_BIO = 12;

export type LeadershipCvSaveAssessment = {
  ok: boolean;
  errors: string[];
};

export function assessLeadershipCvSave(
  leader: KiongoziRecord,
  bundle: LeadershipCvBundle,
): LeadershipCvSaveAssessment {
  const errors: string[] = [];
  const bio =
    bundle.profile?.biography?.trim() ||
    leader.biography?.trim() ||
    "";
  const hasPhoto = Boolean(
    bundle.profile?.profile_photo_storage_path?.trim() || leader.photo_url?.trim(),
  );
  const hasSig = Boolean(
    bundle.profile?.signature_storage_path?.trim() || leader.signature_url?.trim(),
  );

  if (isOfficialNationalLeader(leader)) {
    if (!bio || bio.length < MIN_BIO) {
      errors.push("Tafadhali jaza wasifu (angalau herufi 12) kwa kiongozi rasmi wa taifa.");
    }
    if (!hasPhoto) errors.push("Picha ya kiongozi inahitajika — pakia kwanza.");
    if (!hasSig) errors.push("Signature inahitajika — pakia kwanza.");
  } else {
    if (!leader.jina?.trim()) errors.push("Jina la kiongozi linahitajika.");
    if (!leader.cheo?.trim()) errors.push("Cheo kinahitajika.");
    if (!leader.ngazi?.trim() && !leader.leadership_level?.trim()) {
      errors.push("Ngazi / kiwango cha uongozi kinahitajika.");
    }
  }

  const hasAnyCvRow =
    bundle.experience.length > 0 ||
    bundle.education.length > 0 ||
    bundle.certificates.length > 0 ||
    bundle.skills.length > 0 ||
    bundle.attachments.length > 0;

  if (!bio && !hasPhoto && !hasSig && !hasAnyCvRow) {
    errors.push("Hakuna taarifa za kuhifadhi — jaza wasifu, picha au saini.");
  }

  return { ok: errors.length === 0, errors };
}
