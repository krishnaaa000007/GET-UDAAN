/** Turns an admin-entered video URL into something we can embed: a YouTube iframe (privacy mode) or a plain video file. */
export type VideoEmbed = { kind: "youtube"; src: string } | { kind: "file"; src: string };

export function videoEmbed(url: string | null | undefined): VideoEmbed | null {
  const u = (url ?? "").trim();
  if (!/^https:\/\//.test(u)) return null;
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return { kind: "file", src: u };
  return null;
}
