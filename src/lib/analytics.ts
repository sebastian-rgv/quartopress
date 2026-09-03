const TRACKING_KEY = "quartopress-views";

export function trackPageView(): void {
  try {
    const raw = localStorage.getItem(TRACKING_KEY);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    const today = new Date().toISOString().slice(0, 10);
    data[today] = (data[today] || 0) + 1;

    const keys = Object.keys(data).sort().slice(-30);
    const trimmed: Record<string, number> = {};
    keys.forEach((k) => (trimmed[k] = data[k]));
    localStorage.setItem(TRACKING_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function trackConversion(format: string): void {
  try {
    const key = `quartopress-conv-${format}`;
    const count = parseInt(localStorage.getItem(key) || "0", 10);
    localStorage.setItem(key, String(count + 1));
  } catch {}
}

export function getStats(): { daily: Record<string, number>; conversions: Record<string, number> } {
  try {
    const raw = localStorage.getItem(TRACKING_KEY);
    const daily: Record<string, number> = raw ? JSON.parse(raw) : {};
    const formats = ["html", "pdf", "ipynb", "docx", "epub"];
    const conversions: Record<string, number> = {};
    formats.forEach((f) => {
      conversions[f] = parseInt(localStorage.getItem(`quartopress-conv-${f}`) || "0", 10);
    });
    return { daily, conversions };
  } catch {
    return { daily: {}, conversions: {} };
  }
}
