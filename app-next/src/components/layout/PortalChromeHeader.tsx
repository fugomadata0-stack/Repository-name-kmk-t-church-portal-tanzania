import { memo, type ReactNode } from "react";

type Props = {
  topbar: ReactNode;
  menu?: ReactNode | null;
};

/** Kichwa cha portal — kimetengwa kutoka eneo la scroll (hakuna sticky/blur ya gharama). */
function PortalChromeHeaderInner({ topbar, menu }: Props) {
  return (
    <div className="portal-chrome-header" data-portal-chrome-header>
      <div className="portal-chrome-header__top">{topbar}</div>
      {menu ? <div className="portal-chrome-header__menu">{menu}</div> : null}
    </div>
  );
}

export const PortalChromeHeader = memo(PortalChromeHeaderInner);
