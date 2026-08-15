import { ThemeToggle } from "@/components/theme-toggle";
import { Converter } from "@/components/converter";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col items-center overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white px-4 py-10 dark:from-indigo-950/40 dark:via-zinc-950 dark:to-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            "radial-gradient(700px 420px at 12% -8%, rgba(99,102,241,.18), transparent 60%), radial-gradient(620px 380px at 100% 0%, rgba(6,182,212,.14), transparent 60%)",
        }}
      />
      <div className="relative flex w-full max-w-2xl items-center justify-between gap-4">
        <div>
          <Badge
            variant="secondary"
            className="mb-3 bg-indigo-500/10 font-mono text-[11px] tracking-[0.12em] text-indigo-600 uppercase ring-1 ring-indigo-500/20 dark:text-indigo-300"
          >
            Quarto · Markdown · Pandoc
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-cyan-400">
              QuartoPress
            </span>
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Sube un <code className="font-mono text-[0.85em]">.qmd</code> (o{" "}
            <code className="font-mono text-[0.85em]">.md</code>) y obtén el
            documento renderizado en HTML o PDF, listo para compartir.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <main className="relative mt-8 w-full">
        <Converter />
      </main>

      <footer className="relative mt-10 pb-2 text-center text-xs text-muted-foreground">
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
      </footer>
    </div>
  );
}