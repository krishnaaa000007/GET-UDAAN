/**
 * Server-side environment access. Import only from server code.
 * Optional services return null so the app can fall back to dev behaviour.
 */
import "server-only";

function opt(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

function req(name: string): string {
  const v = opt(name);
  if (!v) throw new Error(`Missing required env var ${name} — see .env.example`);
  return v;
}

export const env = {
  get appUrl() {
    return (opt("APP_URL") ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get appSecret() {
    const s = req("APP_SECRET");
    if (process.env.NODE_ENV === "production" && s.length < 32) throw new Error("APP_SECRET too short");
    return s;
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
  get paymentsMode(): "mock" | "razorpay" {
    const m = opt("PAYMENTS_MODE") ?? "mock";
    if (m === "mock" && process.env.NODE_ENV === "production" && !opt("ALLOW_MOCK_PAYMENTS_IN_PROD"))
      throw new Error("PAYMENTS_MODE=mock is not allowed in production");
    return m === "razorpay" ? "razorpay" : "mock";
  },
  razorpay: {
    get keyId() { return opt("RAZORPAY_KEY_ID"); },
    get keySecret() { return opt("RAZORPAY_KEY_SECRET"); },
    get webhookSecret() { return req("RAZORPAY_WEBHOOK_SECRET"); },
  },
  mux: {
    get tokenId() { return opt("MUX_TOKEN_ID"); },
    get tokenSecret() { return opt("MUX_TOKEN_SECRET"); },
    get signingKeyId() { return opt("MUX_SIGNING_KEY_ID"); },
    get signingKeyPrivate() { return opt("MUX_SIGNING_KEY_PRIVATE"); },
  },
  r2: {
    get configured() {
      return !!(opt("R2_ACCOUNT_ID") && opt("R2_ACCESS_KEY_ID") && opt("R2_SECRET_ACCESS_KEY") && opt("R2_BUCKET"));
    },
    get accountId() { return req("R2_ACCOUNT_ID"); },
    get accessKeyId() { return req("R2_ACCESS_KEY_ID"); },
    get secretAccessKey() { return req("R2_SECRET_ACCESS_KEY"); },
    get bucket() { return req("R2_BUCKET"); },
  },
  get resendKey() { return opt("RESEND_API_KEY"); },
  get emailFrom() { return opt("EMAIL_FROM") ?? "ReelBhai Academy <onboarding@resend.dev>"; },
  get adminEmail() { return opt("ADMIN_EMAIL"); },
  get metaPixelId() { return opt("NEXT_PUBLIC_META_PIXEL_ID"); },
  get metaCapiToken() { return opt("META_CAPI_ACCESS_TOKEN"); },
  get ga4Id() { return opt("NEXT_PUBLIC_GA4_ID"); },
  get ga4ApiSecret() { return opt("GA4_API_SECRET"); },
  get cronSecret() { return req("CRON_SECRET"); },
};
