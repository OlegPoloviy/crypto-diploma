import { NextResponse } from "next/server";

const DEFAULT_API_URL = "http://localhost:3000";

export function getApiUrl() {
  return process.env.API_URL ?? DEFAULT_API_URL;
}

export async function proxyApiRequest(path: string, init?: RequestInit) {
  const apiUrl = getApiUrl();
  const targetUrl = `${apiUrl}${path}`;

  try {
    const response = await fetch(targetUrl, init);
    return proxyResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "API proxy request failed",
        message,
        hint:
          apiUrl === DEFAULT_API_URL
            ? "API_URL is not configured, so the app tried http://localhost:3000."
            : "Check that the Render API is running and reachable from Vercel.",
      },
      { status: 502 },
    );
  }
}

export async function proxyResponse(response: Response) {
  const text = await response.text();

  return new NextResponse(text, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json",
    },
  });
}
