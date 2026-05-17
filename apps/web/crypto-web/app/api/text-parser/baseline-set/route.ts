import { NextRequest } from "next/server";
import { proxyApiRequest } from "@/app/api/_lib/api-proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyApiRequest("/text-parser/baseline-set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
