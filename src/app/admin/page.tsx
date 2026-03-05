'use client';
// src/app/admin/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { CalendarRace } from '@/lib/f1calendar';

// 2026 F1 driver lineup (source: formula1.com/en/drivers)
const DRIVERS = [
  'Alexander Albon',
  'Arvid Lindblad',
  'Carlos Sainz',
  'Charles Leclerc',
  'Esteban Ocon',
  'Fernando Alonso',
  'Franco Colapinto',
  'Gabriel Bortoleto',
  'George Russell',
  'Isack Hadjar',
  'Kimi Antonelli',
  'Lance Stroll',
  'Lando Norris',
  'Lewis Hamilton',
  'Liam Lawson',
  'Max Verstappen',
  'Nico Hulkenberg',
  'Oliver Bearman',
  'Oscar Piastri',
  'Pierre Gasly',
  'Sergio Perez',
  'Valtteri Bottas',
];

const emptyMatchup = (order: number) => ({
  order, title: '', driver1Name: '', driver2Name: '', isBonus: order === 4,
});

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [races, setRaces] = useState<any[]>([]);
  const [tab, setTab] = useState<'races' | 'create' | 'sync'>('races');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Calendar sync state
  const [calRaces, setCalRaces] = useState<CalendarRace[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState('');

  // Create race form
  const [raceForm, setRaceForm] = useState({
    name: '', round: 1, season: 2025, country: '', circuit: '',
    selectionsOpenAt: '', selectionsCloseAt: '', raceDate: '',
    hasSprint: false, isDoublePoints: false,
  });
  const [matchups, setMatchups] = useState([
    emptyMatchup(1), emptyMatchup(2), emptyMatchup(3),
  ]);

  // Results form
  const [resultsRaceId, setResultsRaceId] = useState('');
  const [winners, setWinners] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') {
      if (!(session?.user as any)?.isAdmin) router.push('/dashboard');
      else fetchRaces();
    }
  }, [status, session]);

  const fetchRaces = async () => {
    const res = await fetch('/api/admin/races');
    setRaces(await res.json());
    setLoading(false);
  };

  const updateStatus = async (raceId: string, status: string) => {
    await fetch(`/api/admin/races/${raceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setMessage(`Status updated to ${status}`);
    fetchRaces();
  };

  const submitResults = async () => {
    const race = races.find(r => r.id === resultsRaceId);
    if (!race) return;
    const results = race.matchups.map((m: any) => ({
      matchupId: m.id,
      winnerId: winners[m.id],
    }));
    if (results.some((r: any) => !r.winnerId)) {
      setMessage('Please select a winner for every matchup');
      return;
    }
    const res = await fetch(`/api/admin/races/${resultsRaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Results processed and points awarded.' : data.error);
    fetchRaces();
  };

  const createRace = async () => {
    const res = await fetch('/api/admin/races', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...raceForm, matchups }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Race "${data.name}" created.`);
      setTab('races');
      fetchRaces();
    } else {
      setMessage(data.error || 'Failed to create race');
    }
  };

  const updateMatchup = (index: number, field: string, value: any) => {
    setMatchups(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const toggleBonus = (checked: boolean) => {
    if (checked) {
      setMatchups(prev => [...prev, emptyMatchup(4)]);
    } else {
      setMatchups(prev => prev.filter(m => !m.isBonus));
    }
    setRaceForm(f => ({ ...f, isDoublePoints: checked }));
  };

  // ── Calendar sync helpers ─────────────────────────────────────────────────
  const fetchCalendar = async () => {
    setCalLoading(true);
    setCalError('');
    try {
      const res = await fetch('/api/admin/sync-calendar');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setCalRaces(await res.json());
    } catch (e: any) {
      setCalError(e.message ?? 'Could not load calendar');
    } finally {
      setCalLoading(false);
    }
  };

  // Convert UTC ISO string → datetime-local value in the browser's local timezone
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Format a UTC ISO string for display
  const fmtUTC = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'UTC', hour12: false,
    }).format(d) + ' UTC';
  };

  // Pre-fill the create form from a calendar race and switch to create tab
  const setupFromCalendar = (cr: CalendarRace) => {
    setRaceForm({
      name: cr.gpName,
      round: cr.round,
      season: cr.season,
      country: cr.country,
      circuit: cr.circuit,
      selectionsOpenAt:  toLocalInput(cr.selectionsOpenAt),
      selectionsCloseAt: toLocalInput(cr.selectionsCloseAt),
      raceDate:          toLocalInput(cr.raceDate),
      hasSprint: cr.hasSprint,
      isDoublePoints: false,
    });
    // Reset to 3 matchups (bonus toggles with isDoublePoints)
    setMatchups([emptyMatchup(1), emptyMatchup(2), emptyMatchup(3)]);
    setTab('create');
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Admin Panel</h1>
        <p>Manage races, matchups, and results</p>
      </div>

      {message && (
        <div className="alert alert-success" style={{ cursor: 'pointer' }} onClick={() => setMessage('')}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-8" style={{ marginBottom: 24 }}>
        {([
          ['races',  'All Races'],
          ['create', '+ Create Race'],
          ['sync',   'Sync Calendar'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); if (t === 'sync' && calRaces.length === 0) fetchCalendar(); }}
            className={`btn ${tab === t ? 'btn-secondary' : 'btn-outline'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* === Race List === */}
      {tab === 'races' && (
        <div>
          {races.length === 0 && <div className="card"><p className="text-gray">No races yet. Create one!</p></div>}
          {races.map((race: any) => (
            <div key={race.id} className="card">
              <div className="flex-between" style={{ marginBottom: 12 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{race.name}</span>
                  <span className="text-sm text-gray" style={{ marginLeft: 12 }}>Round {race.round} · {race.season}</span>
                </div>
                <span className={`status-badge status-${race.status}`}>{race.status}</span>
              </div>

              {/* Matchups summary */}
              <div style={{ marginBottom: 12 }}>
                {race.matchups.map((m: any) => (
                  <div key={m.id} className="text-sm" style={{ padding: '4px 0', color: '#374151' }}>
                    <strong>{m.order}.</strong> {m.title}: {m.driver1Name} vs {m.driver2Name}
                    {m.winnerId && <span className="badge badge-green" style={{ marginLeft: 8 }}>✓ {m.winnerId === 'driver1' ? m.driver1Name : m.driver2Name} won</span>}
                  </div>
                ))}
              </div>

              {/* Status controls */}
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {race.status === 'UPCOMING' && (
                  <button className="btn btn-sm btn-secondary"
                    onClick={() => updateStatus(race.id, 'OPEN')}>Open for Picks</button>
                )}
                {race.status === 'OPEN' && (
                  <button className="btn btn-sm btn-outline"
                    onClick={() => updateStatus(race.id, 'CLOSED')}>Close Submissions</button>
                )}
                {race.status === 'CLOSED' && (
                  <button className="btn btn-sm btn-primary"
                    onClick={() => { setResultsRaceId(race.id); setWinners({}); }}>
                    Enter Results
                  </button>
                )}
              </div>

              {/* Results entry panel */}
              {resultsRaceId === race.id && race.status === 'CLOSED' && (
                <div style={{ marginTop: 16, borderTop: '1px solid #000', paddingTop: 16 }}>
                  <p style={{ fontWeight: 700, marginBottom: 12 }}>Enter race results — who finished higher?</p>
                  {race.matchups.map((m: any) => (
                    <div key={m.id} className="form-group">
                      <label>{m.title}</label>
                      <div className="flex gap-8">
                        {['driver1', 'driver2'].map(d => (
                          <button key={d}
                            className={`btn btn-sm ${winners[m.id] === d ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setWinners(prev => ({ ...prev, [m.id]: d }))}>
                            {d === 'driver1' ? m.driver1Name : m.driver2Name} won
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-primary" onClick={submitResults}>
                    Process Results & Award Points
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* === Sync Calendar === */}
      {tab === 'sync' && (
        <div>
          <div className="flex-between" style={{ marginBottom: 16 }}>
            <div>
              <p className="text-sm text-gray">
                Live feed from motorsportcalendars.com — times shown in UTC.
                Click <strong>Setup →</strong> to pre-fill the Create Race form.
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={fetchCalendar} disabled={calLoading}>
              {calLoading ? 'Fetching...' : 'Refresh'}
            </button>
          </div>

          {calError && <div className="alert alert-error">{calError}</div>}
          {calLoading && <div className="loading">Fetching calendar...</div>}

          {!calLoading && calRaces.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Rnd</th>
                    <th>Grand Prix</th>
                    <th>Race Date (UTC)</th>
                    <th>Picks Lock (UTC)</th>
                    <th>Flags</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {calRaces.map(cr => {
                    const alreadyImported = races.some(
                      r => r.round === cr.round && r.season === cr.season
                    );
                    return (
                      <tr key={cr.gpKey} style={{ opacity: alreadyImported ? 0.4 : 1 }}>
                        <td style={{ fontWeight: 700, color: 'var(--red)', width: 48 }}>
                          {String(cr.round).padStart(2, '0')}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {cr.gpName}
                          <div className="text-gray" style={{ fontSize: '0.72rem', marginTop: 2 }}>
                            {cr.country} · {cr.circuit}
                          </div>
                        </td>
                        <td className="text-sm">{fmtUTC(cr.raceDate)}</td>
                        <td className="text-sm">{fmtUTC(cr.selectionsCloseAt)}</td>
                        <td>
                          {cr.hasSprint && (
                            <span className="badge badge-red">Sprint</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {alreadyImported ? (
                            <span className="text-gray text-sm">Imported</span>
                          ) : (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => setupFromCalendar(cr)}
                            >
                              Setup →
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!calLoading && !calError && calRaces.length === 0 && (
            <div className="card">
              <p className="text-gray text-sm">No upcoming races found in the calendar feed.</p>
            </div>
          )}
        </div>
      )}

      {/* === Create Race === */}
      {tab === 'create' && (
        <div className="card">
          <h2>Create New Race</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label>Race Name</label>
              <input value={raceForm.name} onChange={e => setRaceForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Monaco Grand Prix" />
            </div>
            <div className="form-group">
              <label>Round #</label>
              <input type="number" value={raceForm.round} onChange={e => setRaceForm(f => ({ ...f, round: +e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input value={raceForm.country} onChange={e => setRaceForm(f => ({ ...f, country: e.target.value }))}
                placeholder="Monaco" />
            </div>
            <div className="form-group">
              <label>Circuit</label>
              <input value={raceForm.circuit} onChange={e => setRaceForm(f => ({ ...f, circuit: e.target.value }))}
                placeholder="Circuit de Monaco" />
            </div>
            <div className="form-group">
              <label>Selections Open</label>
              <input type="datetime-local" value={raceForm.selectionsOpenAt}
                onChange={e => setRaceForm(f => ({ ...f, selectionsOpenAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Selections Close (start of qualifying)</label>
              <input type="datetime-local" value={raceForm.selectionsCloseAt}
                onChange={e => setRaceForm(f => ({ ...f, selectionsCloseAt: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Race Date</label>
              <input type="datetime-local" value={raceForm.raceDate}
                onChange={e => setRaceForm(f => ({ ...f, raceDate: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', paddingTop: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', color: 'var(--black)', fontSize: '0.8rem' }}>
                <input type="checkbox" checked={raceForm.hasSprint}
                  onChange={e => setRaceForm(f => ({ ...f, hasSprint: e.target.checked }))} />
                Sprint Weekend
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textTransform: 'none', color: 'var(--black)', fontSize: '0.8rem' }}>
                <input type="checkbox" checked={raceForm.isDoublePoints}
                  onChange={e => toggleBonus(e.target.checked)} />
                Double Points Week
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #000', paddingTop: 20, marginTop: 8 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Matchups</h3>
            {matchups.map((m, i) => (
              <div key={i} style={{ border: '1px solid #000', padding: 16, marginBottom: 12 }}>
                <p className="text-sm" style={{ fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '1px', color: m.isBonus ? 'var(--red)' : 'inherit' }}>
                  {m.isBonus ? '[Bonus]' : `Matchup ${m.order}`}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Title</label>
                    <input value={m.title} onChange={e => updateMatchup(i, 'title', e.target.value)}
                      placeholder="e.g. McLaren Driver Battle" />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Driver 1</label>
                    <select value={m.driver1Name} onChange={e => updateMatchup(i, 'driver1Name', e.target.value)}>
                      <option value="">Select driver...</option>
                      {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Driver 2</label>
                    <select value={m.driver2Name} onChange={e => updateMatchup(i, 'driver2Name', e.target.value)}>
                      <option value="">Select driver...</option>
                      {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={createRace} style={{ marginTop: 8 }}>
            Create Race
          </button>
        </div>
      )}
    </div>
  );
}
