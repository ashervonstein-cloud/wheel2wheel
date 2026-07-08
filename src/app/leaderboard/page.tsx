'use client';
// src/app/leaderboard/page.tsx
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

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
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') fetchLeagues();
  }, [status]);

  useEffect(() => {
    if (selectedLeague) fetchLeaderboard(selectedLeague, selectedRound);
  }, [selectedLeague, selectedRound]);

  const fetchLeagues = async () => {
    const res = await fetch('/api/leagues');
    const data = await res.json();
    setLeagues(data);
    if (!selectedLeague && data.length > 0) setSelectedLeague(data[0].id);
  };

  const fetchLeaderboard = async (leagueId: string, throughRound: string) => {
    setLoading(true);
    const url = throughRound
      ? `/api/leagues/${leagueId}/leaderboard?throughRound=${throughRound}`
      : `/api/leagues/${leagueId}/leaderboard`;
    const res = await fetch(url);
    const data = await res.json();
    setLeaderboard(data.leaderboard ?? []);
    setLeagueName(data.league?.name ?? '');
    setCompletedRaces(data.completedRaces ?? []);
    setLastRound(data.lastRound ?? null);
    setLoading(false);
  };

  const rankLabel = (rank: number) => String(rank).padStart(2, '0') + '.';

  const currentLeague = leagues.find(l => l.id === selectedLeague);
  const inviteLink = currentLeague
    ? `${window.location.origin}/leagues/join/${currentLeague.inviteCode}`
    : null;

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPng = async () => {
    if (leaderboard.length === 0) return;
    setGenerating(true);

    const dpr = 2; // retina sharpness
    const font = '14px "JetBrains Mono", monospace';
    const fontBold = 'bold 14px "JetBrains Mono", monospace';
    const fontSmall = '11px "JetBrains Mono", monospace';
    const fontTitle = 'bold 20px "JetBrains Mono", monospace';
    const fontSubtitle = '12px "JetBrains Mono", monospace';

    const cols = [
      { label: 'RANK', width: 70, align: 'center' as const },
      { label: 'TEAM', width: 180, align: 'left' as const },
      { label: 'PLAYER', width: 160, align: 'left' as const },
      { label: 'PTS', width: 70, align: 'center' as const },
      ...(lastRound ? [{ label: `R${lastRound.round}`, width: 70, align: 'center' as const }] : []),
      { label: 'CORRECT', width: 80, align: 'center' as const },
      { label: 'PICKS', width: 70, align: 'center' as const },
      { label: 'ACC', width: 70, align: 'center' as const },
    ];

    const padX = 40;
    const tableW = cols.reduce((s, c) => s + c.width, 0);
    const canvasW = tableW + padX * 2;
    const headerAreaH = 80;
    const rowH = 36;
    const thH = 32;
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
    ctx.fillText('WHEEL 2 WHEEL', padX, 36);
    ctx.fillStyle = '#666666';
    ctx.font = fontSubtitle;
    const subtitle = leagueName + (selectedRound ? ` — After Round ${selectedRound}` : ' — Full Season');
    ctx.fillText(subtitle, padX, 56);

    // Divider under header
    ctx.fillStyle = '#000000';
    ctx.fillRect(padX, headerAreaH - 10, tableW, 2);

    // Table header
    const tableTop = headerAreaH;
    ctx.fillStyle = '#000000';
    ctx.fillRect(padX, tableTop, tableW, thH);
    ctx.fillStyle = '#ffffff';
    ctx.font = fontSmall;
    let x = padX;
    for (const col of cols) {
      ctx.textAlign = col.align;
      const tx = col.align === 'center' ? x + col.width / 2 : col.align === 'left' ? x + 12 : x + col.width - 12;
      ctx.fillText(col.label, tx, tableTop + 21);
      x += col.width;
    }

    // Table rows
    const bodyTop = tableTop + thH;
    leaderboard.forEach((entry: any, i: number) => {
      const y = bodyTop + i * rowH;

      // Alternating row bg
      if (i % 2 === 1) {
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(padX, y, tableW, rowH);
      }

      // Row bottom border
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(padX, y + rowH - 1, tableW, 1);

      const textY = y + 23;
      let cx = padX;

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

      // Last round points (if applicable)
      if (lastRound) {
        ctx.font = font;
        ctx.fillStyle = '#666666';
        ctx.fillText(entry.lastRoundPoints > 0 ? `+${entry.lastRoundPoints}` : '0', cx + 35, textY);
        cx += 70;
      }

      // Correct
      ctx.font = font;
      ctx.fillStyle = '#000000';
      ctx.fillText(String(entry.correct), cx + 40, textY);
      cx += 80;

      // Picks
      ctx.fillText(String(entry.picks), cx + 35, textY);
      cx += 70;

      // Accuracy
      ctx.fillStyle = '#666666';
      const acc = entry.picks > 0 ? `${Math.round((entry.correct / entry.picks) * 100)}%` : '—';
      ctx.fillText(acc, cx + 35, textY);
    });

    // Footer
    ctx.fillStyle = '#666666';
    ctx.font = fontSmall;
    ctx.textAlign = 'left';
    ctx.fillText('Scoring: 1 correct = 1pt · 2 correct = 3pts · 3 correct = 6pts', padX, canvasH - 14);

    // Download
    const link = document.createElement('a');
    link.download = `w2w-standings-${leagueName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setGenerating(false);
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Leaderboard</h1>
          <p>{leagueName || 'Select a league to view standings'}{selectedRound ? ` — after Round ${selectedRound}` : ''}</p>
        </div>
        <div className="leaderboard-filters">
          <select value={selectedRound} onChange={e => setSelectedRound(e.target.value)}>
            <option value="">All Rounds</option>
            {completedRaces.map((r) => (
              <option key={r.round} value={r.round}>After R{r.round} — {r.name}</option>
            ))}
          </select>
          <select value={selectedLeague} onChange={e => { setSelectedLeague(e.target.value); setSelectedRound(''); }}>
            <option value="">Select a league...</option>
            {leagues.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          {leaderboard.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={downloadPng} disabled={generating}>
              {generating ? 'Generating...' : 'Download PNG'}
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
                {lastRound && <th>R{lastRound.round}</th>}
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
                  {lastRound && (
                    <td className="text-gray">
                      {entry.lastRoundPoints > 0 ? `+${entry.lastRoundPoints}` : '0'}
                    </td>
                  )}
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

export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardContent />
    </Suspense>
  );
}
