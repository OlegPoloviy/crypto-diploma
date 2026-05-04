import { ParsedText } from "../types/parsed-text";

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
  file: File | null;
}): Promise<ParsedText> {
  const formData = new FormData();
  formData.append("title", input.title);

  if (input.file) {
    formData.append("file", input.file);
  }

  const response = await fetch("/api/text-parser/file", {
    method: "POST",
    body: formData,
  });

  return parseResponse<ParsedText>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}
