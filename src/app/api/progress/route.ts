import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { saveProgress } from "@/server/learning";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  let body: { lessonId?: string; position?: number; duration?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof body.lessonId !== "string" || typeof body.position !== "number") return NextResponse.json({ ok: false }, { status: 400 });
  const r = await saveProgress(user.id, body.lessonId, body.position, Number(body.duration) || 0);
  return NextResponse.json(r, { status: r.ok ? 200 : 403 });
}
