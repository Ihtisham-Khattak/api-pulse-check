import { ArrowRight, Clock, Flame, History, Rocket } from 'lucide-react';
import Link from 'next/link';
import { HomeStats } from '@/components/HomeStats';
import { IconBadge, type Tone } from '@/components/ui';
import { buildRequest } from '@/lib/form';
import { estimateRun, fmtDur, isHeavy } from '@/lib/format';
import { TEMPLATE_ICONS } from '@/lib/icons';
import { CATEGORIES, TEMPLATES, type TemplateCategory } from '@/lib/templates';

const TONE: Record<TemplateCategory, Tone> = { quick: 'green', workflow: 'ink', performance: 'amber' };

export default function HomePage() {
  const cards = TEMPLATES.map((t) => {
    const config = buildRequest(t.build()).config;
    return { t, secs: estimateRun(config).secs, heavy: isHeavy(config) };
  });

  return (
    <>
      <section className="hero" aria-labelledby="hero-h">
        <svg className="hero-pulse" viewBox="0 0 420 120" fill="none" aria-hidden="true">
          <path d="M0 78h120l28-58 44 98 34-66 24 26h170" stroke="#3ddc84" strokeWidth="6" strokeLinecap="square" strokeLinejoin="miter" />
        </svg>
        <div className="eyebrow"><Flame size={14} aria-hidden="true" /> Powered by k6</div>
        <h1 id="hero-h">Know how your API behaves under pressure</h1>
        <p>Point Pulsar at any API, including one running on localhost. Pick a test type, send real requests with your own data and token, and read clear results in seconds.</p>
        <div className="row" style={{ marginTop: 22 }}>
          <Link href="/new" className="btn light"><Rocket size={17} aria-hidden="true" /> New test</Link>
          <Link href="/history" className="btn outline"><History size={17} aria-hidden="true" /> View history</Link>
        </div>
      </section>

      <HomeStats />

      <div className="group" style={{ marginTop: 40 }}>
        <h2 style={{ marginBottom: 4 }}>Start from a template</h2>
        <p className="muted small">Each one fills in the three steps for you. Change anything before you run, or point it at your own API.</p>
      </div>

      {CATEGORIES.map((cat) => (
        <section className="group" key={cat.id} aria-labelledby={`cat-${cat.id}`} style={{ marginTop: 26 }}>
          <div className="group-head">
            <h2 id={`cat-${cat.id}`} style={{ fontSize: 16 }}>{cat.title}</h2>
            <span className="muted small">{cat.blurb}</span>
          </div>
          <div className="cards">
            {cards.filter((c) => c.t.category === cat.id).map(({ t, secs, heavy }) => (
              <Link key={t.id} href={`/new?template=${t.id}`} className="tcard">
                <div className="top">
                  <IconBadge icon={TEMPLATE_ICONS[t.icon]} tone={TONE[t.category]} />
                  <div className="grow">
                    <h3>{t.name}</h3>
                    <span className="mono muted small">{t.summary}</span>
                  </div>
                </div>
                <p>{t.description}</p>
                <div className="meta">
                  <span className="row" style={{ gap: 12 }}>
                    <span className="row" style={{ gap: 5 }}><Clock size={14} aria-hidden="true" /> {secs < 1 ? 'Under 1s' : `About ${fmtDur(secs)}`}</span>
                    {heavy && <span className="badge warn">Heavy</span>}
                  </span>
                  <span className="go">Use template <ArrowRight size={15} aria-hidden="true" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
