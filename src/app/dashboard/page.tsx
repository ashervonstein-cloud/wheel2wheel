'use client';
// src/app/dashboard/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [teams, setTeams] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [newLeagueName, setNewLeagueName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [selectedTeamForJoin, setSelectedTeamForJoin] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedLeagueId, setCopiedLeagueId] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    const [teamsRes, leaguesRes] = await Promise.all([
      fetch('/api/teams'),
      fetch('/api/leagues'),
    ]);
    setTeams(await teamsRes.json());
    setLeagues(await leaguesRes.json());
    setLoading(false);
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName }),
    });
    if (res.ok) {
      setNewTeamName('');
      setMessage('Team created!');
      fetchData();
    }
  };

  const createLeague = async () => {
    if (!newLeagueName.trim()) return;
    const res = await fetch('/api/leagues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLeagueName, isPublic: true }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewLeagueName('');
      setMessage(`League created! Share this link: ${data.joinLink}`);
      fetchData();
    }
  };

  const joinLeague = async () => {
    if (!inviteCode || !selectedTeamForJoin) {
      setMessage('Select a team and enter the invite code');
      return;
    }
    const res = await fetch('/api/leagues/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteCode, teamId: selectedTeamForJoin }),
    });
    const data = await res.json();
    setMessage(res.ok ? `Joined ${data.league.name}!` : data.error);
    if (res.ok) { setInviteCode(''); fetchData(); }
  };

  const copyInviteLink = (league: any) => {
    const link = `${window.location.origin}/leagues/join/${league.inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLeagueId(league.id);
    setTimeout(() => setCopiedLeagueId(''), 2000);
  };

  // Deduplicate leagues from all team memberships
  const myLeagues = Array.from(
    new Map(
      teams.flatMap((t: any) => t.leagueTeams?.map((lt: any) => [lt.leagueId, lt.league]) ?? [])
    ).values()
  ) as any[];

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back, {session?.user?.name}</p>
        </div>
        <Link href="/picks" className="btn btn-primary">Make This Week's Picks</Link>
      </div>

      {message && (
        <div className="alert alert-success" style={{ cursor: 'pointer' }} onClick={() => setMessage('')}>
          {message} <span style={{ float: 'right', opacity: 0.5 }}>[dismiss]</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Teams */}
        <div className="card">
          <h2>My Teams</h2>
          {teams.length === 0 && <p className="text-gray text-sm">No teams yet. Create one below.</p>}
          {teams.map((team: any) => (
            <div key={team.id} style={{ borderBottom: '1px solid #000', padding: '10px 0' }}>
              <div className="flex-between">
                <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{team.name}</span>
                <span className="badge">{team.leagueTeams?.length ?? 0} league(s)</span>
              </div>
              {team.leagueTeams?.map((lt: any) => (
                <Link key={lt.id} href={`/leaderboard?leagueId=${lt.leagueId}`}
                  className="text-sm" style={{ color: 'var(--red)', display: 'block', marginTop: 4, textDecoration: 'none', fontWeight: 600 }}>
                  {lt.league.name} /
                </Link>
              ))}
            </div>
          ))}
          <div className="flex gap-8 mt-16">
            <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
              placeholder="Team name" onKeyDown={e => e.key === 'Enter' && createTeam()} />
            <button className="btn btn-secondary btn-sm" onClick={createTeam}>Create</button>
          </div>
        </div>

        {/* Leagues */}
        <div className="card">
          <h2>Leagues</h2>

          {myLeagues.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {myLeagues.map((league: any) => (
                <div key={league.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #000', padding: '8px 0' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{league.name}</span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => copyInviteLink(league)}
                  >
                    {copiedLeagueId === league.id ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <p className="text-sm text-gray" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Create a new league:</p>
            <div className="flex gap-8">
              <input value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)}
                placeholder="League name" onKeyDown={e => e.key === 'Enter' && createLeague()} />
              <button className="btn btn-secondary btn-sm" onClick={createLeague}>Create</button>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #000', paddingTop: 16 }}>
            <p className="text-sm text-gray" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Join with invite code:</p>
            <select value={selectedTeamForJoin} onChange={e => setSelectedTeamForJoin(e.target.value)}
              style={{ marginBottom: 8 }}>
              <option value="">Select your team...</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex gap-8">
              <input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Invite code" />
              <button className="btn btn-outline btn-sm" onClick={joinLeague}>Join</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
