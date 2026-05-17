import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const url = query
    ? `${API_URL}/text-parser?${query}`
    : `${API_URL}/text-parser`;

  const response = await fetch(url, { cache: "no-store" });

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
