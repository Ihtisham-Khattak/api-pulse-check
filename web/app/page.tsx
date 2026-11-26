import { ArrowRight, Clock, History, Plus, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { HomeStats } from '@/components/HomeStats';
import { IconBadge } from '@/components/ui';
import { buildRequest } from '@/lib/form';
import { estimateRun, fmtDur, isHeavy } from '@/lib/format';
import { TEMPLATE_ICONS } from '@/lib/icons';
import { CATEGORIES, TEMPLATES } from '@/lib/templates';

export default function HomePage() {
  const cards = TEMPLATES.map((t) => {
    const config = buildRequest(t.build()).config;
    return { t, secs: estimateRun(config).secs, heavy: isHeavy(config) };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Know how your API behaves under pressure</h1>
          <p>Point Pulsar at any API, including one running on localhost. Pick a test type, send real requests with your own data and token, and read clear results in seconds.</p>
        </div>
        <div className="row snug">
          <Link href="/history" className="btn"><History size={16} aria-hidden="true" /> View history</Link>
          <Link href="/new" className="btn primary"><Plus size={16} aria-hidden="true" /> New test</Link>
        </div>
      </div>

      <HomeStats />

      <section className="group" aria-labelledby="tpl-h">
        <div className="sect">
          <h2 id="tpl-h">Start from a template</h2>
          <p>Each one fills in the three steps for you. Change anything before you run, or point it at your own API.</p>
        </div>

        {CATEGORIES.map((cat) => (
          <section className="subgroup" key={cat.id} aria-labelledby={`cat-${cat.id}`}>
            <div className="group-head">
              <h3 id={`cat-${cat.id}`}>{cat.title}</h3>
              <span className="muted small">{cat.blurb}</span>
            </div>
            <div className="cards">
              {cards.filter((c) => c.t.category === cat.id).map(({ t, secs, heavy }) => (
                <Link key={t.id} href={`/new?template=${t.id}`} className="tcard">
                  <div className="top">
                    <IconBadge icon={TEMPLATE_ICONS[t.icon]} />
                    <h3>{t.name}</h3>
                    <ArrowRight size={16} className="arrow" aria-hidden="true" />
                  </div>
                  <span className="path" title={t.summary}>{t.summary}</span>
                  <p>{t.description}</p>
                  <div className="meta">
                    <span><Clock size={13} aria-hidden="true" /> {secs < 1 ? 'Under 1s' : `About ${fmtDur(secs)}`}</span>
                    {heavy && <span className="heavy"><TriangleAlert size={13} aria-hidden="true" /> Heavy</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
