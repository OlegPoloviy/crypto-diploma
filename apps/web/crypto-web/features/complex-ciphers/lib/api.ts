import {
  AesDecryptInput,
  AesEncryptInput,
  AesResponse,
  ComplexCipherJob,
  CreateAesJobInput,
} from "../types/aes-cipher";
import { TextFileType } from "@/features/text-parser/lib/api";

export async function encryptAes(input: AesEncryptInput): Promise<AesResponse> {
  const response = await fetch("/api/complex-ciphers/aes/encrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<AesResponse>(response);
}

export async function decryptAes(input: AesDecryptInput): Promise<AesResponse> {
  const response = await fetch("/api/complex-ciphers/aes/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<AesResponse>(response);
}

export async function listComplexCipherJobs(): Promise<ComplexCipherJob[]> {
  const response = await fetch("/api/complex-ciphers/jobs", {
    cache: "no-store",
  });

  return parseResponse<ComplexCipherJob[]>(response);
}

export async function getComplexCipherJob(
  id: string,
): Promise<ComplexCipherJob> {
  const response = await fetch(`/api/complex-ciphers/jobs/${id}`, {
    cache: "no-store",
  });

  return parseResponse<ComplexCipherJob>(response);
}

export async function createAesJob(
  input: CreateAesJobInput,
): Promise<ComplexCipherJob> {
  const response = await fetch("/api/complex-ciphers/jobs/aes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseResponse<ComplexCipherJob>(response);
}

export async function createAesJobsFromFiles(input: {
  title: string;
  files: File[];
  fileType: TextFileType;
  key: string;
  keyEncoding: CreateAesJobInput["keyEncoding"];
  outputEncoding: CreateAesJobInput["outputEncoding"];
  mode: CreateAesJobInput["mode"];
  iv?: string;
  ivEncoding: CreateAesJobInput["ivEncoding"];
}): Promise<ComplexCipherJob[]> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("fileType", input.fileType);
  formData.append("key", input.key);
  formData.append("keyEncoding", input.keyEncoding);
  formData.append("outputEncoding", input.outputEncoding);
  formData.append("mode", input.mode);
  formData.append("ivEncoding", input.ivEncoding);
  if (input.iv) {
    formData.append("iv", input.iv);
  }
  input.files.forEach((file) => formData.append("files", file));

  const response = await fetch("/api/complex-ciphers/jobs/aes/files", {
    method: "POST",
    body: formData,
  });

  return parseResponse<ComplexCipherJob[]>(response);
}

export async function deleteComplexCipherJob(id: string): Promise<void> {
  const response = await fetch(`/api/complex-ciphers/jobs/${id}`, {
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
