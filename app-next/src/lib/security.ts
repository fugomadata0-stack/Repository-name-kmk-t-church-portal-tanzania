const SECRET_PATTERNS = [
  /(service[_-]?role[_-]?key\s*[:=]\s*)(["']?)[^\s"']+\2/gi,
  /(apikey\s*[:=]\s*)(["']?)[^\s"']+\2/gi,
  /(authorization\s*[:=]\s*bearer\s+)[a-z0-9._-]+/gi,
  /(access[_-]?token\s*[:=]\s*)(["']?)[^\s"']+\2/gi,
  /(refresh[_-]?token\s*[:=]\s*)(["']?)[^\s"']+\2/gi,
];

export function redactSensitiveText(input: string): string {
  let out = input;
  for (const p of SECRET_PATTERNS) out = out.replace(p, "$1[REDACTED]");
  return out;
}

export function safeJsonParseObject(text: string, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    return fallback;
  } catch {
    return fallback;
  }
}

export function safeJsonParseUnknown(text: string, fallback: unknown = null): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return fallback;
  }
}

export const safeStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore storage failures
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  },
};

export const safeSessionStorage = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore storage failures
    }
  },
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage failures
    }
  },
};
