import {
  AesDecryptInput,
  AesEncryptInput,
  AesResponse,
  ComplexCipherJob,
  CreateAesJobInput,
} from "../types/aes-cipher";

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

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "Request failed");
  }

  return text ? (JSON.parse(text) as T) : (null as T);
}
