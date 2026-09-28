"use client";

import type { ReactNode } from "react";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  badge?: number;
}

interface Props<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

/** Phone-only section switcher, pinned above the home indicator. Hidden from lg up. */
export default function BottomTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <nav
      aria-label="Sections"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-gray-950/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              aria-current={on ? "page" : undefined}
              onClick={() => onChange(t.id)}
              className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors [touch-action:manipulation] focus-visible:outline-none focus-visible:bg-white/5 ${
                on ? "text-amber-300" : "text-white/50 active:text-white/80"
              }`}
            >
              {on && <span aria-hidden="true" className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-amber-400" />}
              <span className="relative">
                {t.icon}
                {!!t.badge && (
                  <span className="absolute -top-1.5 -right-3 min-w-[18px] h-[18px] rounded-full bg-amber-400 px-1 text-[10px] font-bold leading-[18px] text-black text-center tabular-nums">
                    {t.badge > 99 ? "99+" : t.badge}
                  </span>
                )}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
