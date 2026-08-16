# QuartoPress

> Convert **Quarto (.qmd)** and **Markdown (.md)** documents to **HTML**, **PDF**, and **Jupyter notebooks (.ipynb)** — 100% in your browser.

**Live at [quartopress.lat](https://quartopress.lat)**

QuartoPress runs [Pandoc](https://pandoc.org) compiled to WebAssembly (`pandoc-wasm`) directly in the browser. Your documents never leave your device — no server, no cloud uploads, and no binaries to install.

## Features

- **Drag and drop** a `.qmd` / `.md` file and convert it instantly.
- **Local conversion** with pandoc 3.10 (WASM): YAML, tables, footnotes, and math rendered as **MathML** (self-contained, no CDN).
- **Quarto compatibility**: sanitizes executable chunks (`{python, echo=FALSE}`), `chalkboard`, and non-embeddable themes.
- **Standalone HTML** output with embedded CSS, ready to share.
- **PDF** export through the browser's print dialog (save as PDF) with A4 margins.
- **Jupyter notebooks (.ipynb)**: code chunks become cells, and the kernel (**R**, **Python**, or **Julia**) is detected automatically from the first chunk — or respected from your `jupyter:` YAML.
- **Built-in preview** with light and dark mode.

## Language

The UI is **English** by default with an **EN/ES** toggle in the header. Your preference is remembered on the next visit.

## Getting started

### Requirements

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 11+

### Installation

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

> The conversion engine (`pandoc.wasm`, ~58 MB) is served from `public/` and downloaded once; it stays cached in your browser.

## Scripts

| Command      | Description                |
| ------------ | -------------------------- |
| `pnpm dev`   | Start the development server |
| `pnpm build` | Create a production build  |
| `pnpm start` | Serve the production build |
| `pnpm lint`  | Run ESLint                 |

## How it works

QuartoPress uses [pandoc-wasm](https://github.com/pandoc/pandoc-wasm) to compile Pandoc to WebAssembly and run the entire conversion pipeline in the browser. Because all processing happens client-side:

- Your documents are **never uploaded** to a server.
- The app is **fully static** and can be hosted on any static file server or CDN.
- No backend, database, or environment variables are required.

## Tech stack

- [Next.js](https://nextjs.org) (App Router, TypeScript)
- [shadcn/ui](https://ui.shadcn.com) (Base UI)
- [Tailwind CSS](https://tailwindcss.com)
- [pandoc-wasm](https://github.com/pandoc/pandoc-wasm)

## Author

Created by [Sebastian García Villacorta](https://sebastianrgv.com).