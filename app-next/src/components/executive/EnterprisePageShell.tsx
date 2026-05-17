import type { ReactNode } from "react";
import type { PortalLayoutMode } from "../../lib/portalLayoutMode";
import { DashboardHero } from "./DashboardHero";

/** Chombo cha kawaida cha ukurasa — skrini nzima kama Ripoti & Chuja. */
export function EnterprisePageShell({
  mode = "wide",
  title,
  subtitle,
  liveAt,
  heroActions,
  intelligenceStrip,
  children,
  className = "",
}: {
  mode?: PortalLayoutMode;
  title?: string;
  subtitle?: string;
  liveAt?: string | null;
  heroActions?: ReactNode;
  intelligenceStrip?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const layoutClass =
    mode === "fullscreen" ? "min-h-0 h-full flex-1" : "min-h-0 w-full flex-1";
  const shellClass = `enterprise-page-shell flex min-w-0 max-w-[100%] flex-col ${layoutClass} ${className}`;

  const body = (
    <>
      {title && mode !== "fullscreen" ? (
        <div className="mb-3 shrink-0">
          <DashboardHero title={title} subtitle={subtitle} liveAt={liveAt} actions={heroActions} />
        </div>
      ) : null}
      {intelligenceStrip ? <div className="mb-3 w-full min-w-0 shrink-0">{intelligenceStrip}</div> : null}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col space-y-3 [&_.premium-table-shell]:w-full [&_.premium-table-shell]:min-h-0 [&_.premium-table-shell]:flex-1 [&_table]:w-full">
        {children}
      </div>
    </>
  );

  return <div className={shellClass}>{body}</div>;
}
