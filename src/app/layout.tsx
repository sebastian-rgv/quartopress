import type { Metadata } from "next";
import { Geist, VT323 } from "next/font/google";

import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LANG } from "@/lib/i18n";

import "./globals.css";

const SITE_URL = "https://quartopress.lat";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "QuartoPress",
  alternateName: "Conversor online de QMD y MD",
  url: SITE_URL,
  applicationCategory: "WebApplication",
  operatingSystem: "Any",
  description:
    "Conversor online gratuito de documentos Quarto (.qmd) y Markdown (.md) a HTML, PDF y notebooks Jupyter. Funciona 100% en el navegador con Pandoc compilado a WebAssembly; los archivos nunca se suben a la nube.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  inLanguage: ["es", "en"],
  author: {
    "@type": "Person",
    name: "Sebastian Garcia Villacorta",
    url: "https://sebastianrgv.com",
  },
  publisher: {
    "@type": "Person",
    name: "Sebastian Garcia Villacorta",
    url: "https://sebastianrgv.com",
  },
  featureList: [
    "Convertir .qmd y .md a HTML",
    "Convertir .qmd y .md a PDF",
    "Convertir .qmd y .md a notebooks Jupyter .ipynb",
    "Conversión 100% local con Pandoc WASM",
    "Sin subir archivos a la nube",
  ],
};

const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Conversor Online de QMD y MD | QuartoPress",
    template: "%s | QuartoPress",
  },
  description:
    "Conversor online de QMD y MD: convierte archivos Quarto (.qmd) y Markdown (.md) a HTML, PDF y notebooks Jupyter, 100% en tu navegador con Pandoc.",
  keywords: [
    "conversor qmd a md",
    "convertir qmd a md",
    "conversor online qmd",
    "conversor online de qmd y md",
    "quarto a markdown",
    "qmd a html",
    "convertir md a pdf",
    "conversor markdown online",
    "quarto online",
    "pandoc online",
    "qmd converter",
    "md to html converter",
  ],
  applicationName: "QuartoPress",
  authors: [
    { name: "Sebastian Garcia Villacorta", url: "https://sebastianrgv.com" },
  ],
  creator: "Sebastian Garcia Villacorta",
  alternates: { canonical: "/" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuartoPress",
  },
  openGraph: {
    type: "website",
    locale: "es_PE",
    alternateLocale: "en_US",
    url: SITE_URL,
    siteName: "QuartoPress",
    title: "Conversor Online de QMD y MD | QuartoPress",
    description:
      "Convierte .qmd y .md a HTML, PDF y notebooks Jupyter sin subir archivos. 100% local con Pandoc WASM en tu navegador.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "QuartoPress — Conversor online de QMD y MD",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Conversor Online de QMD y MD | QuartoPress",
    description:
      "Convierte .qmd y .md a HTML, PDF y notebooks Jupyter sin subir archivos. 100% local con Pandoc WASM en tu navegador.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={DEFAULT_LANG}
      suppressHydrationWarning
      className={`${geist.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})};(function(){try{var k='quartopress-views',d=JSON.parse(localStorage.getItem(k)||'{}'),t=new Date().toISOString().slice(0,10);d[t]=(d[t]||0)+1;var ks=Object.keys(d).sort().slice(-30),r={};ks.forEach(function(k){r[k]=d[k]});localStorage.setItem(k,JSON.stringify(r))}catch(e){}})()`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            {children}
            <Toaster richColors position="top-center" />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}