import { Cpu, Languages, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Converter } from "@/components/converter";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const FEATURES = [
  { icon: ShieldCheck, label: "100% local" },
  { icon: Cpu, label: "Pandoc 3.x · WASM" },
  { icon: Languages, label: "R · Python · Julia" },
];

export default function Home() {
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
        <Link
          href="/"
          className="font-display text-2xl leading-none tracking-wide select-none"
        >
          Quarto<span className="text-accent">Press</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 sm:px-2">
        <section className="flex flex-col items-center pb-12 pt-8 text-center sm:pt-14">
          <Badge
            variant="outline"
            className="mb-5 h-auto rounded-full border-zinc-300 bg-transparent px-3.5 py-1 font-display text-[13px] tracking-[0.14em] text-muted-foreground uppercase dark:border-zinc-700"
          >
            <span className="size-1.5 rounded-full bg-accent" />
            Quarto · Markdown · Pandoc · WASM
          </Badge>

          <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-balance sm:text-7xl">
            Quarto<span className="text-accent">Press</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
            Convierte documentos{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              .qmd
            </code>{" "}
            y{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
              .md
            </code>{" "}
            a HTML, PDF o notebooks Jupyter. Todo corre con Pandoc en tu
            navegador, sin subir nada a la nube.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <Badge
                key={label}
                variant="secondary"
                className="h-auto gap-1.5 rounded-full px-3 py-1 font-display text-sm tracking-wide text-foreground/80"
              >
                <Icon className="size-3.5 text-accent" />
                {label}
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
            Conversión local en tu navegador con{" "}
            <a
              href="https://pandoc.org"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              Pandoc
            </a>
            . Tu documento nunca sale de tu dispositivo.
          </p>
          <p>
            Creado por{" "}
            <a
              href="https://sebastianrgv.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline-offset-2 hover:underline"
            >
              Sebastian García Villacorta
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
