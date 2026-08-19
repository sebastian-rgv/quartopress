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
  // Normaliza line endings Windows (CRLF) y CR sueltos: los .qmd vienen
  // con \r\n y los regex de limpieza de chunks solo matchean \n.
  let s = source.replace(/\r\n?/g, "\n");
  // Convierte ```{r,echo=TRUE} o ```{.r} a ```r conservando el lenguaje,
  // para que pandoc genere <pre class="sourceCode r"> y se pueda estilar.
  s = s.replace(/^```\{([^}]*)\}\n/gm, (_match, opts: string) => {
    const lang = opts.replace(/^\.?/, "").split(/[,;\s]+/)[0].trim();
    return lang ? "```" + lang + "\n" : "```\n";
  });
  s = wrapMathEnvironments(s);
  // texmath (pandoc) no soporta \hspace; lo convertimos a \qquad.
  s = s.replace(/\\hspace\*?\{[^}]*\}/g, "\\qquad");
  s = s.replace("theme: [default, custom.css]", "theme: default");
  s = s.replace("chalkboard: true", "chalkboard: false");
  return s;
}

function addPrintStyles(html: string): string {
  const css = `<style>
pre {
  background: #f6f8fa;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.9em;
  margin: 1em 0;
}
pre code {
  background: transparent;
  padding: 0;
  white-space: pre;
}
/* Sintaxis: colores fuertes (clases de pandoc/pygments) */
.sourceCode .kw { color: #a626a4; font-weight: 600; }
.sourceCode .fu { color: #0550ae; }
.sourceCode .st { color: #116329; }
.sourceCode .dv, .sourceCode .fl { color: #b35900; }
.sourceCode .co, .sourceCode .ch, .sourceCode .c1 { color: #6e7781; font-style: italic; }
.sourceCode .cn { color: #953800; }
.sourceCode .ot { color: #8250df; }
.sourceCode .at { color: #953800; }
.sourceCode .sc { color: #0550ae; }
.sourceCode .dt { color: #116329; }
.sourceCode .er { color: #cf222e; font-weight: 600; }
@media (prefers-color-scheme: dark) {
  pre {
    background: #161b22;
    border-color: #30363d;
    color: #e6edf3;
  }
  .sourceCode .kw { color: #ff7b72; }
  .sourceCode .fu { color: #79c0ff; }
  .sourceCode .st { color: #a5d6ff; }
  .sourceCode .dv, .sourceCode .fl { color: #f2cc60; }
  .sourceCode .co, .sourceCode .ch, .sourceCode .c1 { color: #8b949e; }
  .sourceCode .cn { color: #ffa657; }
  .sourceCode .ot { color: #d2a8ff; }
  .sourceCode .at { color: #ffa657; }
  .sourceCode .sc { color: #79c0ff; }
  .sourceCode .dt { color: #a5d6ff; }
  .sourceCode .er { color: #ff7b72; }
}
@media print {
  @page { size: A4; margin: 2cm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  pre {
    background: #f6f8fa !important;
    border: 1px solid #999 !important;
    color: #000 !important;
    page-break-inside: avoid;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  pre code { white-space: pre-wrap; }
  .sourceCode .kw { color: #a626a4 !important; }
  .sourceCode .fu { color: #0550ae !important; }
  .sourceCode .st { color: #116329 !important; }
  .sourceCode .dv, .sourceCode .fl { color: #b35900 !important; }
  .sourceCode .co, .sourceCode .ch, .sourceCode .c1 { color: #6e7781 !important; }
  .sourceCode .cn { color: #953800 !important; }
  .sourceCode .ot { color: #8250df !important; }
}
</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${css}\n</head>`);
  }
  return css + "\n" + html;
}

/**
 * Envuelve bloques \begin{align*}/\end{align*} (y variantes align, equation,
 * gather) que estén sueltos entre $$...$$ para que pandoc los convierta a
 * MathML. Sin los delimitadores, pandoc los deja como texto plano.
 */
function wrapMathEnvironments(s: string): string {
  const BEGIN = /\\begin\{(align|align\*|equation|equation\*|gather|gather\*)\}/;
  const END = /\\end\{(align|align\*|equation|equation\*|gather|gather\*)\}/;
  const lines = s.split("\n");
  const out: string[] = [];
  let inMath = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inMath && BEGIN.test(line)) {
      const prev = out.length ? out[out.length - 1].trimEnd() : "";
      if (!prev.endsWith("$$")) out.push("$$");
      out.push(line);
      inMath = true;
      continue;
    }
    if (inMath && END.test(line)) {
      out.push(line);
      const next = lines[i + 1]?.trimStart() ?? "";
      if (!next.startsWith("$$")) out.push("$$");
      inMath = false;
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
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