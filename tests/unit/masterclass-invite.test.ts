/** Functionality brief §9: FIRST100 keeps partner credit, invite/self-referral rules, masterclass video links. */
import { describe, expect, it } from "vitest";
import { resolveAttribution, type AttributionInput } from "@/server/attribution";
import { videoEmbed } from "@/lib/video-embed";
import { SITE } from "@/config/site";
import { PARTNER_RULES, releaseLabel } from "@/config/partners";

const now = new Date("2026-11-19T10:00:00Z");
const base: AttributionInput = {
  now,
  windowDays: PARTNER_RULES.attributionWindowDays,
  buyer: { userId: null, email: "buyer@gmail.com", phone: "9876543210" },
  coupon: null,
  cookie: null,
  lead: null,
  partners: { pA: { status: "APPROVED", userId: "uA", email: "a@partner.in", phone: "9811111111" } },
};

describe("FIRST100 (a normal coupon) keeps the partner's link credit", () => {
  it("is a 10% non-partner coupon in config", () => {
    expect(SITE.masterclassCoupon).toEqual({ code: "FIRST100", percent: 10 });
  });
  it("checkout passes coupon=null for a non-partner coupon, so the click still credits the partner", () => {
    const a = resolveAttribution({ ...base, coupon: null, cookie: { partnerId: "pA", clickId: "c1", campaign: "mc", at: new Date(now.getTime() - 86_400_000) } });
    expect(a).toMatchObject({ partnerId: "pA", source: "COOKIE", campaign: "mc" });
  });
  it("buyer using the partner's own phone is self-referral (no credit)", () => {
    const a = resolveAttribution({ ...base, buyer: { ...base.buyer, phone: "+91 98111 11111" }, cookie: { partnerId: "pA", clickId: "c1", campaign: null, at: now } });
    expect(a).toMatchObject({ partnerId: null, note: "self-referral" });
  });
});

describe("partner rules config", () => {
  it("release is 60 minutes and cookies last 30 days", () => {
    expect(PARTNER_RULES.commissionReleaseMinutes).toBe(60);
    expect(PARTNER_RULES.refCookieDays).toBe(30);
    expect(PARTNER_RULES.inviteCookieDays).toBe(30);
    expect(releaseLabel(60)).toBe("1 ghante");
  });
  it("team bonus is 2 levels, 10% and 5%", () => {
    expect(PARTNER_RULES.teamBonus).toEqual({ levels: 2, l1Bps: 1000, l2Bps: 500 });
  });
});

describe("masterclass video link", () => {
  it("YouTube links become privacy-mode embeds", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=abc123XYZ")?.src).toBe("https://www.youtube-nocookie.com/embed/abc123XYZ?rel=0");
    expect(videoEmbed("https://youtu.be/abc123XYZ")?.kind).toBe("youtube");
    expect(videoEmbed("https://youtube.com/shorts/abc123XYZ")?.kind).toBe("youtube");
  });
  it("mp4/webm files play directly", () => {
    expect(videoEmbed("https://cdn.example.com/mc.mp4")).toEqual({ kind: "file", src: "https://cdn.example.com/mc.mp4" });
  });
  it("empty, non-https or unknown links show nothing (no empty video box)", () => {
    expect(videoEmbed("")).toBeNull();
    expect(videoEmbed("http://youtu.be/abc123XYZ")).toBeNull();
    expect(videoEmbed("https://example.com/page")).toBeNull();
  });
});
