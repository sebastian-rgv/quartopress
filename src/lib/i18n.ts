export const LANG_STORAGE_KEY = "quartopress-lang";
export const DEFAULT_LANG = "en";

const en = {
  badgeEyebrow: "Quarto · Markdown · Pandoc · WASM",

  heroSubtitleBefore: "Convert",
  heroSubtitleAnd: "and",
  heroSubtitleAfter:
    "documents to HTML, PDF or Jupyter notebooks. Everything runs with Pandoc in your browser, without uploading anything to the cloud.",

  featureLocal: "100% local",
  featurePandoc: "Pandoc 3.x · WASM",
  featureRuntimes: "R · Python · Julia",

  footerPandocIntro: "Local conversion in your browser with",
  footerNeverLeaves: "Your document never leaves your device.",
  footerCreatedBy: "Created by",

  themeToggle: "Toggle theme",
  languageToggle: "Change language",

  dropzoneAria: "Upload a .qmd or .md document",
  dropzoneTitle: "Drag your document here",
  dropzoneSubtitle: "or click to select files",

  fileMeta: "Document · {size}",
  removeFile: "Remove {name}",

  outputFormat: "Output format",
  formatHtmlName: "HTML",
  formatHtmlDesc: "Standalone page with MathML",
  formatPdfName: "PDF",
  formatPdfDesc: "Print → save as PDF",
  formatIpynbName: "Notebook .ipynb",
  formatIpynbDesc: "With an R, Python or Julia kernel",
  generateFormat: "Generate {name}",
  formatNote:
    "The PDF is generated with your browser (print → save as PDF). The notebook detects R, Python or Julia in the code chunks.",

  convertButton: "Convert",
  convertingButton: "Converting…",
  singleFileRequired: "Select exactly one .qmd or .md file.",

  downloadEngine: "Downloading Pandoc engine…",
  downloadOnceNote: "It downloads once and stays cached.",
  convertingDoc: "Converting document…",

  convertFailedTitle: "Could not convert",
  unexpectedError: "An unexpected error occurred.",

  toastConverted: "Document converted",
  toastConvertedDesc: "Ready to preview and download.",
  toastConvertFailed: "Could not convert",
  toastDownloadingNotebook: "Downloading notebook…",
  toastDownloadingHtml: "Downloading HTML…",

  previewTitle: "Preview",
  newConversion: "New conversion",
  documentReady: "Document ready",
  downloadHtml: "Download HTML",
  downloadPdf: "Download PDF",
  downloadIpynb: "Download .ipynb",
  openInTab: "Open in tab",
  previewFrameTitle: "Preview of the converted document",

  previewEmptyTitle: "No result yet",
  previewEmptyBody:
    "Convert your document to see the preview here on the right.",
} satisfies Record<string, string>;

const es = {
  badgeEyebrow: "Quarto · Markdown · Pandoc · WASM",

  heroSubtitleBefore: "Convierte documentos",
  heroSubtitleAnd: "y",
  heroSubtitleAfter:
    "a HTML, PDF o notebooks Jupyter. Todo corre con Pandoc en tu navegador, sin subir nada a la nube.",

  featureLocal: "100% local",
  featurePandoc: "Pandoc 3.x · WASM",
  featureRuntimes: "R · Python · Julia",

  footerPandocIntro: "Conversión local en tu navegador con",
  footerNeverLeaves: "Tu documento nunca sale de tu dispositivo.",
  footerCreatedBy: "Creado por",

  themeToggle: "Cambiar tema",
  languageToggle: "Cambiar idioma",

  dropzoneAria: "Subir documento .qmd o .md",
  dropzoneTitle: "Arrastra tu documento aquí",
  dropzoneSubtitle: "o haz clic para seleccionar archivos",

  fileMeta: "Documento · {size}",
  removeFile: "Quitar {name}",

  outputFormat: "Formato de salida",
  formatHtmlName: "HTML",
  formatHtmlDesc: "Página autónoma con MathML",
  formatPdfName: "PDF",
  formatPdfDesc: "Imprimir → guardar como PDF",
  formatIpynbName: "Notebook .ipynb",
  formatIpynbDesc: "Con kernel R, Python o Julia",
  generateFormat: "Generar {name}",
  formatNote:
    "El PDF se genera con tu navegador (imprimir → guardar como PDF). El notebook detecta R, Python o Julia en los chunks de código.",

  convertButton: "Convertir",
  convertingButton: "Convirtiendo…",
  singleFileRequired: "Selecciona exactamente un archivo .qmd o .md.",

  downloadEngine: "Descargando motor pandoc…",
  downloadOnceNote: "Se descarga una sola vez y queda en caché.",
  convertingDoc: "Convirtiendo documento…",

  convertFailedTitle: "No se pudo convertir",
  unexpectedError: "Ocurrió un error inesperado.",

  toastConverted: "Documento convertido",
  toastConvertedDesc: "Listo para previsualizar y descargar.",
  toastConvertFailed: "No se pudo convertir",
  toastDownloadingNotebook: "Descargando notebook…",
  toastDownloadingHtml: "Descargando HTML…",

  previewTitle: "Vista previa",
  newConversion: "Nueva conversión",
  documentReady: "Documento listo",
  downloadHtml: "Descargar HTML",
  downloadPdf: "Descargar PDF",
  downloadIpynb: "Descargar .ipynb",
  openInTab: "En pestaña",
  previewFrameTitle: "Vista previa del documento convertido",

  previewEmptyTitle: "Aún no hay resultado",
  previewEmptyBody:
    "Convierte tu documento para ver la vista previa aquí, a la derecha.",
} satisfies Record<string, string>;

export const dictionaries = { en, es } as const;

export type Lang = keyof typeof dictionaries;
export type I18nKey = keyof typeof en;