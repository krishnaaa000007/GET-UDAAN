/** Turns an admin-entered video URL into something we can embed: a YouTube iframe (privacy mode) or a plain video file. */
export type VideoQuality = { label: string; src: string };
export type VideoEmbed = { kind: "youtube"; src: string } | { kind: "file"; src: string; qualities?: VideoQuality[] };

/** "720p=https://…mp4, 480p=https://…mp4" → [{label:"720p",src}, …]. Bad entries are skipped. */
export function parseQualities(text: string | null | undefined): VideoQuality[] {
  return (text ?? "")
    .split(/[,\n]/)
    .map((part) => part.trim().match(/^([^=]{1,20})=\s*(https:\/\/\S+\.(?:mp4|webm)(?:\?\S*)?)$/i))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => ({ label: m[1].trim(), src: m[2] }));
}

export function videoEmbed(url: string | null | undefined): VideoEmbed | null {
  const u = (url ?? "").trim();
  if (!/^https:\/\//.test(u)) return null;
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0` };
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return { kind: "file", src: u };
  return null;
}
