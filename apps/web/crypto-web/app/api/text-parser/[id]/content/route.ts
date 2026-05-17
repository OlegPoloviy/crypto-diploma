import { NextRequest } from "next/server";
import { proxyApiRequest } from "@/app/api/_lib/api-proxy";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return proxyApiRequest(`/text-parser/${id}/content`, { cache: "no-store" });
}
