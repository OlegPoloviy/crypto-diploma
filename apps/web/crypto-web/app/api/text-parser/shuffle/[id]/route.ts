import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.text();
  const response = await fetch(`${API_URL}/text-parser/shuffle/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
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
