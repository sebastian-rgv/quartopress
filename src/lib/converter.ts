import { createPandocInstance } from "./pandoc/core.js";
import type { PandocInstance } from "./pandoc/core.js";

export interface ConvertInput {
  source: string;
}

export interface ConvertedDoc {
  html: string;
  warnings: string[];
  stderr: string;
}

export interface NotebookResult {
  json: string;
  kernel: string | null;
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

interface KernelSpec {
  name: string;
  displayName: string;
  language: string;
}

const KERNELS: Record<string, KernelSpec> = {
  r: { name: "ir", displayName: "R", language: "R" },
  python: { name: "python3", displayName: "Python 3", language: "python" },
  py: { name: "python3", displayName: "Python 3", language: "python" },
  julia: { name: "julia-1.10", displayName: "Julia 1.10", language: "julia" },
};

function detectLanguage(source: string): string | null {
  const m = source.match(/^```\{?\.?([a-zA-Z0-9]+)/m);
  return m ? m[1].toLowerCase() : null;
}

function fencesToCodeCells(source: string): string {
  return source.replace(
    /^```([^\n]*)\n([\s\S]*?)^```\s*$/gm,
    (_match, info: string, body: string) => {
      const lang = info
        .replace(/^\{/, "")
        .replace(/\}$/, "")
        .replace(/^\./, "")
        .split(/[,;\s]+/)[0]
        .trim();
      const cls = lang ? `{.${lang} .code}` : "{.code}";
      return "```" + cls + "\n" + body + "```";
    }
  );
}

function injectKernelspec(source: string, kernel: KernelSpec): string {
  const block = `jupyter:
  kernelspec:
    display_name: ${kernel.displayName}
    language: ${kernel.language}
    name: ${kernel.name}
`;
  const fm = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (fm) {
    if (/^jupyter\s*:/m.test(fm[1])) return source;
    return source.replace(/^---\s*\n/, "---\n" + block);
  }
  return "---\n" + block + "---\n" + source;
}

export async function convertDocument(
  input: ConvertInput,
  onProgress?: (p: ProgressInfo) => void
): Promise<ConvertedDoc> {
  const pandoc = await loadPandoc(onProgress);
  report(onProgress, { loaded: 0, total: 0, phase: "convert" });

  const prepared = prepareQuartoCopy(input.source);

  const options = {
    from: "markdown",
    to: "html",
    standalone: true,
    "embed-resources": true,
    "html-math-method": "mathml",
  };

  const result = await pandoc.convert(options, prepared, {});

  if (!result.stdout || result.stdout.trim().length === 0) {
    const message =
      result.stderr.trim() || "Pandoc no produjo salida. Revisa el documento.";
    throw new Error(message);
  }

  let html = result.stdout;
  html = addPrintStyles(html);

  return {
    html,
    warnings: (result.warnings ?? []).map((w) => String(w)),
    stderr: result.stderr,
  };
}

export async function convertNotebook(
  input: ConvertInput,
  onProgress?: (p: ProgressInfo) => void
): Promise<NotebookResult> {
  const pandoc = await loadPandoc(onProgress);
  report(onProgress, { loaded: 0, total: 0, phase: "convert" });

  const lang = detectLanguage(input.source);
  const kernel = lang ? (KERNELS[lang] ?? null) : null;

  let prepared = fencesToCodeCells(input.source);
  if (kernel) prepared = injectKernelspec(prepared, kernel);

  const result = await pandoc.convert(
    { from: "markdown", to: "ipynb" },
    prepared,
    {}
  );

  if (!result.stdout || result.stdout.trim().length === 0) {
    const message =
      result.stderr.trim() || "Pandoc no produjo salida. Revisa el documento.";
    throw new Error(message);
  }

  return { json: result.stdout, kernel: kernel?.name ?? null };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}