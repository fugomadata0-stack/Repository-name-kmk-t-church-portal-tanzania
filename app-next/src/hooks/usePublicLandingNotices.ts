import { useCallback, useState } from "react";

export type PublicLandingNoticeLevel = "success" | "info" | "warn";

export type PublicLandingNotice = {
  id: string;
  title: string;
  message: string;
  level: PublicLandingNoticeLevel;
};

let noticeSeq = 0;

export function usePublicLandingNotices() {
  const [notices, setNotices] = useState<PublicLandingNotice[]>([]);

  const dismissNotice = useCallback((id: string) => {
    setNotices((list) => list.filter((n) => n.id !== id));
  }, []);

  const pushNotice = useCallback((input: Omit<PublicLandingNotice, "id">) => {
    const id = `pln-${++noticeSeq}-${Date.now()}`;
    setNotices((list) => [...list.slice(-4), { ...input, id }]);
    window.setTimeout(() => {
      setNotices((list) => list.filter((n) => n.id !== id));
    }, 5200);
    return id;
  }, []);

  return { notices, pushNotice, dismissNotice };
}
