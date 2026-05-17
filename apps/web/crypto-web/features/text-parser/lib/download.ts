import { getParsedTextContent } from "./api";

export async function downloadParsedTextCorpus(input: {
  id: string;
  title: string;
}): Promise<void> {
  const payload = await getParsedTextContent(input.id);

  if (payload.contentEncoding === "hex") {
    downloadBytes(decodeHexBytes(payload.content), payload.filename);
    return;
  }

  downloadTextFile(payload.content, payload.filename);
}

function decodeHexBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");
  const bytes = new Uint8Array(Math.floor(normalized.length / 2));

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(
      normalized.slice(index * 2, index * 2 + 2),
      16,
    );
  }

  return bytes;
}

function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  triggerDownload(blob, filename);
}

function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([Uint8Array.from(bytes)], {
    type: "application/octet-stream",
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
