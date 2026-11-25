/** Video testimonial cards for the one-row wall (kept in the order saved in the JSON), built from content/hi-Latn/video-testimonials.json. */
import { SITE } from "@/config/site";
import t from "@/content/hi-Latn/video-testimonials.json";
import type { WallVideo } from "@/components/testimonials/video-wall";

type Group = { label: string; items: { id: string; name?: string }[] };

function build(group: Group): WallVideo[] {
  // MEDIA_BASE_URL / VIDEO_WALL_PREVIEW: local preview only (see .env.local); production uses SITE.mediaBaseUrl + "live".
  const base = `${process.env.MEDIA_BASE_URL || SITE.mediaBaseUrl}/${t.folder}`;
  return group.items.map((v) => ({ id: v.id, src: `${base}/${v.id}.mp4`, poster: `${base}/${v.id}.jpg`, label: v.name || group.label }));
}

/** Empty until the files are uploaded and "live" is true, so the page never shows broken cards. */
export const isLive = () => t.live || process.env.VIDEO_WALL_PREVIEW === "1";
export const studentVideos = (): WallVideo[] => (isLive() ? build(t.students) : []);
export const partnerVideos = (): WallVideo[] => (isLive() ? build(t.partners) : []);
export const wallCopy = t;
