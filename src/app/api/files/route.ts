// DEV ONLY: serves files from ./storage with a short-lived signature (production uses R2 signed URLs).
import { NextResponse, type NextRequest } from "next/server";
import { readDevFile, verifyDevFileSignature } from "@/server/storage";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const key = p.get("key") ?? "";
  if (!verifyDevFileSignature(key, Number(p.get("exp")), p.get("sig") ?? "")) return new NextResponse("Link expired", { status: 403 });
  const file = await readDevFile(key);
  if (!file) return new NextResponse("Not found", { status: 404 });
  const name = (p.get("name") ?? "download").replace(/[^\w.\- ]/g, "");
  return new NextResponse(new Uint8Array(file), {
    headers: { "Content-Disposition": `attachment; filename="${name}"`, "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store" },
  });
}
