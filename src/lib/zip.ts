/**
 * Generador ZIP mínimo sin dependencias (método STORE, sin compresión).
 * Suficiente para empaquetar HTML/JSON generados por QuartoPress.
 */

interface ZipEntry {
  name: string;
  content: string | Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; date: number } {
  const time =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const d =
    (((date.getFullYear() - 1980) & 0x7f) << 9) |
    ((date.getMonth() + 1) & 0x0f) << 5 |
    (date.getDate() & 0x1f);
  return { time, date: d };
}

function utf8Encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function u16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

/**
 * Construye un blob ZIP (STORE) con los archivos dados.
 * Los nombres se fuerzan a UTF-8 (flag 0x0800).
 */
export function buildZip(entries: ZipEntry[]): Blob {
  const now = dosDateTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = utf8Encode(entry.name);
    const dataBytes =
      typeof entry.content === "string"
        ? utf8Encode(entry.content)
        : entry.content;
    const crc = crc32(dataBytes);

    // Local file header
    localParts.push(
      u32(0x04034b50),
      u16(20), // version needed
      u16(0x0800), // flags: UTF-8
      u16(0), // method: STORE
      u16(now.time),
      u16(now.date),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0), // extra length
      nameBytes,
      dataBytes
    );

    // Central directory header
    centralParts.push(
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0x0800),
      u16(0),
      u16(now.time),
      u16(now.date),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes
    );

    offset += 30 + nameBytes.length + dataBytes.length;
  }

  const local = concat(localParts);
  const central = concat(centralParts);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(central.length),
    u32(local.length),
    u16(0),
  ]);

  return new Blob([local, central, eocd] as BlobPart[], {
    type: "application/zip",
  });
}
