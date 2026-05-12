export type ParsedTextStatus = "queued" | "processing" | "completed" | "failed";

export type ParsedTextSource = "manual" | "upload";

export type ParsedTextContentEncoding = "utf8" | "hex";

export interface ParsedText {
  id: string;
  title: string;
  source: ParsedTextSource;
  status: ParsedTextStatus;
  totalWords: number;
  totalChars: number;
  uniqueWords: number;
  contentEncoding: ParsedTextContentEncoding;
  hurstExponent?: number | null;
  dfaAlpha?: number | null;
  wordFrequencyEntropy?: number | null;
  originalFileName?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
