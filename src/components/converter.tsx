"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardPen,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Loader2,
  Notebook,
  Printer,
  RefreshCw,
  Rocket,
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import {
  convertDocument,
  convertNotebook,
  formatBytes,
  type ProgressInfo,
} from "@/lib/converter";

type Status = "idle" | "working" | "done" | "error";

interface Result {
  html: string;
  fileName: string;
  sourceName: string;
}

interface NotebookResult {
  json: string;
  fileName: string;
  sourceName: string;
  kernel: string | null;
}

const DOC_RE = /\.(qmd|md)$/i;

function sanitizeOutputName(raw: string): string {
  return raw
    .replace(/\.(qmd|md|html)$/i, "")
    .replace(/[^a-zA-Z0-9_\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "document";
}

const FORMATS = [
  {
    id: "html",
    nameKey: "formatHtmlName",
    descriptionKey: "formatHtmlDesc",
    icon: FileText,
  },
  {
    id: "pdf",
    nameKey: "formatPdfName",
    descriptionKey: "formatPdfDesc",
    icon: Printer,
  },
  {
    id: "ipynb",
    nameKey: "formatIpynbName",
    descriptionKey: "formatIpynbDesc",
    icon: Notebook,
  },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

export function Converter() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [wantHtml, setWantHtml] = useState(true);
  const [wantPdf, setWantPdf] = useState(true);
  const [wantIpynb, setWantIpynb] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [notebook, setNotebook] = useState<NotebookResult | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [pastedText, setPastedText] = useState("");
  const [outputName, setOutputName] = useState("document");

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const docs = useMemo(() => files.filter((f) => DOC_RE.test(f.name)), [files]);

  const selected = useMemo(
    (): Record<FormatId, boolean> => ({
      html: wantHtml,
      pdf: wantPdf,
      ipynb: wantIpynb,
    }),
    [wantHtml, wantPdf, wantIpynb]
  );

  const toggleFormat = useCallback(
    (id: FormatId, value: boolean) => {
      if (id === "html") setWantHtml(value);
      else if (id === "pdf") setWantPdf(value);
      else setWantIpynb(value);
    },
    []
  );

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
    const isPaste = inputMode === "paste";
    if (isPaste && pastedText.trim().length === 0) return;
    if (!isPaste && docs.length !== 1) return;
    setStatus("working");
    setError(null);
    setProgress(null);
    setResult(null);
    setNotebook(null);

    try {
      const source = isPaste ? pastedText : await docs[0].text();
      const baseName = isPaste
        ? sanitizeOutputName(outputName)
        : docs[0].name.replace(DOC_RE, "");
      const sourceName = isPaste ? `${sanitizeOutputName(outputName)}.md` : docs[0].name;

      if (wantIpynb) {
        const nb = await convertNotebook({ source }, (p) => setProgress(p));
        setNotebook({
          json: nb.json,
          fileName: `${baseName}.ipynb`,
          sourceName,
          kernel: nb.kernel,
        });
      }

      if (wantHtml || wantPdf) {
        const out = await convertDocument({ source }, (p) => setProgress(p));

        const fileName = `${baseName}.html`;
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        const url = URL.createObjectURL(
          new Blob([out.html], { type: "text/html;charset=utf-8" })
        );

        setBlobUrl(url);
        setResult({
          html: out.html,
          fileName,
          sourceName,
        });
      }

      setStatus("done");
      toast.success(t("toastConverted"), {
        description: t("toastConvertedDesc"),
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("unexpectedError");
      setError(message);
      setStatus("error");
      toast.error(t("toastConvertFailed"), { description: message });
    }
  }, [inputMode, pastedText, outputName, docs, blobUrl, wantHtml, wantPdf, wantIpynb, t]);

  const handlePrint = useCallback(() => {
    if (!blobUrl || !result) return;
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
      const win = iframe.contentWindow;
      if (win) {
        const pdfName = result.fileName.replace(/\.html$/i, "");
        // El iframe usa su propio <title> para el documento.
        win.document.title = pdfName;
        // Chrome nombra el PDF con el <title> de la página PADRE (QuartoPress), no
        // el del iframe. Lo cambiamos temporalmente y lo restauramos al cerrar el
        // diálogo de impresión para que el archivo salga con el nombre del fuente.
        const prevTitle = document.title;
        document.title = pdfName;
        win.focus();
        win.print();
        const restore = () => {
          document.title = prevTitle;
        };
        window.addEventListener("afterprint", restore, { once: true });
        setTimeout(restore, 120_000);
      }
      setTimeout(() => iframe.remove(), 120_000);
    };
    iframe.onerror = () => iframe.remove();
  }, [blobUrl, result]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setNotebook(null);
    setError(null);
    setProgress(null);
  }, []);

  const downloadNotebook = useCallback(() => {
    if (!notebook) return;
    const url = URL.createObjectURL(
      new Blob([notebook.json], { type: "application/json;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = notebook.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.success(t("toastDownloadingNotebook"));
  }, [notebook, t]);

  const busy = status === "working";
  const downloadPct =
    progress && progress.phase === "download" && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : null;
  const hasFormat = wantHtml || wantPdf || wantIpynb;
  const canConvert =
    inputMode === "paste"
      ? pastedText.trim().length > 0 && hasFormat
      : docs.length === 1 && hasFormat;

  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:items-start",
        status !== "idle" && "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      )}
    >
      {/* Form */}
      <Card className="shadow-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/5 dark:ring-white/10">
        <CardContent className="p-6 sm:p-8">
          {/* Input mode toggle */}
          <div
            role="tablist"
            aria-label={t("dropzoneAria")}
            className="mb-4 inline-flex w-full max-w-xs rounded-lg bg-muted p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === "upload"}
              tabIndex={inputMode === "upload" ? 0 : -1}
              onClick={() => setInputMode("upload")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                inputMode === "upload"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Upload className="size-4" />
              {t("inputModeUpload")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inputMode === "paste"}
              tabIndex={inputMode === "paste" ? 0 : -1}
              onClick={() => setInputMode("paste")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                inputMode === "paste"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ClipboardPen className="size-4" />
              {t("inputModePaste")}
            </button>
          </div>

          {/* Dropzone */}
          {inputMode === "upload" ? (
            <div
              role="button"
            tabIndex={0}
            aria-label={t("dropzoneAria")}
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
              "group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed px-6 py-12 text-center transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:outline-none",
              "border-zinc-300 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-900/40",
              "hover:border-accent/60 hover:bg-accent/[0.03]",
              dragging &&
                "border-accent bg-accent/5 ring-2 ring-accent/40"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              accept=".qmd,.md"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div
              className={cn(
                "grid size-12 place-items-center rounded-full transition-all duration-200 ease-out",
                dragging
                  ? "scale-110 bg-accent/15 text-accent"
                  : "scale-100 bg-zinc-200/70 text-zinc-700 group-hover:scale-105 dark:bg-zinc-800 dark:text-zinc-200 dark:group-hover:bg-zinc-700"
              )}
            >
              <Upload className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t("dropzoneTitle")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("dropzoneSubtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[".qmd", ".md"].map((ext) => (
                <Badge
                  key={ext}
                  variant="outline"
                  className="rounded-full font-display text-[13px] tracking-wide"
                >
                  {ext}
                </Badge>
              ))}
            </div>
          </div>
          ) : (
            <div className="space-y-3">
              <textarea
                aria-label={t("pasteAria")}
                placeholder={t("pastePlaceholder")}
                spellCheck={false}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className={cn(
                  "min-h-[280px] w-full resize-y rounded-xl border border-dashed bg-transparent px-4 py-3 font-mono text-sm leading-relaxed",
                  "border-zinc-300 placeholder:text-muted-foreground/60",
                  "focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30",
                  "dark:border-zinc-700 dark:focus:border-accent/50",
                  "hover:border-accent/40 transition-colors duration-200"
                )}
              />
              <p className="text-xs text-muted-foreground">
                {t("pasteHint")}
              </p>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="output-name"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("outputNameLabel")}
                </label>
                <input
                  id="output-name"
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  placeholder={t("outputNamePlaceholder")}
                  className="h-8 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 text-sm font-mono dark:border-zinc-700"
                />
              </div>
            </div>
          )}

          {/* Selected files */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-3 rounded-[10px] border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800/70"
                >
                  <FileCode className="size-4 shrink-0 text-zinc-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{f.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t("fileMeta", { size: formatBytes(f.size) })}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t("removeFile", { name: f.name })}
                    className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
                    onClick={() => removeFile(f.name)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Separator className="my-6" />

          {/* Format selection */}
          <div>
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("outputFormat")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {FORMATS.map(({ id, nameKey, descriptionKey, icon: Icon }) => {
                const active = selected[id];
                const spanFull = id === "ipynb";
                const name = t(nameKey);
                const description = t(descriptionKey);
                return (
                  <label
                    key={id}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-3 rounded-[12px] border p-4 pr-10 transition-all duration-200 ease-out select-none",
                      spanFull && "sm:col-span-2",
                      active
                        ? "border-accent/60 bg-accent/[0.03] shadow-[0_0_0_1px_var(--accent)]"
                        : "border-border bg-card hover:-translate-y-px hover:border-zinc-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:hover:border-zinc-600"
                    )}
                  >
                    <Checkbox
                      checked={active}
                      onCheckedChange={(v) => toggleFormat(id, Boolean(v))}
                      aria-label={t("generateFormat", { name })}
                      className="absolute top-4 right-4 opacity-0 focus-visible:opacity-100 data-checked:border-accent data-checked:bg-accent"
                    />
                    <CheckCircle2
                      className={cn(
                        "absolute top-4 right-4 size-4 text-accent transition-all duration-150 ease-out",
                        active ? "scale-100 opacity-100" : "scale-75 opacity-0"
                      )}
                    />
                    <div
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-[10px] border transition-colors duration-200 ease-out",
                        active
                          ? "border-accent/30 bg-accent/10 text-accent"
                          : "border-transparent bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-pretty text-muted-foreground">
              {t("formatNote")}
            </p>
          </div>

          {/* Convert button */}
          <Button
            size="lg"
            disabled={busy || !canConvert}
            onClick={convert}
            className="mt-6 h-11 w-full bg-accent text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-all duration-200 ease-out hover:bg-accent/85 hover:shadow-xl hover:shadow-accent/30 focus-visible:ring-accent/40"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("convertingButton")}
              </>
            ) : (
              <>
                <Rocket className="size-4" />
                {t("convertButton")}
              </>
            )}
          </Button>

          {inputMode === "paste" && pastedText.trim().length === 0 && (
            <p className="mt-2 text-center text-xs text-destructive">
              {t("pasteRequired")}
            </p>
          )}
          {inputMode === "upload" && docs.length !== 1 && files.length > 0 && (
            <p className="mt-2 text-center text-xs text-destructive">
              {t("singleFileRequired")}
            </p>
          )}

          {/* Progress */}
          {busy && (
            <div className="mt-4">
              {progress?.phase === "download" && downloadPct !== null ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("downloadEngine")}</span>
                    <span className="font-mono tabular-nums">
                      {formatBytes(progress.loaded)}
                      {progress.total > 0 && ` / ${formatBytes(progress.total)}`}
                    </span>
                  </div>
                  <Progress value={downloadPct} indicatorClassName="bg-accent" />
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {t("downloadOnceNote")}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("convertingDoc")}</span>
                  </div>
                  <div className="h-1 w-full animate-pulse rounded-full bg-accent/70" />
                </>
              )}
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <Alert variant="destructive" className="mt-4">
              <TriangleAlert />
              <AlertTitle>{t("convertFailedTitle")}</AlertTitle>
              <AlertDescription className="break-words">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {status !== "idle" && (
        <Card className="shadow-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-lg hover:shadow-black/5 lg:sticky lg:top-6 dark:ring-white/10">
          <CardContent className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-6 place-items-center rounded-md bg-accent/10 text-accent">
                <FileText className="size-3.5" />
              </div>
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {t("previewTitle")}
              </h2>
            </div>
            {status === "done" && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={reset}
              >
                <RefreshCw className="size-3.5" />
                {t("newConversion")}
              </Button>
            )}
          </div>

          <Separator className="my-4" />

          {status === "done" && (result || notebook) ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircle2 className="size-5 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t("documentReady")}</p>
                    <p className="max-w-56 truncate text-xs text-muted-foreground">
                      {result?.sourceName ?? notebook?.sourceName}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="h-auto gap-1.5 rounded-full px-2.5 py-0.5 font-display text-[13px] tracking-wide"
                >
                  <span className="size-1.5 rounded-full bg-accent" />
                  Pandoc 3.9
                </Badge>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {result && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    title={t("downloadHtml")}
                    aria-label={t("downloadHtml")}
                    nativeButton={false}
                    render={
                      <a
                        href={blobUrl ?? undefined}
                        download={result.fileName}
                        onClick={() => toast.success(t("toastDownloadingHtml"))}
                      />
                    }
                  >
                    <Download className="size-4" />
                    {t("downloadHtml")}
                  </Button>
                )}
                {result && wantPdf && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    title={t("downloadPdf")}
                    aria-label={t("downloadPdf")}
                    onClick={handlePrint}
                  >
                    <Printer className="size-4" />
                    {t("downloadPdf")}
                  </Button>
                )}
                {notebook && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    title={t("downloadIpynb")}
                    aria-label={t("downloadIpynb")}
                    onClick={downloadNotebook}
                  >
                    <Notebook className="size-4" />
                    {t("downloadIpynb")}
                  </Button>
                )}
                {result && (
                  <Button
                    variant="ghost"
                    className="gap-2 text-muted-foreground"
                    title={t("openInTab")}
                    aria-label={t("openInTab")}
                    nativeButton={false}
                    render={
                      <a
                        href={blobUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    <ExternalLink className="size-4" />
                    {t("openInTab")}
                  </Button>
                )}
              </div>

              {result && blobUrl && wantHtml && (
                <>
                  <Separator className="my-5" />
                  <iframe
                    title={t("previewFrameTitle")}
                    src={blobUrl}
                    className="h-[70vh] w-full rounded-xl border bg-white shadow-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:h-[calc(100vh-24rem)] dark:ring-1 dark:ring-white/10"
                  />
                </>
              )}
            </>
          ) : busy ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-[50vh] w-full" />
            </div>
          ) : (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground transition-transform duration-200 ease-out group-hover:scale-105">
                <FileText className="size-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-balance">
                  {t("previewEmptyTitle")}
                </p>
                <p className="mx-auto max-w-xs text-xs leading-relaxed text-pretty text-muted-foreground">
                  {t("previewEmptyBody")}
                </p>
              </div>
            </div>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  );
}
