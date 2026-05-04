export type ParsedTextStatus = "queued" | "processing" | "completed" | "failed";

export type ParsedTextSource = "manual" | "upload";

export interface ParsedText {
  id: string;
  title: string;
  source: ParsedTextSource;
  status: ParsedTextStatus;
  totalWords: number;
  totalChars: number;
  uniqueWords: number;
  originalFileName?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
