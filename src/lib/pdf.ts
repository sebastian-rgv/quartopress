import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/** A4 en puntos (1 pt = 1/72 in). */
const PAGE_W = 595.28;
const PAGE_H = 841.89;
/** Resolución de captura (2x para texto nítido). */
const DPR = 2;
/** CSS px por pt: 96dpi / 72. */
const PX_PER_PT = DPR * (96 / 72);
/** Ancho del contenedor en px: A4 a 96dpi. */
const CONTAINER_W = 794;

/**
 * Convierte el HTML generado (standalone, con MathML) a un blob PDF real,
 * renderizando con el motor del navegador (html-to-image) y paginando en A4.
 */
export async function htmlToPdfBlob(html: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = `${CONTAINER_W}px`;
  container.style.background = "#ffffff";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    await document.fonts.ready;
    const dataUrl = await toPng(container, {
      pixelRatio: DPR,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });

    const img = new Image();
    img.src = dataUrl;
    await img.decode();

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: [PAGE_W, PAGE_H],
      compress: true,
    });

    const pageChunkPx = PAGE_H * PX_PER_PT; // alto de página en px de imagen
    const imgW = img.width; // = CONTAINER_W * DPR
    let offset = 0;
    let first = true;

    while (offset < img.height) {
      if (!first) pdf.addPage([PAGE_W, PAGE_H], "portrait");
      const chunkH = Math.min(pageChunkPx, img.height - offset);

      const canvas = document.createElement("canvas");
      canvas.width = imgW;
      canvas.height = Math.round(chunkH);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D no disponible");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, offset, imgW, chunkH, 0, 0, imgW, chunkH);

      const chunk = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(chunk, "JPEG", 0, 0, PAGE_W, chunkH / PX_PER_PT);
      offset += chunkH;
      first = false;
    }

    return pdf.output("blob");
  } finally {
    container.remove();
  }
}
