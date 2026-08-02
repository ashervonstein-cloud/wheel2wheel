// src/lib/scoring.ts
// All scoring logic lives here so it's easy to change

/** How many Boosts a team gets per season. */
export const BOOSTS_PER_SEASON = 2;

/** What a Boost multiplies the race score by. */
export const BOOST_MULTIPLIER = 2;

/**
 * One sentence of scoring rules, used everywhere the rules are stated so the
 * landing page, the picks page and the leaderboard can't drift apart.
 */
export const SCORING_RULES = '1 correct = 1pt · 2 correct = 3pts · 3 correct = 6pts';
export const BOOST_RULE =
  `Boost any race to double what you score there — ${BOOSTS_PER_SEASON} per season.`;

/**
 * Apply a team's Boost to the points they scored in a race.
 *
 * A Boost cannot be spent on an admin Double Points week (see canBoostRace), so
 * this never compounds with that multiplier in practice; the guard here is just
 * belt and braces if data ever gets in by another route.
 */
export function applyBoost(
  points: number,
  boosted: boolean,
  isDoublePointsRace: boolean = false,
): number {
  if (!boosted || isDoublePointsRace) return points;
  return points * BOOST_MULTIPLIER;
}

/**
 * Whether a race is eligible to be Boosted at all. Both the API and the UI
 * read this, so the button and the server can never disagree.
 */
export function canBoostRace(race: { status: string; isDoublePoints: boolean }): {
  ok: boolean;
  reason?: string;
} {
  if (race.isDoublePoints) {
    return { ok: false, reason: 'This is already a double points week.' };
  }
  if (race.status !== 'OPEN') {
    return { ok: false, reason: 'Selections have closed for this race.' };
  }
  return { ok: true };
}

/**
 * Calculate points for a set of correct guesses
 * 1 correct = 1 point
 * 2 correct = 3 points
 * 3 correct = 6 points
 * 
 * For double points weeks, the bonus question doubles the total.
 */
export function calculatePoints(
  correctCount: number,
  totalMatchups: number,
  isDoublePoints: boolean = false
): number {
  const pointsTable: Record<number, number> = {
    0: 0,
    1: 1,
    2: 3,
    3: 6,
  };

  // For 4-question double points weeks, scale the table
  let points = pointsTable[Math.min(correctCount, 3)] ?? 6;

  // If they got the bonus question right too (4th question), double total
  if (isDoublePoints && correctCount === totalMatchups && totalMatchups === 4) {
    points = points * 2;
  }

  return points;
}

/**
 * Given a list of picks and the correct winners, 
 * return how many the team got right
 */
export function gradepicks(
  picks: Array<{ matchupId: string; selection: string }>,
  winners: Array<{ matchupId: string; winnerId: string }>
): { correct: number; total: number } {
  const winnerMap = new Map(winners.map((w) => [w.matchupId, w.winnerId]));
  let correct = 0;

  for (const pick of picks) {
    const winner = winnerMap.get(pick.matchupId);
    if (winner && winner === pick.selection) {
      correct++;
    }
  }

  return { correct, total: picks.length };
}
