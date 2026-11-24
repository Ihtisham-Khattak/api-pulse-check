'use client';

import { CirclePlus, History, LayoutGrid, Moon, Sun, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { HealthInfo } from '@/lib/types';

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: '/', label: 'Tests', icon: LayoutGrid, match: (p) => p === '/' },
  { href: '/new', label: 'New test', icon: CirclePlus, match: (p) => p.startsWith('/new') },
  { href: '/history', label: 'History', icon: History, match: (p) => p.startsWith('/history') || p.startsWith('/runs') }
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [offline, setOffline] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      api.health().then((h) => { if (alive) { setHealth(h); setOffline(false); } }).catch(() => { if (alive) setOffline(true); });
    };
    poll();
    const timer = window.setInterval(poll, 5000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const attr = document.documentElement.dataset.theme;
    setDark(attr ? attr === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    setDark(!dark);
    try { localStorage.setItem('pc-theme', next); } catch { /* storage can be blocked */ }
  };

  const k6Ok = health?.k6.found === true;
  const statusText = offline ? 'Server not reachable' : !health ? 'Checking k6' : k6Ok ? `k6 ${health.k6.version ?? ''} ready` : 'k6 not found';

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="PulseCheck home">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M2 13h4l2.6-7 4.2 12 2.6-5H22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span>PulseCheck<small>Performance testing</small></span>
        </Link>

        <nav className="nav" aria-label="Main">
          {NAV.map((item) => {
            const Icon = item.icon;
            const current = item.match(pathname);
            return (
              <Link key={item.href} href={item.href} aria-current={current ? 'page' : undefined}>
                <Icon size={18} aria-hidden="true" /> {item.label}
              </Link>
            );
          })}
        </nav>

        {health?.activeRunId && (
          <Link className="nav-run" href={`/runs/${health.activeRunId}`}>
            <span className="live-dot" aria-hidden="true" /> A test is running. View it
          </Link>
        )}

        <div className="sidebar-foot">
          <div className="k6-status" role="status">
            <span className={`dot ${offline || (health && !k6Ok) ? 'bad' : k6Ok ? 'ok' : ''}`} aria-hidden="true" />
            <span><span className="label-long">{statusText}</span></span>
          </div>
          <button className="btn sm" type="button" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>
            {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
