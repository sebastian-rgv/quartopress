export interface ConvertOptions {
  from?: string;
  to?: string;
  "output-file"?: string;
  standalone?: boolean;
  "table-of-contents"?: boolean;
  "number-sections"?: boolean;
  css?: string[];
  "highlight-style"?: string;
  mathml?: boolean;
  "embed-resources"?: boolean;
  "extract-media"?: string;
  metadata?: Record<string, unknown>;
  binary?: boolean;
  [key: string]: unknown;
}

export interface ConvertResult {
  stdout: string;
  stderr: string;
  warnings: unknown[];
  files: Record<string, string | Blob>;
  mediaFiles: Record<string, string | Blob>;
  binaryBase64: string | null;
}

export interface PandocInstance {
  convert(
    options: ConvertOptions,
    stdin: string | null,
    files: Record<string, string | Blob>
  ): Promise<ConvertResult>;
  query(options: Record<string, unknown>): unknown;
  pandoc(
    args: string,
    data: string | Blob,
    resources?: { filename: string; contents: string | Blob }[]
  ): Promise<{ out: string | Blob; mediaFiles: Map<string, string | Blob> }>;
}

export function createPandocInstance(
  wasmBinary: ArrayBuffer | Uint8Array
): Promise<PandocInstance>;