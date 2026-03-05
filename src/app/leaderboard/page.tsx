'use client';
// src/app/leaderboard/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function LeaderboardPage() {
  const { status } = useSession();
  const params = useSearchParams();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState(params.get('leagueId') || '');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') fetchLeagues();
  }, [status]);

  useEffect(() => {
    if (selectedLeague) fetchLeaderboard(selectedLeague);
  }, [selectedLeague]);

  const fetchLeagues = async () => {
    const res = await fetch('/api/leagues');
    const data = await res.json();
    setLeagues(data);
    if (!selectedLeague && data.length > 0) setSelectedLeague(data[0].id);
  };

  const fetchLeaderboard = async (leagueId: string) => {
    setLoading(true);
    const res = await fetch(`/api/leagues/${leagueId}/leaderboard`);
    const data = await res.json();
    setLeaderboard(data.leaderboard ?? []);
    setLeagueName(data.league?.name ?? '');
    setLoading(false);
  };

  const rankLabel = (rank: number) => {
    return String(rank).padStart(2, '0') + '.';
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Leaderboard</h1>
          <p>{leagueName || 'Select a league to view standings'}</p>
        </div>
        <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}
          style={{ width: 'auto' }}>
          <option value="">Select a league...</option>
          {leagues.map((l: any) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading">Loading standings...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center" style={{ padding: 48 }}>
            <p className="text-gray">No entries yet. Share your league invite link to get started!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>Player</th>
                <th>Points</th>
                <th>Correct</th>
                <th>Picks Made</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry: any) => (
                <tr key={entry.teamId}>
                  <td>
                    <span className={entry.rank <= 3 ? `rank-${entry.rank}` : 'text-gray'}>
                      {rankLabel(entry.rank)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{entry.teamName}</td>
                  <td className="text-gray">{entry.playerName}</td>
                  <td>
                    <span style={{ fontWeight: 800, color: entry.rank === 1 ? 'var(--red)' : 'inherit' }}>
                      {entry.points}
                    </span>
                  </td>
                  <td>{entry.correct}</td>
                  <td>{entry.picks}</td>
                  <td className="text-gray">
                    {entry.picks > 0 ? `${Math.round((entry.correct / entry.picks) * 100)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="alert alert-info mt-16">
        <strong>Scoring:</strong> 1 correct = 1pt · 2 correct = 3pts · 3 correct = 6pts · Season total determines champion
      </div>
    </div>
  );
}
