// The gold flight path, simple version: one gentle curve down the left gutter of a section.
// Server-rendered SVG, no JavaScript. Every segment starts and ends at the same x, so sections join up.
// Drawing on scroll is pure CSS (see .flight in globals.css). Place inside a `relative` section.

const SHAPES = {
  // S-curves inside the gutter; x in 0..100 of the gutter width, y in 0..1000 of the section height
  left: "M50 0 C 30 260, 30 420, 50 560 S 70 860, 50 1000",
  right: "M50 0 C 70 260, 70 420, 50 560 S 30 860, 50 1000",
  straight: "M50 0 L50 1000",
} as const;

export function FlightPath({ bend = "left" }: { bend?: keyof typeof SHAPES }) {
  return (
    <svg className="flight" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden focusable="false">
      <path d={SHAPES[bend]} pathLength={1} />
    </svg>
  );
}
