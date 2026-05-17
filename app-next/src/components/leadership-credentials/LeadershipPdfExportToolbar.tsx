import type { RefObject } from "react";
import type { BuiltLeadershipPdf } from "../../lib/leadershipPdfEngine/types";
import { PrintPdfMasterToolbar } from "../print-pdf-master/PrintPdfMasterToolbar";

type Props = {
  built: BuiltLeadershipPdf | null;
  previewRef?: RefObject<HTMLElement | null>;
  previewFilename?: string;
  busy?: boolean;
  disabled?: boolean;
  onDone?: () => void;
  onError?: (message: string) => void;
};

/** Legacy export name — delegates to Print & PDF Master Engine toolbar. */
export function LeadershipPdfExportToolbar(props: Props) {
  return <PrintPdfMasterToolbar {...props} />;
}
