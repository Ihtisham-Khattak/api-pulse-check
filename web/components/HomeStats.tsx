'use client';

import { ChevronRight, History } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDateTime, fmtMs } from '@/lib/format';
import { TEST_TYPE_ICON } from '@/lib/icons';
import type { RunMeta } from '@/lib/types';
import { EmptyState, IconBadge, Kpi, Readout, StatusBadge } from './ui';

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
      <Readout count={3}>
        <Kpi label="Tests run so far" value={loading ? '-' : runs.length} />
        <Kpi label="Pass rate" value={passRate === null ? '-' : passRate + '%'} />
        <Kpi label="p95 latency, last run" value={last?.kpis ? fmtMs(last.kpis.p95) : '-'} />
      </Readout>

      <section className="group" aria-labelledby="recent-h">
        <div className="group-head">
          <h2 id="recent-h">Recent runs</h2>
          {runs && runs.length > 0 && <Link href="/history" className="small">See all</Link>}
        </div>
        <div className={`card${runs && runs.length ? ' list' : ''}`}>
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
                    <IconBadge icon={Icon} />
                    <div className="info">
                      <b>{r.name}</b>
                      <div className="muted small">{fmtDateTime(r.startedAt)} · <span className="mono">{r.baseUrl.replace(/^https?:\/\//, '')}</span></div>
                    </div>
                    {r.kpis && <span className="muted small num p95">p95 {fmtMs(r.kpis.p95)}</span>}
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
