/**
 * VIDEO LAYER — one interface, swappable providers.
 *
 *   mux  : Mux signed playback (today)
 *   hls  : self-hosted FFmpeg → HLS + AES-128 on R2 (future free option, see README)
 *   demo : public sample stream so the app works locally without a Mux account
 *
 * Callers MUST check enrolment before calling getPlayback() — see server/learning.ts.
 * Paid DRM later = add a provider that also returns a drm token; the player already accepts tokens.
 */
import "server-only";
import { env } from "@/lib/env";

export type PlaybackSource =
  | { provider: "mux"; playbackId: string; tokens: { playback?: string; thumbnail?: string; storyboard?: string } }
  | { provider: "hls" | "demo"; src: string };

export interface VideoProvider {
  getPlayback(ref: string): Promise<PlaybackSource>;
}

const TOKEN_TTL = "4h";

class MuxProvider implements VideoProvider {
  async getPlayback(playbackId: string): Promise<PlaybackSource> {
    const { default: Mux } = await import("@mux/mux-node");
    const mux = new Mux({
      tokenId: env.mux.tokenId ?? undefined,
      tokenSecret: env.mux.tokenSecret ?? undefined,
      jwtSigningKey: env.mux.signingKeyId,
      jwtPrivateKey: env.mux.signingKeyPrivate,
    });
    const params = process.env.MUX_PLAYBACK_RESTRICTION_ID ? { playback_restriction_id: process.env.MUX_PLAYBACK_RESTRICTION_ID } : undefined;
    const t = await mux.jwt.signPlaybackId(playbackId, { type: ["video", "thumbnail", "storyboard"], expiration: TOKEN_TTL, params });
    return { provider: "mux", playbackId, tokens: { playback: t["playback-token"], thumbnail: t["thumbnail-token"], storyboard: t["storyboard-token"] } };
  }
}

/** Public Mux test stream — only used when a lesson has no real video yet (dev/demo). */
const DEMO_HLS = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

class DemoProvider implements VideoProvider {
  async getPlayback(): Promise<PlaybackSource> {
    return { provider: "demo", src: DEMO_HLS };
  }
}

class SelfHostedHlsProvider implements VideoProvider {
  async getPlayback(key: string): Promise<PlaybackSource> {
    // Playlist is served through our authenticated route; AES keys are served only to enrolled users.
    return { provider: "hls", src: `/api/hls/${encodeURIComponent(key)}/index.m3u8` };
  }
}

export function videoProviderFor(lesson: { videoProvider: string; videoRef: string | null }): { provider: VideoProvider; ref: string } {
  const muxReady = !!(env.mux.signingKeyId && env.mux.signingKeyPrivate);
  if (lesson.videoProvider === "mux" && lesson.videoRef && muxReady) return { provider: new MuxProvider(), ref: lesson.videoRef };
  if (lesson.videoProvider === "hls" && lesson.videoRef) return { provider: new SelfHostedHlsProvider(), ref: lesson.videoRef };
  return { provider: new DemoProvider(), ref: "" };
}
