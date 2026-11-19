/**
 * Share images (Open Graph, 1200×630) in the brand look: night background, gold accent, the Get Udaan mark.
 * Uses the built-in font of next/og so no font files are bundled. Text only — no invented numbers or claims.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const NIGHT = "#0d0d12";
const GOLD = "#ffb627";
const INK = "#f6f1e7";
const MUTED = "#b9b2a6";

// The gold mark from public/brand/getudaan-mark-gold.svg, inlined.
const MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><g transform="translate(64 60) scale(1.05) rotate(-20)" fill="#ffb627"><polygon points="-14,-30 38,0 -14,30" stroke="#ffb627" stroke-width="12" stroke-linejoin="round"/><rect x="-48" y="-25" width="24" height="10" rx="5"/><rect x="-62" y="-5" width="38" height="10" rx="5"/><rect x="-48" y="15" width="24" height="10" rx="5"/></g></svg>',
)}`;

/** `title` may mark one word for gold with *stars*, like the site's headings. */
export function ogImage({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  // One span per word (gold for words inside *stars*) so long titles wrap instead of running off the card.
  const words = title.split("*").flatMap((part, i) => part.split(/\s+/).filter(Boolean).map((w) => ({ w, gold: i % 2 === 1 })));
  const fontSize = title.length > 50 ? 60 : 76;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: `radial-gradient(circle at 85% 110%, rgba(255,182,39,0.35), ${NIGHT} 55%)`,
          color: INK,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
          <img src={MARK} width={72} height={72} alt="" />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, letterSpacing: 1 }}>
            <span>GET&nbsp;</span>
            <span style={{ color: GOLD }}>UDAAN</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {eyebrow && <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: GOLD, letterSpacing: 4, textTransform: "uppercase" }}>{eyebrow}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", columnGap: fontSize * 0.28, fontSize, fontWeight: 800, lineHeight: 1.08, textTransform: "uppercase", maxWidth: 1056 }}>
            {words.map((x, i) => (
              <span key={i} style={{ color: x.gold ? GOLD : INK }}>
                {x.w}
              </span>
            ))}
          </div>
          {sub && <div style={{ display: "flex", fontSize: 32, color: MUTED, maxWidth: 1000, lineHeight: 1.3 }}>{sub}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>getudaan.com</div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
