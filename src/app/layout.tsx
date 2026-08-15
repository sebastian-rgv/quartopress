import type { Metadata } from "next";
import { Geist, VT323 } from "next/font/google";

import { LanguageProvider } from "@/components/language-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { DEFAULT_LANG } from "@/lib/i18n";

import "./globals.css";

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
  title: "QuartoPress — Convert .qmd and .md to HTML",
  description:
    "Convert Quarto (.qmd) or Markdown (.md) documents to HTML and PDF, 100% in your browser with Pandoc.",
  icons: {
    icon: "/fav.ico",
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