// src/lib/scoring.ts
// All scoring logic lives here so it's easy to change

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
