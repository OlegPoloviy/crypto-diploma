import { ClassicalCipherJob, CipherMode } from "../types/classical-cipher";
import { TextFileType } from "@/features/text-parser/lib/api";

export async function listCipherJobs(): Promise<ClassicalCipherJob[]> {
  const response = await fetch("/api/classical-ciphers/jobs", {
    cache: "no-store",
  });
  return parseResponse<ClassicalCipherJob[]>(response);
}

export async function getCipherJob(id: string): Promise<ClassicalCipherJob> {
  const response = await fetch(`/api/classical-ciphers/jobs/${id}`, {
    cache: "no-store",
  });
  return parseResponse<ClassicalCipherJob>(response);
}

export async function createCipherJob(input: {
  mode: CipherMode;
  parsedTextId: string;
  shift: number;
  key: string;
  keyLengths: number[];
}): Promise<ClassicalCipherJob> {
  const endpointByMode: Record<CipherMode, string> = {
    caesar: "/api/classical-ciphers/jobs/caesar",
    "vigenere-key-symbols": "/api/classical-ciphers/jobs/vigenere/key-symbols",
    "vigenere-key-lengths": "/api/classical-ciphers/jobs/vigenere/key-lengths",
  };
  const body =
    input.mode === "caesar"
      ? { parsedTextId: input.parsedTextId, shift: input.shift }
      : input.mode === "vigenere-key-symbols"
        ? { parsedTextId: input.parsedTextId, key: input.key }
        : {
            parsedTextId: input.parsedTextId,
            key: input.key,
            keyLengths: input.keyLengths,
          };

  const response = await fetch(endpointByMode[input.mode], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse<ClassicalCipherJob>(response);
}

export async function createCipherJobsFromFiles(input: {
  mode: CipherMode;
  title: string;
  files: File[];
  fileType: TextFileType;
  shift: number;
  key: string;
  keyLengths: number[];
}): Promise<ClassicalCipherJob[]> {
  const endpointByMode: Record<CipherMode, string> = {
    caesar: "/api/classical-ciphers/jobs/caesar/files",
    "vigenere-key-symbols":
      "/api/classical-ciphers/jobs/vigenere/key-symbols/files",
    "vigenere-key-lengths":
      "/api/classical-ciphers/jobs/vigenere/key-lengths/files",
  };
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType);
  input.files.forEach((file) => formData.append("files", file));

  if (input.mode === "caesar") {
    formData.append("shift", String(input.shift));
  } else {
    formData.append("key", input.key);
    if (input.mode === "vigenere-key-lengths") {
      formData.append("keyLengths", input.keyLengths.join(","));
    }
  }

  const response = await fetch(endpointByMode[input.mode], {
    method: "POST",
    body: formData,
  });

  return parseResponse<ClassicalCipherJob[]>(response);
}

export async function deleteCipherJob(id: string): Promise<void> {
  const response = await fetch(`/api/classical-ciphers/jobs/${id}`, {
    method: "DELETE",
  });

  await parseResponse<void>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}
