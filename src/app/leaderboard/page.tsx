'use client';
// src/app/leaderboard/page.tsx
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SCORING_RULES, BOOST_RULE } from '@/lib/scoring';

function LeaderboardContent() {
  const { status } = useSession();
  const params = useSearchParams();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState(params.get('leagueId') || '');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leagueName, setLeagueName] = useState('');
  const [completedRaces, setCompletedRaces] = useState<{ round: number; name: string }[]>([]);
  const [lastRound, setLastRound] = useState<{ round: number; name: string } | null>(null);
  const [selectedRound, setSelectedRound] = useState(''); // '' = all rounds
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [myTeamIds, setMyTeamIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'authenticated') { fetchLeagues(); fetchMyTeams(); }
  }, [status]);

  useEffect(() => {
    if (selectedLeague) fetchLeaderboard(selectedLeague, selectedRound);
  }, [selectedLeague, selectedRound]);

  const fetchLeagues = async () => {
    try {
      const res = await fetch('/api/leagues');
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setLeagues(list);
      // Open on a league you're actually in — otherwise the page answers
      // "where am I?" with standings you don't appear in.
      const initial = list.find((l: any) => l.isMember) ?? list[0];
      if (!selectedLeague && initial) setSelectedLeague(initial.id);
      else if (list.length === 0) setLoading(false);
    } catch {
      setError("Couldn't load your leagues. Check your connection and try again.");
      setLoading(false);
    }
  };

  // Knowing which rows are yours is the whole point of opening this page.
  const fetchMyTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setMyTeamIds(new Set(data.map((t: any) => t.id)));
    } catch {
      /* the board still renders, just without the you-marker */
    }
  };

  const fetchLeaderboard = async (leagueId: string, throughRound: string) => {
    setLoading(true);
    setError('');
    try {
      const url = throughRound
        ? `/api/leagues/${leagueId}/leaderboard?throughRound=${throughRound}`
        : `/api/leagues/${leagueId}/leaderboard`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setLeaderboard(data.leaderboard ?? []);
      setLeagueName(data.league?.name ?? '');
      setCompletedRaces(data.completedRaces ?? []);
      setLastRound(data.lastRound ?? null);
    } catch {
      // An error must not masquerade as an empty league.
      setLeaderboard([]);
      setError("Couldn't load these standings. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const rankLabel = (rank: number) => String(rank).padStart(2, '0') + '.';
  const accuracy = (e: any) => (e.picks > 0 ? `${Math.round((e.correct / e.picks) * 100)}%` : '—');
  // "0" reads as "played and scored nothing". An em dash reads as "wasn't there".
  const delta = (e: any) => (!e.lastRoundPlayed ? '—' : e.lastRoundPoints > 0 ? `+${e.lastRoundPoints}` : '0');

  const currentLeague = leagues.find(l => l.id === selectedLeague);
  const inviteLink = currentLeague
    ? `${window.location.origin}/leagues/join/${currentLeague.inviteCode}`
    : null;

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link:', inviteLink);
    }
  };

  const downloadPng = async () => {
    if (leaderboard.length === 0) return;
    setGenerating(true);

    const dpr = 2; // retina sharpness
    const fontSize = 12;
    const font = `${fontSize}px "JetBrains Mono", monospace`;
    const fontBold = `bold ${fontSize}px "JetBrains Mono", monospace`;
    const fontSmall = '10px "JetBrains Mono", monospace';
    const fontTitle = 'bold 18px "JetBrains Mono", monospace';
    const fontSubtitle = '11px "JetBrains Mono", monospace';

    // Measure the longest team name to set dynamic column width
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d')!;
    measureCtx.font = fontBold;
    const maxTeamW = Math.max(...leaderboard.map((e: any) => measureCtx.measureText(e.teamName).width));
    const maxPlayerW = Math.max(...leaderboard.map((e: any) => measureCtx.measureText(e.playerName).width));
    const teamColW = Math.max(120, Math.ceil(maxTeamW) + 24);
    const playerColW = Math.max(120, Math.ceil(maxPlayerW) + 24);

    type Col = { label: string; width: number; align: 'left' | 'center' | 'right' };
    const cols: Col[] = [
      { label: 'RANK', width: 60, align: 'center' },
      { label: 'TEAM', width: teamColW, align: 'left' },
      { label: 'PLAYER', width: playerColW, align: 'left' },
      { label: 'PTS', width: 55, align: 'center' },
      ...(lastRound ? [{ label: `R${lastRound.round}`, width: 55, align: 'center' as const }] : []),
      { label: 'CORRECT', width: 70, align: 'center' },
      { label: 'PICKS', width: 55, align: 'center' },
      { label: 'ACC', width: 55, align: 'center' },
    ];

    const padL = 40;
    const padR = 60;
    const tableW = cols.reduce((s, c) => s + c.width, 0);
    const canvasW = tableW + padL + padR;
    const headerAreaH = 80;
    const rowH = 30;
    const thH = 28;
    const footerH = 40;
    const canvasH = headerAreaH + thH + leaderboard.length * rowH + footerH;

    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Title area
    ctx.fillStyle = '#000000';
    ctx.font = fontTitle;
    ctx.textAlign = 'left';
    ctx.fillText('WHEEL 2 WHEEL', padL, 36);
    ctx.fillStyle = '#666666';
    ctx.font = fontSubtitle;
    const subtitle = leagueName + (selectedRound ? ` — After Round ${selectedRound}` : ' — Full Season');
    ctx.fillText(subtitle, padL, 56);

    // Divider under header
    ctx.fillStyle = '#000000';
    ctx.fillRect(padL, headerAreaH - 10, tableW, 2);

    // Table header
    const tableTop = headerAreaH;
    ctx.fillStyle = '#000000';
    ctx.fillRect(padL, tableTop, tableW, thH);
    ctx.fillStyle = '#ffffff';
    ctx.font = fontSmall;
    let x = padL;
    for (const col of cols) {
      ctx.textAlign = col.align;
      const tx = col.align === 'center' ? x + col.width / 2 : col.align === 'left' ? x + 12 : x + col.width - 12;
      ctx.fillText(col.label, tx, tableTop + 18);
      x += col.width;
    }

    // Table rows
    const bodyTop = tableTop + thH;
    leaderboard.forEach((entry: any, i: number) => {
      const y = bodyTop + i * rowH;

      // Alternating row bg
      if (i % 2 === 1) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(padL, y, tableW, rowH);
      }

      // Row bottom border
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(padL, y + rowH - 1, tableW, 1);

      const textY = y + 19;
      let cx = padL;

      // Rank
      ctx.textAlign = 'center';
      ctx.font = fontBold;
      ctx.fillStyle = entry.rank === 1 ? '#ff1e00' : entry.rank <= 3 ? '#000000' : '#666666';
      ctx.fillText(rankLabel(entry.rank), cx + cols[0].width / 2, textY);
      cx += cols[0].width;

      // Team
      ctx.textAlign = 'left';
      ctx.font = fontBold;
      ctx.fillStyle = '#000000';
      ctx.fillText(entry.teamName, cx + 12, textY);
      cx += cols[1].width;

      // Player
      ctx.font = font;
      ctx.fillStyle = '#666666';
      ctx.fillText(entry.playerName, cx + 12, textY);
      cx += cols[2].width;

      // Points
      ctx.textAlign = 'center';
      ctx.font = fontBold;
      ctx.fillStyle = entry.rank === 1 ? '#ff1e00' : '#000000';
      ctx.fillText(String(entry.points), cx + cols[3].width / 2, textY);
      cx += cols[3].width;

      // Remaining columns: use cols array index to stay in sync
      let colIdx = 4; // next col after PTS

      // Last round points (if applicable)
      if (lastRound) {
        ctx.font = font;
        ctx.fillStyle = '#666666';
        ctx.fillText(entry.lastRoundPoints > 0 ? `+${entry.lastRoundPoints}` : '0', cx + cols[colIdx].width / 2, textY);
        cx += cols[colIdx].width;
        colIdx++;
      }

      // Correct
      ctx.font = font;
      ctx.fillStyle = '#000000';
      ctx.fillText(String(entry.correct), cx + cols[colIdx].width / 2, textY);
      cx += cols[colIdx].width;
      colIdx++;

      // Picks
      ctx.fillText(String(entry.picks), cx + cols[colIdx].width / 2, textY);
      cx += cols[colIdx].width;
      colIdx++;

      // Accuracy
      ctx.fillStyle = '#666666';
      const acc = entry.picks > 0 ? `${Math.round((entry.correct / entry.picks) * 100)}%` : '—';
      ctx.fillText(acc, cx + cols[colIdx].width / 2, textY);
    });

    // Footer
    ctx.fillStyle = '#666666';
    ctx.font = fontSmall;
    ctx.textAlign = 'left';
    ctx.fillText('Scoring: 1 correct = 1pt · 2 correct = 3pts · 3 correct = 6pts', padL, canvasH - 14);

    // Download
    try {
      const link = document.createElement('a');
      link.download = `w2w-standings-${leagueName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      setError("Couldn't generate the standings image on this browser.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Leaderboard</h1>
          <p>{leagueName || 'Select a league to view standings'}{selectedRound ? ` — after Round ${selectedRound}` : ''}</p>
        </div>
        {/* League first, then the round filter that depends on it. */}
        <div className="leaderboard-filters">
          <label htmlFor="lb-league" className="sr-only">League</label>
          <select
            id="lb-league"
            value={selectedLeague}
            onChange={e => { setSelectedLeague(e.target.value); setSelectedRound(''); }}
          >
            <option value="">Select a league...</option>
            {leagues.map((l: any) => (
              <option key={l.id} value={l.id}>
                {l.name}{l.isMember ? '' : ' (not joined)'}
              </option>
            ))}
          </select>
          <label htmlFor="lb-round" className="sr-only">Standings through round</label>
          <select id="lb-round" value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
            <option value="">All Rounds</option>
            {completedRaces.map((r) => (
              <option key={r.round} value={r.round}>After R{r.round} — {r.name}</option>
            ))}
          </select>
          {leaderboard.length > 0 && (
            <button
              className="btn btn-outline btn-sm btn-icon"
              onClick={downloadPng}
              disabled={generating}
              aria-label="Download standings as a PNG image"
            >
              {generating ? (
                <span aria-hidden="true" style={{ fontSize: '0.7rem' }}>···</span>
              ) : (
                <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M8 1.5v9M4.5 7.5L8 11l3.5-3.5M2 13.5h12" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {inviteLink && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span className="text-gray" style={{ fontSize: '0.8rem', flexShrink: 0 }}>Invite link</span>
          <code style={{
            flex: 1, padding: '6px 10px', border: '1px solid var(--black)',
            fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {inviteLink}
          </code>
          <button className="btn btn-outline btn-sm" onClick={copyInviteLink} style={{ flexShrink: 0 }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span className="alert-label">Error</span>{error}
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="loading">Loading standings...</div>
        ) : leagues.length === 0 ? (
          <div className="text-center" style={{ padding: 48 }}>
            <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              You&apos;re not in a league yet
            </p>
            <p className="text-gray text-sm" style={{ marginBottom: 16 }}>
              Standings are per league. Create one and invite your friends, or join
              theirs with an invite code.
            </p>
            <Link href="/dashboard" className="btn btn-primary">Create or join a league</Link>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center" style={{ padding: 48 }}>
            <p style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
              No teams in this league yet
            </p>
            <p className="text-gray text-sm">
              Share the invite link above and the standings will fill in.
            </p>
          </div>
        ) : (
          <>
            <table className="lb-table">
              <caption className="sr-only">
                {leagueName} standings{selectedRound ? ` after round ${selectedRound}` : ', full season'}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Team</th>
                  <th scope="col">Player</th>
                  <th scope="col">Points</th>
                  {lastRound && <th scope="col">R{lastRound.round}</th>}
                  <th scope="col">Correct</th>
                  <th scope="col">Picks Made</th>
                  <th scope="col">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry: any) => {
                  const isYou = myTeamIds.has(entry.teamId);
                  return (
                    <tr key={entry.teamId} className={isYou ? 'is-you' : undefined}>
                      <td>
                        <span className={entry.rank <= 3 ? `rank-${entry.rank}` : 'text-gray'}>
                          {rankLabel(entry.rank)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {entry.teamName}
                        {isYou && <span className="you-tag">You</span>}
                      </td>
                      <td className="text-gray">{entry.playerName}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: entry.rank === 1 ? 'var(--red-ink)' : 'inherit' }}>
                          {entry.points}
                        </span>
                      </td>
                      {lastRound && <td className="text-gray">{delta(entry)}</td>}
                      <td>{entry.correct}</td>
                      <td>{entry.picks}</td>
                      <td className="text-gray">{accuracy(entry)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile: rank, team, points up front — the three things the
                page is actually asked. The rest sits in the meta line. */}
            <div className="lb-cards">
              {leaderboard.map((entry: any) => {
                const isYou = myTeamIds.has(entry.teamId);
                return (
                  <div
                    key={entry.teamId}
                    className={`lb-card${isYou ? ' is-you' : ''}${entry.rank === 1 ? ' is-first' : ''}`}
                  >
                    <span className="lb-card-rank">{rankLabel(entry.rank)}</span>
                    <div>
                      <div className="lb-card-team">
                        {entry.teamName}
                        {isYou && <span className="you-tag">You</span>}
                      </div>
                      <div className="lb-card-meta">
                        <span>{entry.playerName}</span>
                        <span>{entry.correct}/{entry.picks} · {accuracy(entry)}</span>
                        {lastRound && (
                          <span>
                            R{lastRound.round} <span className="lb-card-delta">{delta(entry)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="lb-card-pts">
                      <b>{entry.points}</b>
                      <span>pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="alert alert-info mt-16">
        <span className="alert-label">Scoring</span>
        {SCORING_RULES} · {BOOST_RULE} Season total determines the champion.
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardContent />
    </Suspense>
  );
}
