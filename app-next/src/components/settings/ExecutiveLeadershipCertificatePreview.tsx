import type { NationalLeadershipProfileRow } from "../../services/nationalLeadershipService";
import { nationalLeadershipDisplayTitle } from "../../services/nationalLeadershipService";
import { ExecutiveInstitutionalCertificatePreview } from "../executive/ExecutiveInstitutionalCertificatePreview";

/** Hakiki ya cheti cha uongozi wa kitaifa — muundo wa kiwango cha juu (theme + branding). */
export function ExecutiveLeadershipCertificatePreview({ row }: { row: NationalLeadershipProfileRow }) {
  const titleSw = nationalLeadershipDisplayTitle(row, "sw");
  const titleEn = nationalLeadershipDisplayTitle(row, "en");

  return (
    <ExecutiveInstitutionalCertificatePreview
      fullName={row.full_name.trim() || "—"}
      titleSw={titleSw}
      titleEn={titleEn}
      subtitle={`${titleSw} · Uongozi wa Kitaifa`}
      biography={row.leadership_quote || row.biography || undefined}
      photoUrl={row.profile_photo_url}
      serial={row.role_key}
      roleKey={row.role_key}
      cheo={titleSw}
      leadershipLevel="national"
      documentKind="certificate"
      certTitleSw="WASIFU RASMI WA KIONGOZI"
      certTitleEn="Executive Leadership Profile"
    />
  );
}
