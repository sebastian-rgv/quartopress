"use client";

import { Cpu, Languages, ShieldCheck, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useI18n } from "@/components/language-provider";
import { LanguageToggle } from "@/components/language-toggle";
import { Converter } from "@/components/converter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { I18nKey } from "@/lib/i18n";

const FEATURES: { icon: LucideIcon; labelKey: I18nKey }[] = [
  { icon: ShieldCheck, labelKey: "featureLocal" },
  { icon: Cpu, labelKey: "featurePandoc" },
  { icon: Languages, labelKey: "featureRuntimes" },
];

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-gradient-to-b from-zinc-50 via-white to-white px-4 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px 420px at 12% -8%, rgba(22,163,74,.08), transparent 60%), radial-gradient(620px 380px at 100% 0%, rgba(113,113,122,.1), transparent 60%)",
        }}
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 py-8 sm:px-2">
        <div className="flex items-center gap-2 select-none">
          <a
            href="https://sebastianrgv.com"
            target="_blank"
            rel="noreferrer"
            aria-label="Sebastian Garcia — sebastianrgv.com"
            className="transition-transform duration-200 ease-out hover:scale-110"
          >
            <Image
              src="/logo.png"
              alt=""
              width={20}
              height={20}
              className="size-5 rounded-[5px] shadow-sm ring-1 ring-black/10 dark:ring-white/15"
            />
          </a>
          <span className="font-display text-xl leading-none font-bold text-foreground">
            /
          </span>
          <Link
            href="/"
            className="font-display text-xl leading-none tracking-wide transition-opacity hover:opacity-80"
          >
            Quarto<span className="text-accent">Press</span>
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 sm:px-2">
        <section className="flex flex-col items-center pb-12 pt-8 text-center sm:pt-14">
          <Badge
            variant="outline"
            className="mb-5 h-auto rounded-full border-zinc-300 bg-transparent px-3.5 py-1 font-display text-[13px] tracking-[0.14em] text-muted-foreground uppercase dark:border-zinc-700"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            {t("badgeEyebrow")}
          </Badge>

          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-balance sm:text-7xl">
            Quarto<span className="text-accent">Press</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            {t("heroSubtitleBefore")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              .qmd
            </code>{" "}
            {t("heroSubtitleAnd")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              .md
            </code>{" "}
            {t("heroSubtitleAfter")}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {FEATURES.map(({ icon: Icon, labelKey }) => (
              <Badge
                key={labelKey}
                variant="secondary"
                className="h-auto gap-1.5 rounded-full px-3 py-1 font-display text-sm tracking-wide text-foreground/80"
              >
                <Icon className="size-3.5 text-accent" />
                {t(labelKey)}
              </Badge>
            ))}
          </div>
        </section>

        <Converter />
      </main>

      <footer className="relative mt-16 pb-8">
        <Separator className="mx-auto mb-6 max-w-2xl" />
        <div className="flex flex-col items-center gap-1.5 px-4 text-center text-xs leading-relaxed text-muted-foreground">
          <p>
            {t("footerPandocIntro")}{" "}
            <a
              href="https://pandoc.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              Pandoc
            </a>
            . {t("footerNeverLeaves")}
          </p>
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <a
              href="https://sebastianrgv.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              sebastianrgv.com
            </a>
            <span aria-hidden>·</span>
            <a
              href="https://github.com/sebastian-rgv/quartopress"
              target="_blank"
              rel="noreferrer"
              aria-label="QuartoPress en GitHub"
              className="inline-flex items-center gap-1.5 rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden
                className="size-4 fill-current"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}