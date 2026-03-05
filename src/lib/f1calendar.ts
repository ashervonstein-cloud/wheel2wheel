// src/lib/f1calendar.ts
// Fetches and parses the F1 calendar ICS feed into structured race data.

const ICS_URL =
  'https://files-f1.motorsportcalendars.com/f1-calendar_p1_p2_p3_qualifying_sprint_gp.ics';

// ── GP metadata ────────────────────────────────────────────────────────────────
const GP_META: Record<string, { country: string; circuit: string }> = {
  'Australian Grand Prix':     { country: 'Australia',     circuit: 'Albert Park Circuit' },
  'Bahrain Grand Prix':        { country: 'Bahrain',       circuit: 'Bahrain International Circuit' },
  'Saudi Arabian Grand Prix':  { country: 'Saudi Arabia',  circuit: 'Jeddah Corniche Circuit' },
  'Japanese Grand Prix':       { country: 'Japan',         circuit: 'Suzuka Circuit' },
  'Chinese Grand Prix':        { country: 'China',         circuit: 'Shanghai International Circuit' },
  'Miami Grand Prix':          { country: 'United States', circuit: 'Miami International Autodrome' },
  'Emilia Romagna Grand Prix': { country: 'Italy',         circuit: 'Autodromo Enzo e Dino Ferrari' },
  'Monaco Grand Prix':         { country: 'Monaco',        circuit: 'Circuit de Monaco' },
  'Canadian Grand Prix':       { country: 'Canada',        circuit: 'Circuit Gilles Villeneuve' },
  'Spanish Grand Prix':        { country: 'Spain',         circuit: 'Circuit de Barcelona-Catalunya' },
  'Austrian Grand Prix':       { country: 'Austria',       circuit: 'Red Bull Ring' },
  'British Grand Prix':        { country: 'United Kingdom', circuit: 'Silverstone Circuit' },
  'Hungarian Grand Prix':      { country: 'Hungary',       circuit: 'Hungaroring' },
  'Belgian Grand Prix':        { country: 'Belgium',       circuit: 'Circuit de Spa-Francorchamps' },
  'Dutch Grand Prix':          { country: 'Netherlands',   circuit: 'Circuit Zandvoort' },
  'Italian Grand Prix':        { country: 'Italy',         circuit: 'Autodromo Nazionale di Monza' },
  'Azerbaijan Grand Prix':     { country: 'Azerbaijan',    circuit: 'Baku City Circuit' },
  'Singapore Grand Prix':      { country: 'Singapore',     circuit: 'Marina Bay Street Circuit' },
  'United States Grand Prix':  { country: 'United States', circuit: 'Circuit of the Americas' },
  'Mexico City Grand Prix':    { country: 'Mexico',        circuit: 'Autodromo Hermanos Rodriguez' },
  'São Paulo Grand Prix':      { country: 'Brazil',        circuit: 'Autodromo Jose Carlos Pace' },
  'Las Vegas Grand Prix':      { country: 'United States', circuit: 'Las Vegas Strip Circuit' },
  'Qatar Grand Prix':          { country: 'Qatar',         circuit: 'Lusail International Circuit' },
  'Abu Dhabi Grand Prix':      { country: 'UAE',           circuit: 'Yas Marina Circuit' },
};

// ── Types ──────────────────────────────────────────────────────────────────────
export interface CalendarRace {
  gpKey: string;            // "GP0", "GP1" ...
  gpName: string;           // "Australian Grand Prix"
  round: number;
  season: number;
  country: string;
  circuit: string;
  raceDate: string;         // ISO UTC – Grand Prix start
  qualifyingDate: string;   // ISO UTC – regular qualifying start
  selectionsOpenAt: string; // ISO UTC – 7 days before lock
  selectionsCloseAt: string;// ISO UTC – qualifying or sprint qualifying start
  hasSprint: boolean;
}

// ── ICS parsing ────────────────────────────────────────────────────────────────
function parseICSDate(str: string): Date {
  const y  = parseInt(str.slice(0, 4));
  const mo = parseInt(str.slice(4, 6)) - 1;
  const d  = parseInt(str.slice(6, 8));
  const h  = parseInt(str.slice(9, 11)  || '0');
  const mi = parseInt(str.slice(11, 13) || '0');
  const s  = parseInt(str.slice(13, 15) || '0');
  return str.endsWith('Z')
    ? new Date(Date.UTC(y, mo, d, h, mi, s))
    : new Date(y, mo, d, h, mi, s);
}

type RawEvent = Record<string, string>;

function parseVEvents(ics: string): RawEvent[] {
  // Unfold continuation lines (RFC 5545 §3.1)
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const events: RawEvent[] = [];
  let current: RawEvent | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      const sep = line.indexOf(':');
      if (sep > 0) {
        // Strip DTSTART;TZID=... parameter suffixes
        const key = line.slice(0, sep).split(';')[0];
        current[key] = line.slice(sep + 1);
      }
    }
  }
  return events;
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function fetchF1Calendar(): Promise<CalendarRace[]> {
  const res = await fetch(ICS_URL, {
    next: { revalidate: 3600 }, // cache for 1 hour
  });
  if (!res.ok) throw new Error(`Failed to fetch calendar: ${res.status}`);
  const text = await res.text();

  const vevents = parseVEvents(text);

  // Group events by GP key (GP0, GP1, …)
  const groups = new Map<string, (RawEvent & { _session: string; _season: string })[]>();

  for (const ev of vevents) {
    const uid = ev['UID'] ?? '';
    // UID: http://2026.f1calendar.com/#GP0_2026_qualifying
    const m = uid.match(/#(GP\d+)_(\d+)_(.+)$/);
    if (!m) continue;
    const gpKey   = m[1];
    const season  = m[2];
    const session = m[3]; // fp1 | fp2 | fp3 | qualifying | sprint | sprint_qualifying | gp
    if (!groups.has(gpKey)) groups.set(gpKey, []);
    groups.get(gpKey)!.push({ ...ev, _session: session, _season: season });
  }

  const races: CalendarRace[] = [];

  for (const [gpKey, events] of groups) {
    const bySession = (s: string) => events.find(e => e._session === s);

    const gpEv   = bySession('gp');
    const qualEv = bySession('qualifying');
    const sqEv   = bySession('sprintQualifying') ?? bySession('sprint_qualifying') ?? bySession('sq1') ?? bySession('sprint_shootout');
    const sprintEv = bySession('sprint');

    if (!gpEv || !qualEv) continue; // skip entries missing key sessions

    // Extract GP name from SUMMARY: "F1: FP1 (Australian Grand Prix)" → "Australian Grand Prix"
    const summary  = gpEv['SUMMARY'] ?? qualEv['SUMMARY'] ?? '';
    const nameMatch = summary.match(/\(([^)]+)\)/);
    const gpName   = nameMatch?.[1] ?? summary;

    const season   = parseInt(gpEv['_season'] ?? '2025');
    const round    = parseInt(gpKey.replace('GP', '')) + 1;
    const hasSprint = !!(sprintEv || sqEv);

    const raceDate  = parseICSDate(gpEv['DTSTART'] ?? '');
    const qualDate  = parseICSDate(qualEv['DTSTART'] ?? '');
    // Sprint weekend → lock at Sprint Qualifying; traditional weekend → lock at Qualifying
    const closesAt  = sqEv
      ? parseICSDate(sqEv['DTSTART'] ?? '')
      : qualDate;
    const opensAt   = new Date(closesAt.getTime() - 7 * 24 * 60 * 60 * 1000);

    const meta = GP_META[gpName] ?? {
      country: gpEv['LOCATION'] ?? '',
      circuit: '',
    };

    races.push({
      gpKey,
      gpName,
      round,
      season,
      country: meta.country,
      circuit: meta.circuit,
      raceDate:          raceDate.toISOString(),
      qualifyingDate:    qualDate.toISOString(),
      selectionsOpenAt:  opensAt.toISOString(),
      selectionsCloseAt: closesAt.toISOString(),
      hasSprint,
    });
  }

  return races.sort((a, b) => a.round - b.round);
}
