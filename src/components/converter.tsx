"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardPaste,
  ClipboardPen,
  Columns2,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Loader2,
  Notebook,
  Printer,
  RefreshCw,
  Rocket,
  Sparkles,
  Trash2,
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
  binaryToBlob,
  type BinaryResult,
  convertBinary,
  formatBytes,
  type ProgressInfo,
} from "@/lib/converter";

type Status = "idle" | "working" | "done" | "error";

interface Result {
  html: string;
  fileName: string;
  sourceName: string;
  docx: BinaryResult | null;
  epub: BinaryResult | null;
}

interface NotebookResult {
  json: string;
  fileName: string;
  sourceName: string;
  kernel: string | null;
}

const DOC_RE = /\.(qmd|md)$/i;
const DRAFT_STORAGE_KEY = "quartopress-draft";
const DRAFT_DEBOUNCE_MS = 500;

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
  {
    id: "docx",
    nameKey: "formatDocxName",
    descriptionKey: "formatDocxDesc",
    icon: FileText,
  },
  {
    id: "epub",
    nameKey: "formatEpubName",
    descriptionKey: "formatEpubDesc",
    icon: BookOpen,
  },
] as const;

type FormatId = (typeof FORMATS)[number]["id"];

const SAMPLE_QMD = `---
title: "An Interactive Analysis of Global Temperatures"
author: "Dr. Ada Quarto"
date: today
format:
  html:
    toc: true
    theme: cosmo
---

## Introduction

This document demonstrates **bold text**, *italic text*, and a mix of _both styles_.

Here is a list of key findings:

- Average global temperatures have risen by **1.1°C** since pre-industrial times.
- The *Arctic region* warms _twice as fast_ as the global average.
- Ocean heat content reached a record high in 2025.

## Methods

We used the following R code to visualize the trend:

\`\`\`{r}
#| label: fig-temp
#| fig-cap: "Global temperature anomaly over time"

library(ggplot2)

ggplot(globaltemps, aes(x = year, y = anomaly)) +
  geom_line(color = "#e74c3c", linewidth = 1) +
  geom_smooth(method = "loess", se = TRUE, alpha = 0.2) +
  labs(
    x = "Year",
    y = "Temperature anomaly (°C)",
    title = "Global Temperature Anomaly"
  ) +
  theme_minimal()
\`\`\`

## Data Summary

| Year | Anomaly (°C) | Source    |
|------|:------------:|-----------|
| 2020 |    +1.29     | NASA GISS |
| 2021 |    +1.11     | NASA GISS |
| 2022 |    +1.15     | NASA GISS |
| 2023 |    +1.17     | NASA GISS |

## Theoretical Model

The relationship between energy and mass is described by Einstein's equation:

$$E = mc^2$$

where $E$ is energy, $m$ is mass, and $c$ is the speed of light.

## References

For more information, see the [NASA Climate website](https://climate.nasa.gov).
`;

const MINIMAL_MD = `# Welcome to QuartoPress

This is a minimal Markdown document to get you started.

- First item
- Second item
- Third item
`;

const MATH_MD = `# Math in Markdown

Inline math: the quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$.

Block math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
$$
`;

export function Converter() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [wantHtml, setWantHtml] = useState(true);
  const [wantPdf, setWantPdf] = useState(true);
  const [wantIpynb, setWantIpynb] = useState(false);
  const [wantDocx, setWantDocx] = useState(false);
  const [wantEpub, setWantEpub] = useState(false);
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
  const [draggingPaste, setDraggingPaste] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitPreviewHtml, setSplitPreviewHtml] = useState<string | null>(null);
  const [splitPreviewUrl, setSplitPreviewUrl] = useState<string | null>(null);
  const splitDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const pasteDragDepth = useRef(0);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        setPastedText(saved);
        setInputMode("paste");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (inputMode !== "paste") return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      try {
        if (pastedText.trim().length > 0) {
          localStorage.setItem(DRAFT_STORAGE_KEY, pastedText);
        } else {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      } catch {}
    }, DRAFT_DEBOUNCE_MS);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [pastedText, inputMode]);

  const docs = useMemo(() => files.filter((f) => DOC_RE.test(f.name)), [files]);

  const selected = useMemo(
    (): Record<FormatId, boolean> => ({
      html: wantHtml,
      pdf: wantPdf,
      ipynb: wantIpynb,
      docx: wantDocx,
      epub: wantEpub,
    }),
    [wantHtml, wantPdf, wantIpynb, wantDocx, wantEpub]
  );

  const toggleFormat = useCallback(
    (id: FormatId, value: boolean) => {
      if (id === "html") setWantHtml(value);
      else if (id === "pdf") setWantPdf(value);
      else if (id === "ipynb") setWantIpynb(value);
      else if (id === "docx") setWantDocx(value);
      else if (id === "epub") setWantEpub(value);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (splitPreviewUrl) URL.revokeObjectURL(splitPreviewUrl);
    };
  }, [blobUrl, splitPreviewUrl]);

  useEffect(() => {
    if (!splitMode || inputMode !== "paste" || pastedText.trim().length === 0) {
      setSplitPreviewHtml(null);
      return;
    }
    if (splitDebounce.current) clearTimeout(splitDebounce.current);
    splitDebounce.current = setTimeout(async () => {
      try {
        const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
        const out = await convertDocument({ source: pastedText, theme });
        setSplitPreviewHtml(out.html);
        if (splitPreviewUrl) URL.revokeObjectURL(splitPreviewUrl);
        const url = URL.createObjectURL(new Blob([out.html], { type: "text/html;charset=utf-8" }));
        setSplitPreviewUrl(url);
      } catch {
        setSplitPreviewHtml(null);
      }
    }, 500);
    return () => {
      if (splitDebounce.current) clearTimeout(splitDebounce.current);
    };
  }, [splitMode, inputMode, pastedText, splitPreviewUrl]);

  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const sendTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      iframe.contentWindow?.postMessage({ type: "qp-theme-sync", dark }, "*");
    };
    sendTheme();
    const mo = new MutationObserver(sendTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
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

  const handlePasteDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    pasteDragDepth.current += 1;
    setDraggingPaste(true);
  }, []);

  const handlePasteDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handlePasteDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    pasteDragDepth.current -= 1;
    if (pasteDragDepth.current <= 0) setDraggingPaste(false);
  }, []);

  const handlePasteDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      pasteDragDepth.current = 0;
      setDraggingPaste(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      if (!DOC_RE.test(file.name)) {
        toast.error(t("toastInvalidDrop"));
        return;
      }
      file.text().then((content) => {
        setPastedText(content);
        toast.success(t("toastFileLoaded", { name: file.name }));
      });
    },
    [t]
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPastedText(text);
    } catch {
      toast.error(t("toastClipboardError"));
    }
  }, [t]);

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
        const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
        const out = await convertDocument({ source, theme }, (p) => setProgress(p));

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
          docx: null,
          epub: null,
        });
      }

      if (wantDocx) {
        const result = await convertBinary({ source }, "docx");
        setResult((prev) => ({
          ...(prev as Result),
          docx: result,
          epub: prev?.epub,
        } as Result));
      }

      if (wantEpub) {
        const result = await convertBinary({ source }, "epub");
        setResult((prev) => ({
          ...(prev as Result),
          epub: result,
          docx: prev?.docx,
        } as Result));
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
  }, [inputMode, pastedText, outputName, docs, blobUrl, wantHtml, wantPdf, wantIpynb, wantDocx, wantEpub, t]);

  const handlePrint = useCallback(() => {
    if (!blobUrl || !result) return;
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
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
    try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
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
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setPastedText(SAMPLE_QMD);
                      toast.success(t("toastSampleLoaded"));
                    }}
                  >
                    <Sparkles className="size-3.5" />
                    {t("pasteLoadSample")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handlePasteFromClipboard}
                  >
                    <ClipboardPaste className="size-3.5" />
                    {t("pasteFromClipboard")}
                  </Button>
                  {pastedText.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setPastedText("");
                        try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch {}
                      }}
                    >
                      <Trash2 className="size-3.5" />
                      {t("pasteClear")}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={splitMode ? "default" : "ghost"}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setSplitMode(!splitMode)}
                  >
                    <Columns2 className="size-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground tabular-nums font-mono">
                    {t("pasteCounter", {
                      chars: String(pastedText.length),
                      words: String(
                        pastedText.trim().length === 0
                          ? 0
                          : pastedText.trim().split(/\s+/).length
                      ),
                    })}
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "relative",
                  splitMode && pastedText.trim().length > 0 && "grid grid-cols-2 gap-3"
                )}
                onDragEnter={handlePasteDragEnter}
                onDragOver={handlePasteDragOver}
                onDragLeave={handlePasteDragLeave}
                onDrop={handlePasteDrop}
              >
                {draggingPaste && (
                  <div className="absolute inset-0 z-10 grid place-items-center rounded-xl border-accent bg-accent/5 ring-2 ring-accent/40 pointer-events-none">
                    <p className="text-sm font-semibold text-accent">
                      {t("pasteDropOverlay")}
                    </p>
                  </div>
                )}
                <textarea
                  aria-label={t("pasteAria")}
                  placeholder={t("pastePlaceholder")}
                  spellCheck={false}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (canConvert && !busy) convert();
                    }
                  }}
                  className={cn(
                    "min-h-[280px] w-full resize-y rounded-xl border border-dashed bg-transparent px-4 py-3 font-mono text-sm leading-relaxed",
                    "border-zinc-300 placeholder:text-muted-foreground/70",
                    "focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30",
                    "dark:border-zinc-700 dark:focus:border-accent/50",
                    "hover:border-accent/40 transition-colors duration-200",
                    splitMode && pastedText.trim().length > 0 && "min-h-[400px]"
                  )}
                />
                {splitMode && pastedText.trim().length > 0 && (
                  <div className="min-h-[400px] overflow-auto rounded-xl border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    {splitPreviewUrl ? (
                      <iframe
                        title="Split preview"
                        src={splitPreviewUrl}
                        className="h-full min-h-[400px] w-full"
                      />
                    ) : (
                      <div className="flex h-[400px] items-center justify-center text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin mr-2" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {pastedText.length === 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                    onClick={() => {
                      setPastedText(MINIMAL_MD);
                      toast.success(t("toastSampleLoaded"));
                    }}
                  >
                    <FileText className="size-3" />
                    {t("pasteQuickMinimal")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                    onClick={() => {
                      setPastedText(MATH_MD);
                      toast.success(t("toastSampleLoaded"));
                    }}
                  >
                    <Calculator className="size-3" />
                    {t("pasteQuickMath")}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-accent/50 hover:text-foreground"
                    onClick={() => {
                      setPastedText(SAMPLE_QMD);
                      toast.success(t("toastSampleLoaded"));
                    }}
                  >
                    <FileCode className="size-3" />
                    {t("pasteQuickQuarto")}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("pasteHint")}
                </p>
              )}
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
                {result && result.docx && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    title={t("downloadDocx")}
                    aria-label={t("downloadDocx")}
onClick={() => {
                      const docx = result.docx!
                      const blob = binaryToBlob(docx.base64, docx.mimeType)
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = docx.fileName
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 10_000)
                      toast.success(t("toastDownloadingDocx"))
                    }}
                  >
                    <Download className="size-4" />
                    {t("downloadDocx")}
                  </Button>
                )}
                {result && result.epub && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    title={t("downloadEpub")}
                    aria-label={t("downloadEpub")}
                    onClick={() => {
                      const epub = result.epub!
                      const blob = binaryToBlob(epub.base64, epub.mimeType)
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = epub.fileName
                      a.click()
                      setTimeout(() => URL.revokeObjectURL(url), 10_000)
                      toast.success(t("toastDownloadingEpub"))
                    }}
                  >
                    <Notebook className="size-4" />
                    {t("downloadEpub")}
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
                    ref={previewIframeRef}
                    title={t("previewFrameTitle")}
                    src={blobUrl}
                    className="h-[70vh] w-full rounded-xl border bg-white shadow-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:h-[calc(100vh-24rem)] dark:border-white/10 dark:bg-zinc-900"
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
