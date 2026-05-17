import { BaselineSetResult, ParsedText, TextPreprocessMode } from "../types/parsed-text";

export type TextFileType =
  | "plain-text"
  | "markdown"
  | "csv"
  | "json"
  | "binary";

export interface ListParsedTextsQuery {
  corpusKind?: "natural_text" | "random_bytes";
  baselineSetId?: string;
}

export interface ParsedTextContentPayload {
  filename: string;
  contentEncoding: "utf8" | "hex";
  content: string;
  mimeType: string;
}

export async function getParsedTextContent(
  id: string,
): Promise<ParsedTextContentPayload> {
  const response = await fetch(`/api/text-parser/${id}/content`, {
    cache: "no-store",
  });

  return parseResponse<ParsedTextContentPayload>(response);
}

export async function listParsedTexts(
  query: ListParsedTextsQuery = {},
): Promise<ParsedText[]> {
  const params = new URLSearchParams();
  if (query.corpusKind) {
    params.set("corpusKind", query.corpusKind);
  }
  if (query.baselineSetId) {
    params.set("baselineSetId", query.baselineSetId);
  }

  const suffix = params.toString();
  const response = await fetch(
    suffix ? `/api/text-parser?${suffix}` : "/api/text-parser",
    { cache: "no-store" },
  );
  return parseResponse<ParsedText[]>(response);
}

export async function createParsedTextFromRaw(input: {
  title: string;
  text: string;
  preprocess?: TextPreprocessMode;
}): Promise<ParsedText> {
  const response = await fetch("/api/text-parser/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<ParsedText>(response);
}

export async function createParsedTextFromFile(input: {
  title: string;
  files: File[];
  fileType: TextFileType;
  preprocess?: TextPreprocessMode;
}): Promise<ParsedText[]> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType);
  if (input.preprocess) {
    formData.append("preprocess", input.preprocess);
  }

  input.files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/text-parser/files", {
    method: "POST",
    body: formData,
  });

  return parseResponse<ParsedText[]>(response);
}

export async function createRandomBaseline(input: {
  title: string;
  byteLength: number;
  baselineSetId?: string;
  seed?: number;
}): Promise<ParsedText> {
  const response = await fetch("/api/text-parser/random", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<ParsedText>(response);
}

export async function createBaselineSetFromText(input: {
  title: string;
  text: string;
  preprocess?: TextPreprocessMode;
  randomByteLength?: number;
  seed?: number;
  originalFileName?: string;
}): Promise<BaselineSetResult> {
  const response = await fetch("/api/text-parser/baseline-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<BaselineSetResult>(response);
}

export async function createBaselineSetFromFile(input: {
  title: string;
  file: File;
  fileType?: TextFileType;
  preprocess?: TextPreprocessMode;
  randomByteLength?: number;
  seed?: number;
}): Promise<BaselineSetResult> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType ?? "plain-text");
  if (input.preprocess) {
    formData.append("preprocess", input.preprocess);
  }
  if (input.randomByteLength !== undefined) {
    formData.append("randomByteLength", String(input.randomByteLength));
  }
  if (input.seed !== undefined) {
    formData.append("seed", String(input.seed));
  }
  formData.append("file", input.file);

  const response = await fetch("/api/text-parser/baseline-set/file", {
    method: "POST",
    body: formData,
  });

  return parseResponse<BaselineSetResult>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}
