'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

const routes = [
  { href: '/', label: 'Homework' },
  { href: '/payments', label: 'Payments' }
] satisfies ReadonlyArray<{ href: Route; label: string }>;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sunbrew-shell pt-4 sm:pt-6">
      <div className="sunbrew-panel flex flex-col gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-400/25 via-amber-300/20 to-cyan-300/20 text-sm font-bold text-orange-50 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]">
            SB
          </div>
          <div>
            <p className="sunbrew-label">Class bulletin board</p>
            <h1 className="text-xl font-semibold text-white sm:text-2xl">27/14</h1>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          {routes.map((route) => {
            const active = route.href === pathname;

            return (
              <Link
                key={route.href}
                className={active ? 'sunbrew-chip sunbrew-chip-active' : 'sunbrew-chip'}
                href={route.href}
                aria-current={active ? 'page' : undefined}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}