import { db } from "@/lib/db";
import { ActionForm } from "@/components/admin/action-form";
import { updateLessonAction } from "../actions";

export default async function AdminCourses() {
  const courses = await db.course.findMany({
    include: { modules: { orderBy: { position: "asc" }, include: { lessons: { orderBy: { position: "asc" } } } } },
  });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Courses</h1>
      <p className="text-sm text-muted">
        For each lesson paste the <b>Mux signed playback ID</b> (Mux → Assets → your video → Playback IDs, policy “signed”). Lessons without an ID play a demo video. See README → “Adding a new course”.
      </p>
      {courses.map((c) => (
        <section key={c.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{c.title}</h2>
          {c.modules.map((m, mi) => (
            <details key={m.id} className="card p-4" open={mi === 0}>
              <summary className="cursor-pointer font-semibold">
                {mi + 1}. {m.title} <span className="text-xs text-muted">({m.lessons.length} lessons, min tier {m.minTier})</span>
              </summary>
              <div className="mt-3 space-y-3">
                {m.lessons.map((l) => (
                  <ActionForm key={l.id} action={updateLessonAction} className="grid gap-2 rounded-xl border border-line p-3 text-sm md:grid-cols-[2fr_100px_2fr_90px_auto]">
                    <input type="hidden" name="lessonId" value={l.id} />
                    <input name="title" defaultValue={l.title} className="field min-h-10" aria-label="Lesson title" />
                    <select name="videoProvider" defaultValue={l.videoProvider} className="field min-h-10" aria-label="Video provider">
                      <option value="mux">Mux</option>
                      <option value="hls">Self HLS</option>
                      <option value="demo">Demo</option>
                    </select>
                    <input name="videoRef" defaultValue={l.videoRef ?? ""} placeholder="Mux playback ID" className="field min-h-10 font-mono" aria-label="Video reference" />
                    <input name="durationMin" type="number" step="0.5" defaultValue={Math.round(l.durationSec / 30) / 2} className="field min-h-10" aria-label="Duration minutes" />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1"><input type="checkbox" name="isFreePreview" defaultChecked={l.isFreePreview} /> Free</label>
                      <label className="flex items-center gap-1"><input type="checkbox" name="published" defaultChecked={l.published} /> Live</label>
                      <button className="text-gold">Save</button>
                    </div>
                  </ActionForm>
                ))}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
