"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileCode,
  FileText,
  Loader2,
  Printer,
  Sparkles,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  convertDocument,
  formatBytes,
  type ProgressInfo,
} from "@/lib/converter";

type Status = "idle" | "working" | "done" | "error";

interface Result {
  html: string;
  fileName: string;
  warnings: string[];
}

const DOC_RE = /\.(qmd|md)$/i;
const CSS_RE = /\.css$/i;

export function Converter() {
  const [files, setFiles] = useState<File[]>([]);
  const [wantHtml, setWantHtml] = useState(true);
  const [wantPdf, setWantPdf] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const docs = useMemo(() => files.filter((f) => DOC_RE.test(f.name)), [files]);
  const css = useMemo(() => files.filter((f) => CSS_RE.test(f.name)), [files]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const next = Array.from(list);
    if (next.length === 0) return;
    setFiles((prev) => {
      const known = new Set(prev.map((f) => f.name));
      return [...prev, ...next.filter((f) => !known.has(f.name))];
    });
  }, []);

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const convert = useCallback(async () => {
    if (docs.length !== 1) return;
    setStatus("working");
    setError(null);
    setProgress(null);

    try {
      const cssFiles = await Promise.all(
        css.map(async (f) => ({ name: f.name, content: await f.text() }))
      );
      const source = await docs[0].text();
      const out = await convertDocument(
        { source, cssFiles },
        (p) => setProgress(p)
      );

      const fileName = docs[0].name.replace(DOC_RE, ".html");
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      const url = URL.createObjectURL(
        new Blob([out.html], { type: "text/html;charset=utf-8" })
      );

      setBlobUrl(url);
      setResult({ html: out.html, fileName, warnings: out.warnings });
      setStatus("done");
      toast.success("Documento convertido", {
        description: "Listo para previsualizar y descargar.",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Ocurrió un error inesperado.";
      setError(message);
      setStatus("error");
      toast.error("No se pudo convertir", { description: message });
    }
  }, [docs, css, blobUrl]);

  const handlePrint = useCallback(() => {
    if (!blobUrl) return;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    iframe.src = blobUrl;
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 120_000);
    };
    iframe.onerror = () => iframe.remove();
  }, [blobUrl]);

  const busy = status === "working";
  const downloadPct =
    progress && progress.phase === "download" && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card className="overflow-hidden shadow-xl shadow-indigo-500/5 backdrop-blur">
        <CardContent className="p-6 sm:p-8">
          {/* Dropzone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Subir documento .qmd o .md (y hojas de estilo .css)"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              dragDepth.current += 1;
              setDragging(true);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={(e) => {
              e.preventDefault();
              dragDepth.current -= 1;
              if (dragDepth.current <= 0) setDragging(false);
            }}
            onDrop={handleDrop}
            className={cn(
              "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all",
              "border-indigo-300/70 bg-indigo-50/40 dark:border-indigo-500/40 dark:bg-indigo-500/5",
              dragging &&
                "border-indigo-500 bg-indigo-100/60 dark:border-indigo-400 dark:bg-indigo-500/15",
              !dragging &&
                "hover:border-indigo-500 hover:bg-indigo-100/50 dark:hover:border-indigo-400 dark:hover:bg-indigo-500/10"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept=".qmd,.md,.css"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="grid size-12 place-items-center rounded-full bg-indigo-500/10 text-indigo-600 transition-transform group-hover:scale-105 dark:text-indigo-300">
              <Upload className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                Arrastra tu documento aquí
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                o haz clic para seleccionar archivos
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[".qmd", ".md", ".css"].map((ext) => (
                <Badge key={ext} variant="secondary" className="font-mono">
                  {ext}
                </Badge>
              ))}
            </div>
          </div>

          {/* Selected files */}
          {files.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {files.map((f) => {
                const kind = CSS_RE.test(f.name) ? "css" : "doc";
                return (
                  <div
                    key={f.name}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border py-1 pl-2 pr-1 text-xs",
                      kind === "doc"
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                    )}
                  >
                    <FileCode className="size-3.5" />
                    <span className="max-w-52 truncate font-medium">
                      {f.name}
                    </span>
                    <span className="hidden text-[10px] uppercase tracking-wide opacity-60 sm:inline">
                      {kind}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${f.name}`}
                      className="grid size-4 place-items-center rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                      onClick={() => removeFile(f.name)}
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Format selection */}
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Formato de salida
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  wantHtml
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 shadow-sm dark:text-indigo-200"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <Checkbox
                  checked={wantHtml}
                  onCheckedChange={(v) => setWantHtml(Boolean(v))}
                  aria-label="Generar HTML"
                />
                <FileText className="size-4" />
                HTML
              </label>
              <label
                className={cn(
                  "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all",
                  wantPdf
                    ? "border-indigo-500 bg-indigo-500/10 text-indigo-700 shadow-sm dark:text-indigo-200"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <Checkbox
                  checked={wantPdf}
                  onCheckedChange={(v) => setWantPdf(Boolean(v))}
                  aria-label="Generar PDF"
                />
                <Printer className="size-4" />
                PDF
              </label>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              El PDF se genera con tu navegador (imprimir → guardar como PDF).
            </p>
          </div>

          {/* Convert button */}
          <Button
            size="lg"
            disabled={busy || docs.length !== 1 || (!wantHtml && !wantPdf)}
            onClick={convert}
            className="mt-6 h-11 w-full bg-gradient-to-r from-indigo-600 to-cyan-600 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-cyan-500"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Convirtiendo…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Convertir
              </>
            )}
          </Button>

          {docs.length !== 1 && files.length > 0 && (
            <p className="mt-2 text-center text-xs text-destructive">
              Selecciona exactamente un archivo .qmd o .md.
            </p>
          )}

          {/* Progress */}
          {busy && (
            <div className="mt-4">
              {progress?.phase === "download" && downloadPct !== null ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Descargando motor pandoc…</span>
                    <span className="font-mono">
                      {formatBytes(progress.loaded)}
                      {progress.total > 0 && ` / ${formatBytes(progress.total)}`}
                    </span>
                  </div>
                  <Progress value={downloadPct} />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Se descarga una sola vez y queda en caché.
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Convirtiendo documento…</span>
                  </div>
                  <div className="h-1 w-full animate-pulse rounded-full bg-primary/70" />
                </>
              )}
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <Alert variant="destructive" className="mt-4">
              <TriangleAlert />
              <AlertTitle>No se pudo convertir</AlertTitle>
              <AlertDescription className="break-words">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Result */}
      {status === "done" && result && blobUrl && (
        <Card className="overflow-hidden shadow-xl shadow-indigo-500/5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" />
                <h2 className="text-base font-semibold">Documento listo</h2>
                <Badge variant="secondary" className="font-mono">
                  Pandoc 3.9
                </Badge>
              </div>
              {result.warnings.length > 0 && (
                <Badge variant="outline" className="gap-1">
                  <TriangleAlert className="size-3" />
                  {result.warnings.length} aviso
                  {result.warnings.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {wantHtml && (
                <Button
                  variant="outline"
                  className="gap-2"
                  nativeButton={false}
                  render={
                    <a
                      href={blobUrl}
                      download={result.fileName}
                      onClick={() => toast.success("Descargando HTML…")}
                    />
                  }
                >
                  <Download className="size-4" />
                  Descargar HTML
                </Button>
              )}
              {wantPdf && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handlePrint}
                >
                  <Printer className="size-4" />
                  Descargar PDF
                </Button>
              )}
              {wantHtml && (
                <Button
                  variant="secondary"
                  className="gap-2"
                  nativeButton={false}
                  render={
                    <a href={blobUrl} target="_blank" rel="noreferrer" />
                  }
                >
                  Abrir en pestaña
                </Button>
              )}
            </div>

            {result.warnings.length > 0 && (
              <Alert className="mt-4">
                <TriangleAlert />
                <AlertTitle>Avisos de pandoc</AlertTitle>
                <AlertDescription className="whitespace-pre-line break-words">
                  {result.warnings.join("\n")}
                </AlertDescription>
              </Alert>
            )}

            {wantHtml && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Vista previa
                </p>
                <iframe
                  title="Vista previa del documento convertido"
                  src={blobUrl}
                  className="h-[65vh] w-full rounded-lg border bg-white"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}