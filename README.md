# QuartoPress

> Convert **Quarto (.qmd)** and **Markdown (.md)** documents to **HTML**, **PDF**, and **Jupyter notebooks (.ipynb)**, 100% in your browser.

It uses [Pandoc](https://pandoc.org) compiled to WebAssembly (`pandoc-wasm`), so **your document never leaves your device**: no server, no cloud uploads, and no binaries to install.

## Features

- Drag and drop a `.qmd` / `.md` and convert it instantly.
- Local conversion with **pandoc 3.10 (WASM)**: YAML, tables, footnotes, and math to **MathML** (self-contained, no CDN).
- Quarto document compatibility: cleans executable chunks (`{python, echo=FALSE}`), `chalkboard`, and non-embeddable themes.
- Generates **standalone HTML** (embedded CSS, ready to share).
- Generates **PDF** through your browser's print dialog (save as PDF), with A4 margins.
- Generates **Jupyter notebooks (.ipynb)**: code chunks become cells and the kernel is detected automatically (**R**, **Python**, or **Julia**) from the first chunk (or respects your `jupyter:` YAML).
- Built-in preview and light/dark mode.

## Language

The UI is in **English** by default, with an **EN/ES** toggle in the header to switch between English and Spanish. Your choice is remembered for the next visit.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> The engine (`pandoc.wasm`, ~58 MB) is served from `public/` and downloads only once; it stays cached in your browser.

## Scripts

| Command       | Description                |
| ------------- | -------------------------- |
| `pnpm dev`    | Development server         |
| `pnpm build`  | Production build           |
| `pnpm start`  | Serve the production build |
| `pnpm lint`   | ESLint                     |

## Deploy on Vercel

The app is **static** (client-side only), so it works out of the box on Vercel's free plan:

```bash
git push origin main
```

Connect the repo at [vercel.com](https://vercel.com) → *Import Project*. No environment variables or serverless functions are required.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [shadcn/ui](https://ui.shadcn.com) (Base UI)
- [Tailwind CSS 4](https://tailwindcss.com)
- [pandoc-wasm](https://github.com/pandoc/pandoc-wasm)

## Author

Created by [Sebastian García Villacorta](https://sebastianrgv.com).