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
    <div style={{ paddingTop: 40 }}>
      {/* Hero */}
      <div style={{ borderBottom: '2px solid #000', paddingBottom: 32, marginBottom: 48 }}>
        <h1 style={{ fontSize: '3.2rem', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1, marginBottom: 16 }}>
          WHEEL<span style={{ color: 'var(--red)' }}>2</span>WHEEL
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--gray)', marginBottom: 28, maxWidth: 520, lineHeight: 1.7 }}>
          Pick the winner from 3 F1 driver head-to-head matchups each race week.
          Score points, join leagues, win the championship.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/signup" className="btn btn-primary" style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
            Get Started
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
            Log In
          </Link>
        </div>
      </div>

      {/* Features */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
        {features.map(({ num, title, desc }, i) => (
          <div
            key={num}
            style={{
              padding: '24px 28px',
              borderLeft: i > 0 ? '1px solid #000' : 'none',
            }}
          >
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
      <div style={{ borderTop: '1px solid #000', marginTop: 0, padding: '16px 0', display: 'flex', gap: 32 }}>
        {['1 correct = 1 pt', '2 correct = 3 pts', '3 correct = 6 pts', 'all 4 correct (double week) = 2×'].map(s => (
          <span key={s} style={{ fontSize: '0.72rem', color: 'var(--gray)', letterSpacing: '0.5px' }}>{s}</span>
        ))}
      </div>
    </div>
  );
}
