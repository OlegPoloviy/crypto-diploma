import { NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export async function GET() {
  const response = await fetch(`${API_URL}/complex-ciphers/jobs`, {
    cache: "no-store",
  });

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
