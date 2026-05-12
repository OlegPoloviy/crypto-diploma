import { ParsedText } from "../types/parsed-text";

export type TextFileType =
  | "plain-text"
  | "markdown"
  | "csv"
  | "json"
  | "binary";

export async function listParsedTexts(): Promise<ParsedText[]> {
  const response = await fetch("/api/text-parser", { cache: "no-store" });
  return parseResponse<ParsedText[]>(response);
}

export async function createParsedTextFromRaw(input: {
  title: string;
  text: string;
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
}): Promise<ParsedText[]> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType);

  input.files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/text-parser/files", {
    method: "POST",
    body: formData,
  });

  return parseResponse<ParsedText[]>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}
