'use client';
// src/app/leagues/join/[code]/page.tsx
// Handles invite link clicks: shows league info and lets the user join with a team.

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function JoinLeaguePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  const [league, setLeague]           = useState<any>(null);
  const [teams, setTeams]             = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [error, setError]             = useState('');
  const [message, setMessage]         = useState('');
  const [loading, setLoading]         = useState(true);
  const [joining, setJoining]         = useState(false);

  // Look up the league by code (public — no auth needed)
  useEffect(() => {
    fetch(`/api/leagues/join?code=${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setLeague(data);
        setLoading(false);
      });
  }, [code]);

  // Once authenticated, fetch the player's teams
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/teams')
        .then(r => r.json())
        .then(data => {
          setTeams(data);
          if (data.length > 0) setSelectedTeam(data[0].id);
        });
    }
  }, [status]);

  const handleJoin = async () => {
    if (!selectedTeam) return;
    setJoining(true);
    setError('');

    const res  = await fetch('/api/leagues/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode: code, teamId: selectedTeam }),
    });
    const data = await res.json();

    if (res.ok) {
      setMessage(`Joined ${data.league.name}! Redirecting...`);
      setTimeout(() => router.push('/leaderboard'), 1500);
    } else {
      setError(data.error || 'Failed to join league');
      setJoining(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div style={{ maxWidth: 480, margin: '48px auto' }}>
      <div className="page-header">
        <h1>Join League</h1>
        {league && <p>You've been invited to join <strong>{league.name}</strong></p>}
      </div>

      <div className="card">
        {error   && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {league && !message && (
          <>
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #000' }}>
              <div className="flex-between">
                <span className="text-gray" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>League</span>
                <span style={{ fontWeight: 700 }}>{league.name}</span>
              </div>
              <div className="flex-between" style={{ marginTop: 8 }}>
                <span className="text-gray" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Season</span>
                <span>{league.season}</span>
              </div>
              <div className="flex-between" style={{ marginTop: 8 }}>
                <span className="text-gray" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Members</span>
                <span>{league._count.leagueTeams}</span>
              </div>
            </div>

            {status === 'unauthenticated' && (
              <>
                <p className="text-gray" style={{ marginBottom: 16 }}>
                  You need an account to join this league.
                </p>
                <Link
                  href={`/signup?redirect=/leagues/join/${code}`}
                  className="btn btn-primary"
                  style={{ display: 'block', textAlign: 'center', padding: '11px', marginBottom: 8 }}
                >
                  Create account & join
                </Link>
                <Link
                  href={`/login?redirect=/leagues/join/${code}`}
                  className="btn btn-outline"
                  style={{ display: 'block', textAlign: 'center', padding: '11px' }}
                >
                  Log in & join
                </Link>
              </>
            )}

            {status === 'authenticated' && teams.length === 0 && (
              <>
                <p className="text-gray" style={{ marginBottom: 16 }}>
                  You need a team before you can join a league.
                </p>
                <Link href="/dashboard" className="btn btn-primary"
                  style={{ display: 'block', textAlign: 'center', padding: '11px' }}>
                  Create a team on your dashboard
                </Link>
              </>
            )}

            {status === 'authenticated' && teams.length > 0 && (
              <>
                <div className="form-group">
                  <label>Select your team</label>
                  <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                    {teams.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '11px' }}
                  onClick={handleJoin}
                  disabled={joining || !selectedTeam}
                >
                  {joining ? 'Joining...' : `Join ${league.name}`}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
