// Downloads the 20 free prompts as a small text file (works on any phone, opens in any notes app).
import t from "@/content/hi-Latn/free-lesson.json";

export function GET() {
  const body = [t.prompts.fileHeader, ...t.prompts.items.map((p, i) => `${i + 1}. ${p}\n`)].join("\n");
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t.prompts.fileName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
