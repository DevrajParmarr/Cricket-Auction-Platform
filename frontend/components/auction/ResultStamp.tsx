"use client";

interface Props {
  result: "sold" | "unsold";
  size?: "md" | "xl";
  className?: string;
}

/** Rubber-stamp slam for the hammer moment. Remount to replay. */
export default function ResultStamp({ result, size = "md", className = "" }: Props) {
  const sold = result === "sold";
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none inline-block animate-stamp-in rounded-xl border-[5px] px-5 py-1 font-display font-extrabold uppercase tracking-[0.12em] backdrop-blur-[2px] ${
        size === "xl" ? "text-7xl sm:text-8xl border-[7px] px-8" : "text-4xl sm:text-5xl"
      } ${
        sold
          ? "border-emerald-400 text-emerald-300 bg-emerald-500/10 shadow-[0_0_40px_-8px_rgba(52,211,153,0.6)]"
          : "border-red-500/80 text-red-400 bg-red-500/10 shadow-[0_0_40px_-8px_rgba(239,68,68,0.5)]"
      } ${className}`}
    >
      {sold ? "Sold" : "Unsold"}
    </div>
  );
}
