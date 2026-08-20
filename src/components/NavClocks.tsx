'use client';
// src/components/NavClocks.tsx
// Two stacked digital clocks for the nav bar: the next race's track time, and
// the viewer's own local time. Each digit slides up when it changes.
import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function DigitCell({ digit }: { digit: string }) {
  const [display, setDisplay] = useState(digit);
  const [prev, setPrev] = useState<string | null>(null);
  const [sliding, setSliding] = useState(false);

  useEffect(() => {
    if (digit === display) return;
    if (prefersReducedMotion()) {
      setDisplay(digit);
      return;
    }
    setPrev(display);
    setDisplay(digit);
    setSliding(false);
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(() => setSliding(true)));
    return () => cancelAnimationFrame(raf1);
    // Only the incoming digit should retrigger this — `display` is set inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit]);

  return (
    <span className="digit-cell">
      <span
        className={`digit-track${sliding ? ' sliding' : ''}`}
        onTransitionEnd={() => { setSliding(false); setPrev(null); }}
      >
        <span>{prev ?? display}</span>
        <span>{display}</span>
      </span>
    </span>
  );
}

function ClockRow({ label, isTrack, hms }: { label: string; isTrack?: boolean; hms: string }) {
  const digits = hms.split('');
  return (
    <>
      <span className={`clock-tz${isTrack ? ' is-track' : ''}`}>{label}</span>
      <span className="clock-digits">
        <DigitCell digit={digits[0]} />
        <DigitCell digit={digits[1]} />
        <span className="clock-sep">:</span>
        <DigitCell digit={digits[2]} />
        <DigitCell digit={digits[3]} />
        <span className="clock-sep">:</span>
        <DigitCell digit={digits[4]} />
        <DigitCell digit={digits[5]} />
      </span>
    </>
  );
}

export function NavClocks() {
  const [trackTz, setTrackTz] = useState<string | null>(null);
  const [trackLabel, setTrackLabel] = useState('TRACK');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    fetch('/api/races/next')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.race) {
          setTrackTz(data.race.timezone);
          if (data.race.circuit) setTrackLabel(String(data.race.circuit).toUpperCase());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const local = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());

  let track = local;
  if (trackTz) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: trackTz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(now).reduce((acc: Record<string, string>, p) => { acc[p.type] = p.value; return acc; }, {});
    track = `${parts.hour}${parts.minute}${parts.second}`;
  }

  return (
    <div className="nav-clocks">
      <ClockRow label={trackLabel} isTrack hms={track} />
      <ClockRow label="LOCAL" hms={local} />
    </div>
  );
}
