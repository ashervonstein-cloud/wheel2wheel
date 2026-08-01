// src/app/opengraph-image.tsx
// Every invite link in this product gets shared. This is what it looks like
// when it lands in the group chat.
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Wheel2Wheel — F1 fantasy head-to-head picks';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadMono(weight: 400 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@${weight}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } },
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function Image() {
  const [regular, bold] = await Promise.all([loadMono(400), loadMono(800)]);
  const fonts = [
    ...(regular ? [{ name: 'JetBrains Mono', data: regular, weight: 400 as const, style: 'normal' as const }] : []),
    ...(bold ? [{ name: 'JetBrains Mono', data: bold, weight: 800 as const, style: 'normal' as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          fontFamily: 'JetBrains Mono',
          padding: 72,
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 12, height: 44, background: '#ff1e00' }} />
            <div style={{ width: 12, height: 44, background: '#000000' }} />
            <div style={{ width: 12, height: 44, background: '#000000' }} />
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 8, color: '#000000' }}>
            WHEEL2WHEEL
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 94, fontWeight: 800, letterSpacing: -3, lineHeight: 1, color: '#000000' }}>
            THREE PICKS.
          </div>
          <div style={{ fontSize: 94, fontWeight: 800, letterSpacing: -3, lineHeight: 1, color: '#ff1e00' }}>
            ONE RACE WEEK.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: '#000000', marginBottom: 20 }} />
          <div style={{ display: 'flex', gap: 44, fontSize: 22, color: '#666666' }}>
            <div style={{ display: 'flex' }}>1 CORRECT = 1 PT</div>
            <div style={{ display: 'flex' }}>2 = 3 PTS</div>
            <div style={{ display: 'flex' }}>3 = 6 PTS</div>
          </div>
        </div>
      </div>
    ),
    { ...size, ...(fonts.length ? { fonts } : {}) },
  );
}
