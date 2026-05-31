import { NextRequest } from "next/server";
import { proxyApiRequest } from "@/app/api/_lib/api-proxy";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  return proxyApiRequest("/text-parser/file", {
    method: "POST",
    body: formData,
  });
}
