'use client';
// src/app/picks/page.tsx
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BOOSTS_PER_SEASON, SCORING_RULES, canBoostRace } from '@/lib/scoring';

type Tone = 'success' | 'error';
type Message = { text: string; tone: Tone } | null;

/** Human copy for the raw strings the API hands back. */
const API_COPY: Record<string, string> = {
  'teamId and picks are required': 'Something went wrong saving those picks. Reload the page and try again.',
  'teamId and raceId are required': 'Something went wrong loading this race. Reload the page and try again.',
  'Not logged in': 'Your session expired. Log in again to save your picks.',
  'Team not found': "That team isn't yours any more. Pick a different one.",
  'Selections are closed for this race': 'Selections closed before this saved. Your earlier picks still stand.',
};
const humanize = (raw?: string) =>
  (raw && API_COPY[raw]) || raw || 'Something went wrong. Try again in a moment.';

/** Live countdown to the selections deadline. */
function Countdown({ closeAt }: { closeAt: string }) {
  const target = new Date(closeAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  // Start ticking after mount so the server and client agree on first paint.
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const closesAtLabel = new Date(closeAt)
    .toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    .toUpperCase();

  if (now === null) {
    return (
      <div className="countdown">
        <span className="countdown-label">Locks in</span>
        <span className="countdown-value">--:--</span>
        <span className="countdown-at">Closes {closesAtLabel}</span>
      </div>
    );
  }

  const ms = target - now;

  if (ms <= 0) {
    return (
      <div className="countdown is-closed" role="status">
        <span className="countdown-label">Locked</span>
        <span className="countdown-value">Selections closed</span>
        <span className="countdown-at">Closed {closesAtLabel}</span>
      </div>
    );
  }

  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  // Under six hours the deadline stops being information and starts being pressure.
  const urgent = ms < 6 * 60 * 60 * 1000;
  const value = d > 0 ? `${d}D ${pad(h)}H ${pad(m)}M` : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <div className={`countdown${urgent ? ' is-urgent' : ''}`}>
      <span className="countdown-label">Locks in</span>
      <span className="countdown-value">{value}</span>
      <span className="countdown-at">Closes {closesAtLabel}</span>
    </div>
  );
}

export default function PicksPage() {
  const { status } = useSession();
  const router = useRouter();
  const [race, setRace] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [existingPicks, setExistingPicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [animated, setAnimated] = useState(false);

  // History accordion state
  const [boost, setBoost] = useState<any>(null);
  const [boostBusy, setBoostBusy] = useState(false);
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
    if (selectedTeam) { fetchHistory(); fetchBoosts(); }
  }, [selectedTeam, race?.id]);

  // Trigger fill animation for current race visualizer
  useEffect(() => {
    if (race?.status === 'CLOSED' || race?.status === 'COMPLETED') {
      const t = setTimeout(() => setAnimated(true), 80);
      return () => clearTimeout(t);
    }
  }, [race?.status]);

  const fetchData = async () => {
    try {
      const [raceRes, teamsRes] = await Promise.all([
        fetch('/api/matchups'),
        fetch('/api/teams'),
      ]);
      if (!raceRes.ok || !teamsRes.ok) throw new Error('request failed');
      const raceData = await raceRes.json();
      const teamsData = await teamsRes.json();
      setRace(raceData.race ?? null);
      setTeams(Array.isArray(teamsData) ? teamsData : []);
      if (Array.isArray(teamsData) && teamsData.length > 0) setSelectedTeam(teamsData[0].id);
      setLoadError('');
    } catch {
      setLoadError("Couldn't load this week's matchups. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingPicks = async () => {
    if (!race) return;
    try {
      const res = await fetch(`/api/picks?teamId=${selectedTeam}&raceId=${race.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data)) return;
      setExistingPicks(data);
      const pickMap: Record<string, string> = {};
      data.forEach((p: any) => { pickMap[p.matchupId] = p.selection; });
      setPicks(pickMap);
    } catch {
      /* leaving the grid empty is the correct fallback; submitting still works */
    }
  };

  const fetchHistory = async () => {
    if (!selectedTeam) return;
    try {
      // No excludeRaceId: the race showing above is exactly the one whose
      // score the player came here for, and its RaceResult lives in here.
      const res = await fetch(`/api/picks/history?teamId=${selectedTeam}`);
      if (res.ok) setHistory(await res.json());
    } catch {
      setHistory([]);
    }
  };

  const fetchBoosts = async () => {
    if (!selectedTeam) return;
    try {
      const res = await fetch(`/api/boosts?teamId=${selectedTeam}`);
      if (res.ok) setBoost(await res.json());
    } catch {
      setBoost(null); // the panel hides rather than guessing at a count
    }
  };

  const toggleBoost = async (active: boolean) => {
    if (!race || boostBusy) return;
    setBoostBusy(true);
    try {
      const res = await fetch('/api/boosts', {
        method: active ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selectedTeam, raceId: race.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBoost(data);
        setMessage({
          text: active
            ? 'Boost removed. You can use it on another race.'
            : `Boost active — everything you score at ${race.name} counts double.`,
          tone: 'success',
        });
      } else {
        setMessage({ text: humanize(data.error), tone: 'error' });
      }
    } catch {
      setMessage({ text: "Couldn't reach the server. Try again.", tone: 'error' });
    } finally {
      setBoostBusy(false);
    }
  };

  const selectDriver = (matchupId: string, selection: 'driver1' | 'driver2') => {
    setPicks(prev => ({ ...prev, [matchupId]: selection }));
    setMessage(null); // a saved-confirmation must not survive an unsaved edit
  };

  const submitPicks = async () => {
    if (submitting) return;
    if (!selectedTeam) {
      setMessage({ text: 'Create a team before you make picks.', tone: 'error' });
      return;
    }
    const matchups = race?.matchups ?? [];
    if (Object.keys(picks).length < matchups.length) {
      const remaining = matchups.length - Object.keys(picks).length;
      setMessage({
        text: `Pick a driver in ${remaining} more matchup${remaining === 1 ? '' : 'es'} before submitting.`,
        tone: 'error',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: selectedTeam,
          picks: Object.entries(picks).map(([matchupId, selection]) => ({ matchupId, selection })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ text: 'Picks saved. You can change them until selections close.', tone: 'success' });
        setExistingPicks(Object.entries(picks).map(([matchupId, selection]) => ({ matchupId, selection })));
      } else {
        setMessage({ text: humanize(data.error), tone: 'error' });
      }
    } catch {
      setMessage({ text: "Couldn't reach the server. Your picks aren't saved — try again.", tone: 'error' });
    } finally {
      setSubmitting(false);
    }
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

  if (loadError) {
    return (
      <div className="card">
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <span className="alert-label">Error</span>{loadError}
        </div>
        <button className="btn btn-outline" onClick={() => { setLoading(true); fetchData(); }}>
          Try again
        </button>
      </div>
    );
  }

  const isOpen = race?.status === 'OPEN';
  const isClosed = race?.status === 'CLOSED';
  const isCompleted = race?.status === 'COMPLETED';
  const showVisualizer = isClosed || isCompleted;
  const hasTeam = teams.length > 0;

  // The current race's own scoreline, straight from the server's RaceResult.
  const myBoostHere = !!(race && boost?.boosts?.some((b: any) => b.raceId === race.id));
  const boostEligible = race ? canBoostRace(race) : { ok: false as boolean, reason: undefined };
  const boostsLeft = boost?.remaining ?? 0;

  const currentEntry = race ? history.find((h: any) => h.id === race.id) : null;
  const currentResult = currentEntry?.result ?? null;
  const pastRaces = history.filter((h: any) => h.id !== race?.id);

  const renderVisualizer = (
    matchup: any,
    pickSelection: string | undefined | null,
    isCompletedCtx: boolean,
    isAnimated: boolean
  ) => {
    const winner = matchup.winnerId;
    const counts = matchup.pickCounts;
    const d1Pct = counts?.driver1Pct ?? 50;
    const d2Pct = counts?.driver2Pct ?? 50;
    const graded = isCompletedCtx && (winner === 'driver1' || winner === 'driver2');

    const side = (driverId: 'driver1' | 'driver2', name: string, pct: number, fillClass: string) => {
      const isPicked = pickSelection === driverId;
      const won = graded && winner === driverId;
      const lost = graded && winner !== driverId;

      // Verdict on your own pick, in words — not a colour and not an emoji.
      let tagClass = 'driver-viz-tag';
      let tagText = 'Your pick';
      if (isPicked && graded) {
        tagClass += won ? ' correct' : ' incorrect';
        tagText = won ? 'Correct' : 'Missed';
      }

      return (
        <div className={`driver-viz${isPicked ? ' driver-viz-picked' : ''}`}>
          <div
            className={`driver-viz-fill ${fillClass}`}
            style={{ transform: `scaleX(${isAnimated ? pct / 100 : 0})` }}
          />
          <div className="driver-viz-content">
            <span className={tagClass} style={{ visibility: isPicked ? 'visible' : 'hidden' }}>
              {tagText}
            </span>
            <span className={`driver-viz-name${won ? ' won' : lost ? ' lost' : ''}`}>
              {name}
              {won && <span className="sr-only"> — won this matchup</span>}
              {lost && <span className="sr-only"> — lost this matchup</span>}
            </span>
            <span className="driver-viz-pct">
              {pct}%<span className="sr-only"> of players picked {name}</span>
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="matchup-drivers">
        {side('driver1', matchup.driver1Name, d1Pct, 'driver-viz-fill-left')}
        <span className="vs-divider" aria-hidden="true">VS</span>
        {side('driver2', matchup.driver2Name, d2Pct, 'driver-viz-fill-right')}
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
        {teams.length > 1 && (
          <div>
            <label htmlFor="picks-team" className="text-sm text-gray" style={{ display: 'block', marginBottom: 4 }}>
              {isOpen ? 'Picking for team:' : 'Viewing as team:'}
            </label>
            <select
              id="picks-team"
              value={selectedTeam}
              onChange={e => { setSelectedTeam(e.target.value); setMessage(null); }}
              style={{ width: 'auto' }}
            >
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── No team yet: the first thing a new player hits ── */}
      {!hasTeam && (
        <div className="card">
          <h2>Create a team to start picking</h2>
          <p className="text-gray text-sm" style={{ marginBottom: 16 }}>
            Your team is your entry in the game — it holds your picks and your points,
            and it&apos;s what appears on the leaderboard. You only need one.
          </p>
          <Link href="/dashboard" className="btn btn-primary">Create my team</Link>
        </div>
      )}

      {/* ── No race state ── */}
      {hasTeam && !race && (
        <div className="card">
          <p style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            No race open for picks right now
          </p>
          <p className="text-gray text-sm">
            Matchups go up as soon as the next race week opens. Check back then.
          </p>
        </div>
      )}

      {/* ── Current race ── */}
      {hasTeam && race && (
        <>
          {/* The reveal. This is what the player came for. */}
          {isCompleted && (
            <div className={`scoreboard${currentResult ? '' : ' is-empty'}`}>
              <div className="scoreboard-head">
                <span>Your result · Round {race.round}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {myBoostHere && <span className="badge badge-red">Boosted</span>}
                  {race.isDoublePoints && <span className="badge badge-solid">2× Week</span>}
                </span>
              </div>
              {currentResult ? (
                <>
                  <div className="scoreboard-body">
                    <div className="scoreboard-cell">
                      <div className="scoreboard-value">
                        {currentResult.correct}<span style={{ color: 'var(--gray)' }}>/{currentResult.total}</span>
                      </div>
                      <span className="scoreboard-caption">Correct</span>
                    </div>
                    <div className="scoreboard-cell is-points">
                      <div className="scoreboard-value">{currentResult.points}</div>
                      <span className="scoreboard-caption">
                        {currentResult.points === 1 ? 'Point' : 'Points'} scored
                      </span>
                    </div>
                  </div>
                  <p className="scoreboard-note">
                    {currentResult.correct === currentResult.total
                      ? <>Clean sweep — <strong>every matchup called right</strong>.</>
                      : currentResult.correct === 0
                        ? <>Nothing landed this week. <strong>Next round resets it.</strong></>
                        : <>You called <strong>{currentResult.correct} of {currentResult.total}</strong> right.</>}
                    {race.isDoublePoints && currentResult.correct === currentResult.total && ' Doubled for the bonus week.'}
                    {myBoostHere && currentResult.points > 0 && <> Your Boost doubled it.</>}
                  </p>
                </>
              ) : (
                <div className="scoreboard-body">
                  <div className="scoreboard-cell">
                    <div className="scoreboard-value">No picks in</div>
                    <span className="scoreboard-caption">You sat this round out</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* The deadline. It was collected, stored, and never shown. */}
          {isOpen && race.selectionsCloseAt && (
            <div style={{ marginBottom: 16 }}>
              <Countdown closeAt={race.selectionsCloseAt} />
            </div>
          )}

          {/* Boost. Secret while selections are open, public once locked. */}
          {isOpen && boost && (
            <div className={`boost${myBoostHere ? ' is-active' : ''}`}>
              <div className="boost-head">
                <span>{myBoostHere ? 'Boost active' : 'Boost'}</span>
                <span className="boost-count">
                  {boostsLeft} of {BOOSTS_PER_SEASON} left
                </span>
              </div>
              <div className="boost-body">
                <p className="boost-copy">
                  {myBoostHere ? (
                    <>Every point you score at <strong>{race.name}</strong> counts double.
                       Nobody else sees this until selections close.</>
                  ) : !boostEligible.ok ? (
                    boostEligible.reason
                  ) : boostsLeft === 0 ? (
                    <>You&apos;ve used both Boosts this season. They reset next season.</>
                  ) : (
                    <>Double everything you score at <strong>{race.name}</strong>.
                       Hidden from everyone until selections close, and you can take it
                       back any time before then.</>
                  )}
                </p>
                {boostEligible.ok && (boostsLeft > 0 || myBoostHere) && (
                  <button
                    className={`btn ${myBoostHere ? 'btn-outline' : 'btn-primary'}`}
                    onClick={() => toggleBoost(myBoostHere)}
                    disabled={boostBusy}
                  >
                    {boostBusy ? 'Saving...' : myBoostHere ? 'Remove Boost' : 'Use a Boost'}
                  </button>
                )}
              </div>
            </div>
          )}

          {showVisualizer && race.boostedBy && (
            <div className="alert" style={{ marginBottom: 24 }}>
              <span className="alert-label">Boosts</span>
              {race.boostedBy.length === 0
                ? 'Nobody boosted this race.'
                : `${race.boostedBy.map((b: any) => b.teamName).join(', ')} ` +
                  `${race.boostedBy.length === 1 ? 'doubled' : 'each doubled'} their score here.`}
            </div>
          )}

          {isClosed && (
            <div className="alert" style={{ marginBottom: 24 }}>
              <span className="alert-label">Locked</span>
              Picks are in and results aren&apos;t official yet. Here&apos;s how everyone called it.
            </div>
          )}

          {isOpen && (
            <div className="alert alert-info" style={{ marginBottom: 24 }}>
              <span className="alert-label">Scoring</span>
              {SCORING_RULES}
              {race.isDoublePoints && ' · all correct on a 2× week = doubled'}
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
                <div className="matchup-title" id={`m-${matchup.id}`}>
                  {matchup.isBonus && '[BONUS] '}{matchup.title}
                </div>
                <div className="matchup-drivers" role="group" aria-labelledby={`m-${matchup.id}`}>
                  <button
                    className={`driver-option${pick === 'driver1' ? ' selected' : ''}`}
                    aria-pressed={pick === 'driver1'}
                    onClick={() => selectDriver(matchup.id, 'driver1')}
                  >
                    {matchup.driver1Name}
                  </button>
                  <span className="vs-divider" aria-hidden="true">VS</span>
                  <button
                    className={`driver-option${pick === 'driver2' ? ' selected' : ''}`}
                    aria-pressed={pick === 'driver2'}
                    onClick={() => selectDriver(matchup.id, 'driver2')}
                  >
                    {matchup.driver2Name}
                  </button>
                </div>
              </div>
            );
          })}

          {isOpen && (
            <div className="submit-bar">
              <div style={{ width: '100%' }}>
                {/* The confirmation belongs where the thumb already is, not
                    three scrolled cards above it. */}
                {message && (
                  <div className={`alert alert-${message.tone}`} role="status">
                    <span className="alert-label">{message.tone === 'error' ? 'Not saved' : 'Saved'}</span>
                    {message.text}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={submitPicks} disabled={submitting}>
                    {submitting ? 'Saving...' : existingPicks.length > 0 ? 'Update Picks' : 'Submit Picks'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Previous picks accordion ── */}
      {pastRaces.length > 0 && (
        <div className="history-section">
          <h2 className="history-section-title">Previous Picks</h2>
          {pastRaces.map((pastRace: any) => {
            const isExpanded = expandedRaces.has(pastRace.id);
            const isAnim = animatedRaces.has(pastRace.id);
            const result = pastRace.result;

            return (
              <div key={pastRace.id} className="accordion-race">
                <button
                  className="accordion-race-header"
                  onClick={() => toggleRace(pastRace.id)}
                  aria-expanded={isExpanded}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg
                      className="accordion-chevron"
                      viewBox="0 0 10 10"
                      width="9"
                      height="9"
                      aria-hidden="true"
                      style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                    >
                      <path d="M3 1L7 5L3 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    </svg>
                    <span className="accordion-race-round">RD {pastRace.round}</span>
                    <span className="accordion-race-name">{pastRace.name}</span>
                    {pastRace.isDoublePoints && (
                      <span className="badge badge-red" style={{ fontSize: '0.55rem' }}>2×</span>
                    )}
                    {pastRace.boosted && (
                      <span className="badge badge-red" style={{ fontSize: '0.55rem' }}>Boost</span>
                    )}
                  </div>
                  {result && (
                    <span className="accordion-race-score">
                      {result.correct}/{result.total} correct
                      <span className="pts"> · {result.points} pts</span>
                    </span>
                  )}
                </button>

                {isExpanded && (
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
