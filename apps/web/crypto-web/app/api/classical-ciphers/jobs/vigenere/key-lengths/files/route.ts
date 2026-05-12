import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const response = await fetch(
    `${API_URL}/classical-ciphers/jobs/vigenere/key-lengths/files`,
    {
      method: "POST",
      body: formData,
    },
  );

  return proxyResponse(response);
}

async function proxyResponse(response: Response) {
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type":
        response.headers.get("content-type") ?? "application/json",
    },
  });
}
