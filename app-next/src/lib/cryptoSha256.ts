/** SHA-256 hex ya UTF-8 — lazima iwe sawa na Postgres digest(convert_to(...,'UTF8'),'sha256'). */
export async function sha256HexUtf8(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
