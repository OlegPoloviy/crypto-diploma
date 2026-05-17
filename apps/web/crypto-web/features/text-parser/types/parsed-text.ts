export type ParsedTextStatus = "queued" | "processing" | "completed" | "failed";

export type ParsedTextSource = "manual" | "upload" | "generated";

export type ParsedTextCorpusKind = "natural_text" | "random_bytes";

export type ParsedTextContentEncoding = "utf8" | "hex";

export type TextPreprocessMode = "none" | "gutenberg" | "auto";

export interface ParsedText {
  id: string;
  title: string;
  source: ParsedTextSource;
  corpusKind: ParsedTextCorpusKind;
  baselineSetId?: string | null;
  status: ParsedTextStatus;
  totalWords: number;
  totalChars: number;
  uniqueWords: number;
  contentEncoding: ParsedTextContentEncoding;
  hurstExponent?: number | null;
  dfaAlpha?: number | null;
  deaDelta?: number | null;
  wordFrequencyEntropy?: number | null;
  originalFileName?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaselineSetResult {
  baselineSetId: string;
  natural: ParsedText;
  random: ParsedText;
}
