/**
 * Pakua DOM node kama PNG (hakiki ya cheti / kadi) — tumia html2canvas (lazy).
 */
export async function downloadDomAsPng(
  element: HTMLElement,
  filenameBase: string,
  scale = 2,
): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");
  const safe = filenameBase.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "kmkt-export";
  const canvas = await html2canvas(element, {
    scale: Math.min(4, Math.max(2, scale)),
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: "#fffdf7",
  });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe}.png`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
