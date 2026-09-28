// Small stroke icons (24px grid, 2px stroke) so we don't depend on emoji rendering
type IconProps = { className?: string };

export function GavelIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8" />
      <path d="m16 16 6-6" />
      <path d="m8 8 6-6" />
      <path d="m9 7 8 8" />
      <path d="m21 11-8-8" />
    </svg>
  );
}

export function CheckIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function CrossIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function Stroke({ className = "w-5 h-5", children, width = 2 }: IconProps & { children: React.ReactNode; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => <Stroke {...p}><path d="M7 4v16l13-8z" /></Stroke>;
export const PauseIcon = (p: IconProps) => <Stroke {...p}><path d="M8 5v14M16 5v14" /></Stroke>;
export const NextIcon = (p: IconProps) => <Stroke {...p}><path d="m5 4 10 8-10 8z" /><path d="M19 5v14" /></Stroke>;
export const FlagIcon = (p: IconProps) => <Stroke {...p}><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></Stroke>;
export const UsersIcon = (p: IconProps) => <Stroke {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Stroke>;
export const ListIcon = (p: IconProps) => <Stroke {...p}><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></Stroke>;
export const TrophyIcon = (p: IconProps) => <Stroke {...p}><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Stroke>;
export const EyeIcon = (p: IconProps) => <Stroke {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Stroke>;
export const MinusIcon = (p: IconProps) => <Stroke {...p} width={2.5}><path d="M5 12h14" /></Stroke>;
export const PlusIcon = (p: IconProps) => <Stroke {...p} width={2.5}><path d="M12 5v14M5 12h14" /></Stroke>;
export const ChevronLeftIcon = (p: IconProps) => <Stroke {...p}><path d="m15 18-6-6 6-6" /></Stroke>;
export const ChevronDownIcon = (p: IconProps) => <Stroke {...p}><path d="m6 9 6 6 6-6" /></Stroke>;
export const SearchIcon = (p: IconProps) => <Stroke {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Stroke>;
export const WalletIcon = (p: IconProps) => <Stroke {...p}><path d="M3 7a2 2 0 0 1 2-2h13v4" /><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z" /><path d="M16 14.5h.01" /></Stroke>;
export const BoltIcon = (p: IconProps) => <Stroke {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Stroke>;

export function StarIcon({ className = "w-5 h-5", filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}
