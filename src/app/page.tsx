// src/app/page.tsx
import Link from 'next/link';

export default function Home() {
  const features = [
    {
      num: '01',
      title: 'Pick 3 Matchups',
      desc: 'Each race week, choose which driver you think will finish ahead in 3 head-to-head battles.',
    },
    {
      num: '02',
      title: 'Score Points',
      desc: '1 right = 1pt · 2 right = 3pts · 3 right = 6pts. Bonus double-point weeks make every race count.',
    },
    {
      num: '03',
      title: 'Win Your League',
      desc: 'Create or join a league and compete with friends all season long.',
    },
  ];

  return (
    <div className="home-page">
      {/* Hero */}
      <div className="home-hero">
        <h1 className="home-title">
          WHEEL<span style={{ color: 'var(--red)' }}>2</span>WHEEL
        </h1>
        <p className="home-subtitle">
          Pick the winner from 3 F1 driver head-to-head matchups each race week.
          Score points, join leagues, win the championship.
        </p>
        <div className="home-cta">
          <Link href="/signup" className="btn btn-primary" style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
            Get Started
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
            Log In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="home-features">
        {features.map(({ num, title, desc }, i) => (
          <div key={num} className="home-feature" data-index={i}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--red)', letterSpacing: '2px', marginBottom: 10 }}>
              [{num}]
            </div>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
              {title}
            </h3>
            <p style={{ color: 'var(--gray)', fontSize: '0.8rem', lineHeight: 1.7 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Scoring key */}
      <div className="home-scoring">
        {['1 correct = 1 pt', '2 correct = 3 pts', '3 correct = 6 pts', 'all 4 correct (double week) = 2×'].map(s => (
          <span key={s} style={{ fontSize: '0.72rem', color: 'var(--gray)', letterSpacing: '0.5px' }}>{s}</span>
        ))}
      </div>
    </div>
  );
}
