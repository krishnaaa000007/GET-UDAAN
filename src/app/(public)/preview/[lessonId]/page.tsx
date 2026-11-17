/** Free preview lessons (marked "free preview" in admin) — watchable without buying. Same page as /free-lesson. */
import type { Metadata } from "next";
import { FreeLessonView } from "@/components/free-lesson/free-lesson-view";

export const metadata: Metadata = { title: "Free lesson" };

export default async function PreviewPage({ params }: PageProps<"/preview/[lessonId]">) {
  const { lessonId } = await params;
  return <FreeLessonView lessonId={lessonId} />;
}
