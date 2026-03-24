'use client';
// src/app/picks/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function PicksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [race, setRace] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [existingPicks, setExistingPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [animated, setAnimated] = useState(false);

  // History accordion state
  const [history, setHistory] = useState<any[]>([]);
  const [expandedRaces, setExpandedRaces] = useState<Set<string>>(new Set());
  const [animatedRaces, setAnimatedRaces] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  useEffect(() => {
    if (selectedTeam && race) fetchExistingPicks();
  }, [selectedTeam, race]);

  useEffect(() => {
    if (selectedTeam) fetchHistory();
  }, [selectedTeam, race?.id]);

  // Trigger fill animation for current race visualizer
  useEffect(() => {
    if (race?.status === 'CLOSED' || race?.status === 'COMPLETED') {
      const t = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(t);
    }
  }, [race?.status]);

  const fetchData = async () => {
    const [raceRes, teamsRes] = await Promise.all([
      fetch('/api/matchups'),
      fetch('/api/teams'),
    ]);
    const raceData = await raceRes.json();
    const teamsData = await teamsRes.json();
    setRace(raceData.race ?? null);
    setTeams(teamsData);
    if (teamsData.length > 0) setSelectedTeam(teamsData[0].id);
    setLoading(false);
  };

  const fetchExistingPicks = async () => {
    if (!race) return;
    const res = await fetch(`/api/picks?teamId=${selectedTeam}&raceId=${race.id}`);
    const data = await res.json();
    setExistingPicks(data);
    const pickMap: Record<string, string> = {};
    data.forEach((p: any) => { pickMap[p.matchupId] = p.selection; });
    setPicks(pickMap);
  };

  const fetchHistory = async () => {
    if (!selectedTeam) return;
    const excludeParam = race?.id ? `&excludeRaceId=${race.id}` : '';
    const res = await fetch(`/api/picks/history?teamId=${selectedTeam}${excludeParam}`);
    if (res.ok) setHistory(await res.json());
  };

  const selectDriver = (matchupId: string, selection: 'driver1' | 'driver2') => {
    setPicks(prev => ({ ...prev, [matchupId]: selection }));
  };

  const submitPicks = async () => {
    if (!selectedTeam) { setMessage('Please select a team'); return; }
    const matchups = race?.matchups ?? [];
    if (Object.keys(picks).length < matchups.length) {
      setMessage('Please pick a driver for every matchup');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/picks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: selectedTeam,
        picks: Object.entries(picks).map(([matchupId, selection]) => ({ matchupId, selection })),
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? 'Picks saved! Good luck.' : data.error);
    setSubmitting(false);
  };

  const toggleRace = (raceId: string) => {
    const next = new Set(expandedRaces);
    if (next.has(raceId)) {
      next.delete(raceId);
    } else {
      next.add(raceId);
      setTimeout(() => setAnimatedRaces(prev => new Set([...prev, raceId])), 80);
    }
    setExpandedRaces(next);
  };

  if (loading) return <div className="loading">Loading matchups...</div>;

  const isClosed = race?.status === 'CLOSED';
  const isCompleted = race?.status === 'COMPLETED';
  const showVisualizer = isClosed || isCompleted;

  const renderVisualizer = (
    matchup: any,
    pickSelection: string | undefined,
    isCompletedCtx: boolean,
    isAnimated: boolean
  ) => {
    const winner = matchup.winnerId;
    const counts = matchup.pickCounts;
    const d1Pct = counts?.driver1Pct ?? 50;
    const d2Pct = counts?.driver2Pct ?? 50;

    const getTag = (driverId: 'driver1' | 'driver2') => {
      if (!pickSelection || pickSelection !== driverId) return null;
      return <span className="driver-viz-tag">Your Pick</span>;
    };

    return (
      <div className="matchup-drivers">
        <div className={`driver-viz${pickSelection === 'driver1' ? ' driver-viz-picked' : ''}`}>
          <div className="driver-viz-fill driver-viz-fill-left" style={{ width: isAnimated ? `${d1Pct}%` : '0%' }} />
          <div className="driver-viz-content">
            {getTag('driver1')}
            <span
              className="driver-viz-name"
              style={isCompletedCtx && winner === 'driver1' ? { color: '#16a34a' } : undefined}
            >
              {isCompletedCtx && winner === 'driver1' && '✅ '}
              {matchup.driver1Name}
            </span>
            <span className="driver-viz-pct">{d1Pct}%</span>
          </div>
        </div>
        <span className="vs-divider">VS</span>
        <div className={`driver-viz${pickSelection === 'driver2' ? ' driver-viz-picked' : ''}`}>
          <div className="driver-viz-fill driver-viz-fill-right" style={{ width: isAnimated ? `${d2Pct}%` : '0%' }} />
          <div className="driver-viz-content">
            {getTag('driver2')}
            <span
              className="driver-viz-name"
              style={isCompletedCtx && winner === 'driver2' ? { color: '#16a34a' } : undefined}
            >
              {isCompletedCtx && winner === 'driver2' && '✅ '}
              {matchup.driver2Name}
            </span>
            <span className="driver-viz-pct">{d2Pct}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header flex-between">
        <div>
          <h1>{race ? race.name : 'Weekly Picks'}</h1>
          {race && (
            <p>Round {race.round} · {race.country}
              {race.isDoublePoints && <span className="badge badge-red" style={{ marginLeft: 8 }}>2x Points</span>}
            </p>
          )}
        </div>
        {race?.status === 'OPEN' && (
          <div>
            <label className="text-sm text-gray" style={{ display: 'block', marginBottom: 4 }}>Picking for team:</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} style={{ width: 'auto' }}>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── No race state ── */}
      {!race && (
        <div className="card">
          <p style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            No race open for picks right now
          </p>
          <p className="text-gray text-sm">Selections open each Wednesday at noon. Check back soon.</p>
        </div>
      )}

      {/* ── Current race ── */}
      {race && (
        <>
          {message && <div className="alert alert-success">{message}</div>}

          {isClosed && (
            <div className="alert" style={{ borderLeftColor: 'var(--gray)', marginBottom: 24 }}>
              <strong>Picks locked</strong> — Awaiting race results. Here&apos;s how everyone picked.
            </div>
          )}

          {!isClosed && (
            <div className="alert alert-info" style={{ marginBottom: 24 }}>
              <strong>Scoring:</strong> 1 correct = 1pt · 2 correct = 3pts · 3 correct = 6pts
              {race.isDoublePoints && ' · All correct = DOUBLED!'}
            </div>
          )}

          {race.matchups.map((matchup: any) => {
            const pick = picks[matchup.id];

            if (showVisualizer) {
              return (
                <div key={matchup.id} className="matchup-card">
                  <div className="matchup-title">
                    {matchup.isBonus && '[BONUS] '}{matchup.title}
                  </div>
                  {renderVisualizer(matchup, pick, isCompleted, animated)}
                </div>
              );
            }

            return (
              <div key={matchup.id} className="matchup-card">
                <div className="matchup-title">
                  {matchup.isBonus && '[BONUS] '}{matchup.title}
                </div>
                <div className="matchup-drivers">
                  <button
                    className={`driver-option${pick === 'driver1' ? ' selected' : ''}`}
                    onClick={() => selectDriver(matchup.id, 'driver1')}
                  >
                    {matchup.driver1Name}
                  </button>
                  <span className="vs-divider">VS</span>
                  <button
                    className={`driver-option${pick === 'driver2' ? ' selected' : ''}`}
                    onClick={() => selectDriver(matchup.id, 'driver2')}
                  >
                    {matchup.driver2Name}
                  </button>
                </div>
              </div>
            );
          })}

          {race.status === 'OPEN' && (
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={submitPicks} disabled={submitting}
                style={{ padding: '11px 32px' }}>
                {submitting ? 'Saving...' : existingPicks.length > 0 ? 'Update Picks' : 'Submit Picks'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Previous picks accordion ── */}
      {history.length > 0 && (
        <div className="history-section">
          <p className="history-section-title">Previous Picks</p>
          {history.map((pastRace: any) => {
            const isOpen = expandedRaces.has(pastRace.id);
            const isAnim = animatedRaces.has(pastRace.id);
            const result = pastRace.result;

            return (
              <div key={pastRace.id} className="accordion-race">
                <button className="accordion-race-header" onClick={() => toggleRace(pastRace.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="accordion-chevron">{isOpen ? '▾' : '▸'}</span>
                    <span className="accordion-race-round">RD {pastRace.round}</span>
                    <span className="accordion-race-name">{pastRace.name}</span>
                    {pastRace.isDoublePoints && (
                      <span className="badge badge-red" style={{ fontSize: '0.55rem' }}>2×</span>
                    )}
                  </div>
                  {result && (
                    <span className="accordion-race-score">
                      {result.correct}/{result.total} correct
                      <span className="pts"> · {result.points} pts</span>
                    </span>
                  )}
                </button>

                {isOpen && (
                  <div className="accordion-race-body">
                    {pastRace.matchups.map((matchup: any) => (
                      <div key={matchup.id} className="matchup-card" style={{ marginBottom: 6 }}>
                        <div className="matchup-title">
                          {matchup.isBonus && '[BONUS] '}{matchup.title}
                        </div>
                        {renderVisualizer(matchup, matchup.myPick, true, isAnim)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
