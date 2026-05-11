import type { ReactNode } from "react";
import type { AboutKmktState, SiteSettingsState } from "../../types";

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  if (!href.trim()) return null;
  return (
    <a href={href.trim()} target="_blank" rel="noopener noreferrer" className="hover:text-amber-300 underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

export function SiteFooter({ site, about }: { site: SiteSettingsState; about: AboutKmktState }) {
  const sl = site.social_links;
  const brand = about.church_name?.trim() || site.meta_title?.trim() || "KMT Portal";
  const year = new Date().getFullYear();

  const emailRaw = (sl.email_public?.trim() ?? "").replace(/^mailt:/i, "mailto:");
  const emailHref = emailRaw
    ? emailRaw.startsWith("http")
      ? emailRaw
      : emailRaw.includes("@")
        ? `mailto:${emailRaw}`
        : emailRaw
    : "";

  const socials = [
    ["WhatsApp", sl.whatsapp],
    ["Facebook", sl.facebook],
    ["YouTube", sl.youtube],
    ["Instagram", sl.instagram],
    ["X", sl.twitter_x],
    ["Barua", emailHref],
  ].filter((x) => String(x[1]).trim());

  const legal = [
    ["Faragha", site.privacy_policy_url],
    ["Masharti", site.terms_of_service_url],
    ["Kuki", site.cookies_notice_url],
    ["Msaada", site.support_url],
  ].filter((x) => String(x[1]).trim());

  return (
    <footer className="mt-auto border-t border-[#1e3a6e]/40 bg-gradient-to-r from-[#0a1628] via-[#0f2744] to-[#0a1628] px-4 py-6 text-sm text-blue-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {socials.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-b border-white/10 pb-4">
            {socials.map(([label, url]) => (
              <ExtLink key={label} href={url as string}>
                {label}
              </ExtLink>
            ))}
          </div>
        ) : null}

        {legal.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium">
            {legal.map(([label, url]) => (
              <ExtLink key={label} href={url as string}>
                {label}
              </ExtLink>
            ))}
          </div>
        ) : null}

        <p className="text-center text-xs text-blue-200/90">
          © {year}{" "}
          <span className="font-semibold text-amber-200/95">{brand}</span>
          {about.abbreviation?.trim() ? <span className="text-blue-300"> · {about.abbreviation.trim()}</span> : null}
          <span className="block pt-1 text-[11px] text-blue-300/80">Portal ya ndani — mipangilio kwenye Mipangilio Mikuu</span>
        </p>
      </div>
    </footer>
  );
}
