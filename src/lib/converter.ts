import { createPandocInstance } from "./pandoc/core.js";
import type { PandocInstance } from "./pandoc/core.js";

export interface CssFile {
  name: string;
  content: string;
}

export interface ConvertInput {
  source: string;
  cssFiles: CssFile[];
}

export interface ConvertedDoc {
  html: string;
  warnings: string[];
  stderr: string;
}

export interface ProgressInfo {
  loaded: number;
  total: number;
  phase: "download" | "convert";
}

const WASM_URL = "/pandoc.wasm";

let instancePromise: Promise<PandocInstance> | null = null;

function report(
  onProgress: ((p: ProgressInfo) => void) | undefined,
  info: ProgressInfo
) {
  onProgress?.(info);
}

async function loadPandoc(
  onProgress: ((p: ProgressInfo) => void) | undefined
): Promise<PandocInstance> {
  if (!instancePromise) {
    instancePromise = (async () => {
      const res = await fetch(WASM_URL);
      if (!res.ok) {
        throw new Error(
          `No se pudo descargar el motor pandoc (HTTP ${res.status}). Revisa tu conexión e inténtalo de nuevo.`
        );
      }
      const total = Number(res.headers.get("Content-Length")) || 0;
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No se pudo leer el motor pandoc.");
      }
      let received = 0;
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          report(onProgress, { loaded: received, total, phase: "download" });
        }
      }
      const buffer = await new Blob(chunks as BlobPart[]).arrayBuffer();
      report(onProgress, { loaded: total, total, phase: "download" });
      return createPandocInstance(buffer);
    })();
  }
  return instancePromise;
}

function prepareQuartoCopy(source: string): string {
  let s = source.replace(/^```\{[^}]*\}\n/gm, "```\n");
  s = s.replace("theme: [default, custom.css]", "theme: default");
  s = s.replace("chalkboard: true", "chalkboard: false");
  return s;
}

function inlineCss(html: string, cssFiles: CssFile[]): string {
  if (cssFiles.length === 0) return html;
  const blocks = cssFiles.map((f) => `<style>\n${f.content}\n</style>`);
  for (const f of cssFiles) {
    const link = new RegExp(
      `<link[^>]+rel=["']stylesheet["'][^>]+href=["']${f.name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}["'][^>]*>`,
      "i"
    );
    html = html.replace(link, "");
  }
  if (blocks.length && /<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${blocks.join("\n")}\n</head>`);
  } else {
    html = blocks.join("\n") + "\n" + html;
  }
  return html;
}

function addPrintStyles(html: string): string {
  const css = `<style>
@media print {
  @page { size: A4; margin: 2cm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${css}\n</head>`);
  }
  return css + "\n" + html;
}

export async function convertDocument(
  input: ConvertInput,
  onProgress?: (p: ProgressInfo) => void
): Promise<ConvertedDoc> {
  const pandoc = await loadPandoc(onProgress);
  report(onProgress, { loaded: 0, total: 0, phase: "convert" });

  const prepared = prepareQuartoCopy(input.source);

  const files: Record<string, string | Blob> = {};
  for (const css of input.cssFiles) {
    files[css.name] = css.content;
  }

  const options = {
    from: "markdown",
    to: "html",
    standalone: true,
    "embed-resources": true,
    "html-math-method": "mathml",
    ...(input.cssFiles.length > 0
      ? { css: input.cssFiles.map((f) => f.name) }
      : {}),
  };

  const result = await pandoc.convert(options, prepared, files);

  if (!result.stdout || result.stdout.trim().length === 0) {
    const message =
      result.stderr.trim() || "Pandoc no produjo salida. Revisa el documento.";
    throw new Error(message);
  }

  let html = result.stdout;
  html = inlineCss(html, input.cssFiles);
  html = addPrintStyles(html);

  return {
    html,
    warnings: (result.warnings ?? []).map((w) => String(w)),
    stderr: result.stderr,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}