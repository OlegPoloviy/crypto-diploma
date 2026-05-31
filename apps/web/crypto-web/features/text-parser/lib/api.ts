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

export type UploadProgressCallback = (progress: number) => void;

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
  onUploadProgress?: UploadProgressCallback;
}): Promise<ParsedText[]> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType);
  if (input.preprocess) {
    formData.append("preprocess", input.preprocess);
  }

  input.files.forEach((file) => formData.append("files", file));

  return uploadFormData<ParsedText[]>(
    "/api/text-parser/files",
    formData,
    input.onUploadProgress,
  );
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

export async function createRandomText(input: {
  title: string;
  wordCount: number;
  alphabet?: string;
  minWordLength?: number;
  maxWordLength?: number;
  seed?: number;
}): Promise<ParsedText> {
  const response = await fetch("/api/text-parser/random-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<ParsedText>(response);
}

export async function createShuffledText(input: {
  title: string;
  text: string;
  preprocess?: TextPreprocessMode;
  seed?: number;
}): Promise<ParsedText> {
  const response = await fetch("/api/text-parser/shuffle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<ParsedText>(response);
}

export async function createShuffledTextFromFile(input: {
  title: string;
  file: File;
  fileType?: TextFileType;
  preprocess?: TextPreprocessMode;
  seed?: number;
  onUploadProgress?: UploadProgressCallback;
}): Promise<ParsedText> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType ?? "plain-text");
  if (input.preprocess) {
    formData.append("preprocess", input.preprocess);
  }
  if (input.seed !== undefined) {
    formData.append("seed", String(input.seed));
  }
  formData.append("file", input.file);

  return uploadFormData<ParsedText>(
    "/api/text-parser/shuffle/file",
    formData,
    input.onUploadProgress,
  );
}

export async function createShuffledTextFromParsedText(input: {
  title: string;
  parsedTextId: string;
  seed?: number;
}): Promise<ParsedText> {
  const response = await fetch(`/api/text-parser/shuffle/${input.parsedTextId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      seed: input.seed,
    }),
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
  onUploadProgress?: UploadProgressCallback;
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

  return uploadFormData<BaselineSetResult>(
    "/api/text-parser/baseline-set/file",
    formData,
    input.onUploadProgress,
  );
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}

function uploadFormData<T>(
  url: string,
  formData: FormData,
  onUploadProgress?: UploadProgressCallback,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", url);
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onUploadProgress?.(
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
    };
    request.onload = () => {
      const text = request.responseText;
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(text || "Request failed"));
        return;
      }

      onUploadProgress?.(100);
      resolve(text ? (JSON.parse(text) as T) : (null as T));
    };
    request.onerror = () => reject(new Error("Upload failed"));
    request.onabort = () => reject(new Error("Upload cancelled"));
    request.send(formData);
  });
}
