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

export interface SlidesResult {
  html: string;
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
  // Normaliza lineamientos Windows (CRLF) y CR sueltos: los .qmd vienen
  // con \r\n y los regex de limpieza de chunks solo matchean \n.
  let s = source.replace(/\r\n?/g, "\n");
  s = applyChunkOptions(s);
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
  background: #f6f8fa !important;
  border: 1px solid #b6c2cf !important;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.9em;
  margin: 1em 0;
  max-width: 100%;
  box-sizing: border-box;
  color: #1f2328 !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  overflow-wrap: anywhere !important;
}
pre code {
  background: transparent;
  padding: 0;
  color: inherit !important;
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  overflow-wrap: anywhere !important;
}
/* Sintaxis: colores fuertes (clases de pandoc/pygments) — fijos, sin modo oscuro */
.sourceCode .kw { color: #9d1bc4 !important; font-weight: 700; }
.sourceCode .fu { color: #0446b8 !important; }
.sourceCode .st { color: #0a6b28 !important; }
.sourceCode .dv, .sourceCode .fl { color: #9a4a00 !important; }
.sourceCode .co, .sourceCode .ch, .sourceCode .c1 { color: #57606a !important; font-style: italic; }
.sourceCode .cn { color: #8a3a00 !important; }
.sourceCode .ot { color: #6e2bd6 !important; }
.sourceCode .at { color: #8a3a00 !important; }
.sourceCode .sc { color: #0446b8 !important; }
.sourceCode .dt { color: #0a6b28 !important; }
.sourceCode .er { color: #b0080e !important; font-weight: 700; }
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

function parseChunkOptions(info: string): Record<string, string | boolean> {
  const record: Record<string, string | boolean> = {};
  if (!info || info.trim() === '') {
    return record;
  }
  const lines = info.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Modern Quarto #| key: value format
    const m1 = trimmed.match(/^#\|\s*(\w+)\s*:\s*(.+)$/);
    if (m1) {
      const key = m1[1].toLowerCase();
      let value = m1[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        record[key] = value.toLowerCase() === 'true';
      } else {
        record[key] = value;
      }
      continue;
    }
    // Classic key: value format (without #|)
    const m2 = trimmed.match(/^(\w+)\s*:\s*(.+)$/);
    if (m2) {
      const key = m2[1].toLowerCase();
      let value = m2[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        record[key] = value.toLowerCase() === 'true';
      } else {
        record[key] = value;
      }
      continue;
    }
    // Classic key=value format
    const m3 = trimmed.match(/^(\w+)=(.+)$/);
    if (m3) {
      const key = m3[1].toLowerCase();
      let value = m3[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        record[key] = value.toLowerCase() === 'true';
      } else {
        record[key] = value;
      }
      continue;
    }
  }
  return record;
}

function applyChunkOptions(source: string): string {
  return source.replace(
    /^```\{([^\r\n]*)\r?\n([\s\S]*?)^```[ \t]*\r?$/gm,
    (_match, info, body) => {
      const opts = parseChunkOptions(info);
      // echo: false => hide the whole code block (omit the chunk)
      if (opts.echo === false) {
        return '';
      }
      // include: false => drop the chunk entirely
      if (opts.include === false) {
        return '';
      }
// eval: false => keep the code block (strip option lines), no output
      if (opts.eval === false) {
        const cleanBody = body.replace(/^#\|\s*\w+\s*:/gm, '');
        const lang = info.replace(/^\.?/, "").split(/[,;\s]+/)[0].trim();
        return lang ? "```" + lang + "\n" + cleanBody + "```" : "```\n" + cleanBody + "```";
      }
      // fig-cap: "..." => replace img alt with fig-cap, strip the #| fig-cap line
      if (opts['fig-cap']) {
        const figCap = String(opts['fig-cap']).replace(/^["']|["']$/g, '');
        const withFigCap = body.replace(/!\[(.*?)\]\((.*?)\)/g, (_: string, alt: string, src: string) => {
          return `![${figCap}](${src})`;
        });
        const cleanBody = withFigCap.replace(/^#\|\s*fig-cap:\s*:?/gm, '');
        const lang = info.replace(/^\.?/, "").split(/[,;\s]+/)[0].trim();
        return lang ? "```" + lang + "\n" + cleanBody + "```" : "```\n" + cleanBody + "```";
      }
      // Default: strip option lines, keep code (current behavior)
      const cleanBody = body.replace(/^#\|\s*\w+\s*:/gm, '');
      const lang = info.replace(/^\.?/, "").split(/[,;\s]+/)[0].trim();
      return lang ? "```" + lang + "\n" + cleanBody + "```" : "```\n" + cleanBody + "```";
    }
  );
}

function fencesToCodeCells(source: string): string {
  return source.replace(
    /^```([^\r\n]*)[ \t]*\r?\n([\s\S]*?)^```[ \t]*\r?$/gm,
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

export async function convertSlides(
  input: ConvertInput,
  onProgress?: (p: ProgressInfo) => void
): Promise<SlidesResult> {
  const pandoc = await loadPandoc(onProgress);
  report(onProgress, { loaded: 0, total: 0, phase: "convert" });

  const prepared = prepareQuartoCopy(input.source);

  const options = {
    from: "markdown",
    to: "revealjs",
    standalone: true,
    // revealjs-url debe ir como metadata/variable, no como opción directa:
    // como opción directa pandoc lo ignora y cae al CDN de unpkg.
    metadata: { "revealjs-url": "/reveal" },
  };

  const result = await pandoc.convert(options, prepared, {});

  if (!result.stdout || result.stdout.trim().length === 0) {
    const message =
      result.stderr.trim() || "Pandoc no produjo salida. Revisa el documento.";
    throw new Error(message);
  }

  let html = result.stdout;
  html = await inlineRevealAssets(html);

  return { html };
}

async function inlineRevealAssets(html: string): Promise<string> {
  const tags: Array<{tag: string, url: string}> = [];
  const tagRe = /<(script|link)[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch = tag.match(/src=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (srcMatch) {
      tags.push({ tag, url: srcMatch[1] });
    } else if (hrefMatch) {
      tags.push({ tag, url: hrefMatch[1] });
    }
  }

  const processed = await Promise.all(
    tags.map(async ({ tag, url }) => {
      try {
        const base = typeof window !== "undefined" ? window.location.origin : "";
        const fullUrl = url.startsWith("/") ? base + url : url;
        const res = await fetch(fullUrl);
        if (!res.ok) return tag;
        const content = await res.text();
        if (tag.startsWith("<script")) {
          return `<script>${content}</script>`;
        }
        if (tag.startsWith("<link")) {
          return `<style>${content}</style>`;
        }
        return tag;
      } catch {
        return tag;
      }
    })
  );

  let output = html;
  for (let i = 0; i < tags.length; i++) {
    output = output.replace(tags[i].tag, processed[i]);
  }
  return output;
}

export async function convertNotebook(
  input: ConvertInput,
  onProgress?: (p: ProgressInfo) => void
): Promise<NotebookResult> {
  const pandoc = await loadPandoc(onProgress);
  report(onProgress, { loaded: 0, total: 0, phase: "convert" });

  // Normaliza CRLF (rompía la limpieza de chunks y el front matter) y
  // envuelve fórmulas align* sueltas en $$...$$ para que se vean como
  // LaTeX renderizable en las celdas markdown del notebook.
  const normalized = input.source.replace(/\r\n?/g, "\n");
  const lang = detectLanguage(normalized);
  const kernel = lang ? (KERNELS[lang] ?? null) : null;

  let prepared = wrapMathEnvironments(normalized);
  prepared = fencesToCodeCells(prepared);
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