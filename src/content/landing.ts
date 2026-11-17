/**
 * LANDING PAGE COPY (Hinglish).
 * The words live in src/content/hi-Latn/landing.json (so Hindi / English can be added later).
 * Anything saved in Admin → Landing content overrides a section without a code change.
 * Keep claims honest: no income guarantees, no fake numbers.
 *
 * Tip: wrap a word in *stars* inside a title to make it gold, e.g. "PHONE SE *VIRAL* TAK".
 */
import landing from "./hi-Latn/landing.json";

export type ReelItem = { src: string; webmSrc?: string; poster: string; label: string };

// The JSON starts with an empty reel list, so we tell TypeScript what goes inside it.
export const landingDefaults = {
  ...landing,
  reels: { ...landing.reels, items: landing.reels.items as ReelItem[] },
};

export type LandingContent = typeof landingDefaults;
export type LandingSectionKey = keyof LandingContent;
