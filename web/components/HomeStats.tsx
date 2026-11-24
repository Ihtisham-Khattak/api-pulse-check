'use client';

import { Activity, ChevronRight, CircleCheck, History, Timer } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDateTime, fmtMs } from '@/lib/format';
import { TEST_TYPE_ICON } from '@/lib/icons';
import type { RunMeta } from '@/lib/types';
import { EmptyState, IconBadge, StatusBadge } from './ui';

export function HomeStats() {
  const [runs, setRuns] = useState<RunMeta[] | null>(null);

  useEffect(() => {
    let alive = true;
    api.runs().then((r) => { if (alive) setRuns(r); }).catch(() => { if (alive) setRuns([]); });
    return () => { alive = false; };
  }, []);

  const finished = (runs ?? []).filter((r) => r.status === 'passed' || r.status === 'failed');
  const passRate = finished.length ? Math.round((finished.filter((r) => r.status === 'passed').length / finished.length) * 100) : null;
  const last = runs?.find((r) => r.kpis);
  const loading = runs === null;

  return (
    <>
      <div className="stats">
        <div className="stat">
          <IconBadge icon={Activity} tone="ink" />
          <div><div className="v">{loading ? '-' : runs.length}</div><div className="l">Tests run so far</div></div>
        </div>
        <div className="stat">
          <IconBadge icon={CircleCheck} tone="green" />
          <div><div className="v">{passRate === null ? '-' : passRate + '%'}</div><div className="l">Pass rate</div></div>
        </div>
        <div className="stat">
          <IconBadge icon={Timer} tone="amber" />
          <div><div className="v">{last?.kpis ? fmtMs(last.kpis.p95) : '-'}</div><div className="l">p95 latency, last run</div></div>
        </div>
      </div>

      <section className="group" aria-labelledby="recent-h">
        <div className="group-head">
          <h2 id="recent-h">Recent runs</h2>
          {runs && runs.length > 0 && <Link href="/history" className="small">See all</Link>}
        </div>
        <div className="card" style={{ padding: runs && runs.length ? '6px 14px' : undefined }}>
          {loading && <p className="muted">Loading...</p>}
          {runs && runs.length === 0 && (
            <EmptyState icon={History} title="No tests yet">
              <p>Pick a template below or build your own. Results will show up here.</p>
            </EmptyState>
          )}
          {runs && runs.length > 0 && (
            <div className="recent">
              {runs.slice(0, 4).map((r) => {
                const Icon = TEST_TYPE_ICON[r.testType];
                return (
                  <Link key={r.id} href={`/runs/${r.id}`}>
                    <IconBadge icon={Icon} tone="ink" small />
                    <div className="grow">
                      <b>{r.name}</b>
                      <div className="muted small">{fmtDateTime(r.startedAt)} · <span className="mono">{r.baseUrl.replace(/^https?:\/\//, '')}</span></div>
                    </div>
                    {r.kpis && <span className="muted small num">p95 {fmtMs(r.kpis.p95)}</span>}
                    <StatusBadge status={r.status} />
                    <ChevronRight size={16} className="muted" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
