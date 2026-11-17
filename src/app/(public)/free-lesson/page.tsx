/** /free-lesson — the first free lesson of the course. The page itself lives in FreeLessonView. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findFirstFreeLessonId, FreeLessonView } from "@/components/free-lesson/free-lesson-view";

export const metadata: Metadata = { title: "Free lesson", description: "Get Udaan ka pehla lesson free dekho + 20 AI prompts." };

export default async function FreeLessonPage() {
  const id = await findFirstFreeLessonId();
  if (!id) notFound();
  return <FreeLessonView lessonId={id} />;
}
