/** ADMIN — Done-for-you projects: move the stage, share file links, reply to the client. English, dense. */
import { ActionForm } from "@/components/admin/action-form";
import { formatIST } from "@/lib/time";
import { listProjectsForAdmin, SERVICE_STAGES, STAGE_DONE } from "@/server/service";
import { addFileAction, removeFileAction, replyAction, setStageAction } from "./actions";

const stageName = (n: number) => (n >= STAGE_DONE ? "Finished" : `${n + 1}. ${SERVICE_STAGES[n].title}`);

export default async function AdminProjects() {
  const projects = await listProjectsForAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Done-for-you projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          A project is created automatically when Done-for-you is bought (or upgraded to), and you get an email. The client starts by sending their Instagram link, niche and goal in the messages. The client sees the stage, your file links and messages on their tracker page, and gets an email for every stage change, new file and reply. Files are links (for example a Google Drive share link) — nothing is uploaded here.
        </p>
      </div>

      {projects.length === 0 && <p className="card p-6 text-sm text-ink-muted">No Done-for-you projects yet.</p>}

      {projects.map((p) => {
        const last = p.messages[p.messages.length - 1];
        const waiting = last && !last.fromTeam; // the client wrote last → needs a reply
        return (
          <section key={p.id} className="card p-4" aria-label={`Project for ${p.client?.name ?? "client"}`}>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <span className="font-semibold">{p.client?.name ?? "Unknown client"}</span>{" "}
                <span className="text-sm text-ink-muted">
                  {p.client?.email} {p.client?.phone ? `• ${p.client.phone}` : ""} {p.order ? `• Order #${p.order.number}` : ""}
                </span>
              </span>
              <span className="flex items-center gap-2 text-sm">
                {waiting && <span className="rounded-sm bg-fire px-2 py-0.5 font-semibold text-on-fire">Needs reply</span>}
                <span className="rounded-sm border border-line px-2 py-0.5 text-ink-muted">{stageName(p.stage)}</span>
              </span>
            </header>

            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <section>
                  <h2 className="mb-2 font-semibold">Stage</h2>
                  <ActionForm action={setStageAction} className="flex flex-wrap items-end gap-2" success="Stage saved — client emailed ✓">
                    <input type="hidden" name="projectId" value={p.id} />
                    <label className="block min-w-48 flex-1">
                      <span className="mb-1 block text-sm text-ink-muted">Stage in progress</span>
                      <select name="stage" defaultValue={Math.min(p.stage, STAGE_DONE)} className="field">
                        {SERVICE_STAGES.map((s, i) => (
                          <option key={s.title} value={i}>
                            {stageName(i)}
                          </option>
                        ))}
                        <option value={STAGE_DONE}>Finished (all stages done)</option>
                      </select>
                    </label>
                    <button className="btn-ghost">Save stage</button>
                  </ActionForm>
                </section>

                <section>
                  <h2 className="mb-2 font-semibold">Files ({p.files.length})</h2>
                  <ul className="mb-3 divide-y divide-line text-sm">
                    {p.files.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-gold-text underline">
                          {stageName(f.stage)} — {f.title}
                        </a>
                        <form action={removeFileAction}>
                          <input type="hidden" name="fileId" value={f.id} />
                          <button className="text-sm text-ink-muted underline">Remove</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={addFileAction} className="grid gap-2 sm:grid-cols-2" success="File link added — client emailed ✓">
                    <input type="hidden" name="projectId" value={p.id} />
                    <select name="stage" defaultValue={Math.min(p.stage, STAGE_DONE - 1)} className="field" aria-label="Stage for this file">
                      {SERVICE_STAGES.map((s, i) => (
                        <option key={s.title} value={i}>
                          {stageName(i)}
                        </option>
                      ))}
                    </select>
                    <input name="title" required placeholder="Title (e.g. Character sheet v1)" className="field" />
                    <input name="url" required type="url" placeholder="https:// share link" className="field sm:col-span-2" />
                    <button className="btn-ghost sm:col-span-2">Add file link</button>
                  </ActionForm>
                </section>
              </div>

              <section>
                <h2 className="mb-2 font-semibold">Messages ({p.messages.length})</h2>
                <ol className="mb-3 max-h-80 space-y-2 overflow-y-auto text-sm">
                  {p.messages.length === 0 && <li className="text-ink-muted">No messages yet.</li>}
                  {p.messages.map((m) => (
                    <li key={m.id} className={`rounded-sm border border-line p-2 ${m.fromTeam ? "bg-surface-sunken" : "bg-gold-soft"}`}>
                      <span className="text-xs text-ink-muted">
                        {m.fromTeam ? "Team" : "Client"} • {formatIST(m.createdAt, "datetime")}
                      </span>
                      <p className="break-words whitespace-pre-line">{m.body}</p>
                    </li>
                  ))}
                </ol>
                <ActionForm action={replyAction} className="space-y-2" success="Reply sent — client emailed ✓">
                  <input type="hidden" name="projectId" value={p.id} />
                  <textarea name="body" required rows={3} maxLength={2000} placeholder="Reply to the client (Hinglish, respectful 'aap')" className="field min-h-0 py-3" />
                  <button className="btn-gold min-h-12">Send reply</button>
                </ActionForm>
              </section>
            </div>
          </section>
        );
      })}
    </div>
  );
}
