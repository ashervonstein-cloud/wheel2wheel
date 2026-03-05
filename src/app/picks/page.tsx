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
  const [picks, setPicks] = useState<Record<string, string>>({}); // matchupId -> "driver1"|"driver2"
  const [existingPicks, setExistingPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  useEffect(() => {
    if (selectedTeam && race) fetchExistingPicks();
  }, [selectedTeam, race]);

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
    // Pre-fill the picks state
    const pickMap: Record<string, string> = {};
    data.forEach((p: any) => { pickMap[p.matchupId] = p.selection; });
    setPicks(pickMap);
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

  if (loading) return <div className="loading">Loading matchups...</div>;

  if (!race) {
    return (
      <div>
        <div className="page-header"><h1>Weekly Picks</h1></div>
        <div className="card">
          <p style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            No race open for picks right now
          </p>
          <p className="text-gray text-sm">Selections open each Wednesday at noon. Check back soon.</p>
        </div>
      </div>
    );
  }

  const isCompleted = race.status === 'COMPLETED';

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>{race.name}</h1>
          <p>Round {race.round} · {race.country}
            {race.isDoublePoints && <span className="badge badge-red" style={{ marginLeft: 8 }}>2x Points</span>}
          </p>
        </div>
        {!isCompleted && (
          <div>
            <label className="text-sm text-gray" style={{ display: 'block', marginBottom: 4 }}>Picking for team:</label>
            <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}
              style={{ width: 'auto' }}>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <strong>Scoring:</strong> 1 correct = 1pt · 2 correct = 3pts · 3 correct = 6pts
        {race.isDoublePoints && ' · All correct = DOUBLED!'}
      </div>

      {race.matchups.map((matchup: any) => {
        const pick = picks[matchup.id];
        const existing = existingPicks.find(p => p.matchupId === matchup.id);
        const winner = matchup.winnerId;

        const getClass = (driverId: 'driver1' | 'driver2') => {
          if (isCompleted && winner) {
            if (winner === driverId && pick === driverId) return 'driver-option correct';
            if (winner !== driverId && pick === driverId) return 'driver-option incorrect';
            if (winner === driverId) return 'driver-option correct';
            return 'driver-option';
          }
          return `driver-option${pick === driverId ? ' selected' : ''}`;
        };

        return (
          <div key={matchup.id} className="matchup-card">
            <div className="matchup-title">
              {matchup.isBonus && '[BONUS] '}
              {matchup.title}
            </div>
            <div className="matchup-drivers">
              <button
                className={getClass('driver1')}
                onClick={() => !isCompleted && selectDriver(matchup.id, 'driver1')}
                disabled={isCompleted}
              >
                {matchup.driver1Name}
                {isCompleted && winner === 'driver1' && ' ✓'}
              </button>
              <span className="vs-divider">VS</span>
              <button
                className={getClass('driver2')}
                onClick={() => !isCompleted && selectDriver(matchup.id, 'driver2')}
                disabled={isCompleted}
              >
                {matchup.driver2Name}
                {isCompleted && winner === 'driver2' && ' ✓'}
              </button>
            </div>
          </div>
        );
      })}

      {!isCompleted && (
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <button className="btn btn-primary" onClick={submitPicks} disabled={submitting}
            style={{ padding: '11px 32px' }}>
            {submitting ? 'Saving...' : existingPicks.length > 0 ? 'Update Picks' : 'Submit Picks'}
          </button>
        </div>
      )}
    </div>
  );
}
