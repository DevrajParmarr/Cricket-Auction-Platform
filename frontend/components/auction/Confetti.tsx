"use client";

const COLORS = ["#fbbf24", "#f59e0b", "#34d399", "#ffffff", "#60a5fa", "#f472b6"];

// Deterministic layout so server and client render the same pieces
const PIECES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: (i % 7) * 70,
  drift: ((i * 53) % 120) - 60,
  spin: 360 + ((i * 97) % 540),
  color: COLORS[i % COLORS.length],
  wide: i % 3 === 0,
}));

/** One-shot celebratory burst. Remount (change `key`) to replay. */
export default function Confetti() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="absolute top-0 block animate-confetti-fall rounded-[1px] opacity-0"
          style={
            {
              left: `${p.left}%`,
              width: p.wide ? 10 : 6,
              height: p.wide ? 5 : 10,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
