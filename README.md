# QuartoPress

> Convierte **Quarto (.qmd)** y **Markdown (.md)** a **HTML**, **PDF** y **notebooks Jupyter (.ipynb)**, 100% en tu navegador.

Usa [Pandoc](https://pandoc.org) compilado a WebAssembly (`pandoc-wasm`), así que **tu documento nunca sale de tu dispositivo**: no hay servidor, ni subidas a la nube, ni binarios que instalar.

## Funcionalidades

- Arrastra y suelta un `.qmd` / `.md` y convierte al instante.
- Conversión local con **pandoc 3.10 (WASM)**: YAML, tablas, pies de página y matemáticas a **MathML** (auto-contenido, sin CDN).
- Compatibilidad con documentos de Quarto: limpia bloques ejecutables (`{python, echo=FALSE}`), `chalkboard` y temas no embebibles.
- Genera **HTML** standalone (CSS embebido, listo para compartir).
- Genera **PDF** con el diálogo de impresión de tu navegador (guardar como PDF), con márgenes A4.
- Genera **notebooks Jupyter (.ipynb)**: los chunks de código se vuelven celdas y el kernel se detecta automáticamente (**R**, **Python** o **Julia**) a partir del primer chunk (o respeta tu `jupyter:` en el YAML).
- Vista previa integrada y modo claro/oscuro.

## Empezar

```bash
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

> El motor (`pandoc.wasm`, ~58 MB) se sirve desde `public/` y se descarga una sola vez; queda en caché en tu navegador.

## Scripts

| Comando        | Descripción                  |
| -------------- | ---------------------------- |
| `pnpm dev`     | Servidor de desarrollo       |
| `pnpm build`   | Build de producción          |
| `pnpm start`   | Sirve el build de producción |
| `pnpm lint`    | ESLint                       |

## Deploy en Vercel

La app es **estática** (solo cliente), así que funciona sin configuración en el plan free de Vercel:

```bash
git push origin main
```

Conecta el repo en [vercel.com](https://vercel.com) → *Import Project*. No se requieren variables de entorno ni funciones serverless.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- [shadcn/ui](https://ui.shadcn.com) (Base UI)
- [Tailwind CSS 4](https://tailwindcss.com)
- [pandoc-wasm](https://github.com/pandoc/pandoc-wasm)

## Autor

Creado por [Sebastian García Villacorta](https://sebastianrgv.com).
