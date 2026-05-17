import { NextRequest } from "next/server";
import { proxyApiRequest } from "@/app/api/_lib/api-proxy";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  const path = query ? `/text-parser?${query}` : "/text-parser";
  return proxyApiRequest(path, { cache: "no-store" });
}
