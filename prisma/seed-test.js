// prisma/seed-test.js
// Populates a THROWAWAY database with a full season-in-progress so every
// player-facing state can be looked at. Never point this at live.
//
//   node prisma/seed-test.js                     # current race OPEN, closes in 2d
//   node prisma/seed-test.js --closes=3h         # OPEN and inside the urgent window
//   node prisma/seed-test.js --state=closed      # picks locked, results not in
//   node prisma/seed-test.js --state=completed   # the reveal, with your scoreline
//
// Every row it writes is prefixed `t-`, so `--wipe` can remove exactly what it
// made and nothing else.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SEASON = 2026; // must match CURRENT_SEASON in the API routes
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').pop();
const has = k => process.argv.includes(`--${k}`);

const STATE = arg('state', 'open');
const CLOSES = arg('closes', '2d');

function offsetMs(s) {
  const m = /^(\d+)([dhm])$/.exec(s);
  if (!m) throw new Error(`--closes must look like 2d, 3h or 45m (got "${s}")`);
  return +m[1] * { d: 86400e3, h: 3600e3, m: 60e3 }[m[2]];
}

// Mirrors src/lib/scoring.ts
function points(correct, total, isDouble) {
  const p = { 0: 0, 1: 1, 2: 3, 3: 6 }[Math.min(correct, 3)] ?? 6;
  return isDouble && correct === total && total === 4 ? p * 2 : p;
}

function guard() {
  const url = process.env.DATABASE_URL || '';
  if (!url) throw new Error('DATABASE_URL is not set.');
  const host = url.replace(/\/\/[^@]*@/, '//***@');
  if (!process.env.ALLOW_TEST_SEED) {
    console.error(
      `\nRefusing to write test data.\n\n  Target: ${host}\n\n` +
      `If that is genuinely a throwaway database, re-run with ALLOW_TEST_SEED=1.\n`
    );
    process.exit(1);
  }
  console.log(`Target: ${host}\n`);
}

const YOU = 'you@test.local';
const RIVALS = [
  ['Lena Ortiz', 'lena@test.local', 'Box Box Box'],
  ['Sam Okafor', 'sam@test.local', 'Undercut Kings'],
  ['Priya Raman', 'priya@test.local', 'Full Send'],
  ['Tom Vasseur', 'tom@test.local', 'Track Limits'],
  ['Nia Brooks', 'nia@test.local', 'DRS Enjoyers'],
];

// Round, name, country, circuit, double-points, and how many YOU got right.
// Rounds 1-4 are history; round 5 is the one the picks page will show.
const RACES = [
  { round: 1, name: 'Bahrain Grand Prix',   country: 'Bahrain',   circuit: 'Bahrain International Circuit', dbl: false, yours: 2 },
  { round: 2, name: 'Saudi Arabian Grand Prix', country: 'Saudi Arabia', circuit: 'Jeddah Corniche Circuit', dbl: true,  yours: 4 },
  { round: 3, name: 'Australian Grand Prix', country: 'Australia', circuit: 'Albert Park',                   dbl: false, yours: 0 },
  { round: 4, name: 'Japanese Grand Prix',  country: 'Japan',     circuit: 'Suzuka',                         dbl: false, yours: 3 },
  { round: 5, name: 'Chinese Grand Prix',   country: 'China',     circuit: 'Shanghai International Circuit', dbl: false, yours: 1 },
];

const PAIRS = [
  ['Red Bull Driver Battle', 'Max Verstappen', 'Isack Hadjar'],
  ['McLaren Driver Battle',  'Lando Norris',   'Oscar Piastri'],
  ['Ferrari Driver Battle',  'Charles Leclerc', 'Lewis Hamilton'],
  ['Bonus: Points Finish',   'Alex Albon',     'Pierre Gasly'],  // only on double weeks
];

async function wipe() {
  // Order matters: children before parents.
  await prisma.pick.deleteMany({ where: { matchupId: { startsWith: 't-' } } });
  await prisma.raceResult.deleteMany({ where: { raceId: { startsWith: 't-' } } });
  await prisma.matchup.deleteMany({ where: { id: { startsWith: 't-' } } });
  await prisma.race.deleteMany({ where: { id: { startsWith: 't-' } } });
  await prisma.leagueTeam.deleteMany({ where: { teamId: { startsWith: 't-' } } });
  await prisma.team.deleteMany({ where: { id: { startsWith: 't-' } } });
  await prisma.league.deleteMany({ where: { id: { startsWith: 't-' } } });
  await prisma.player.deleteMany({ where: { email: { endsWith: '@test.local' } } });
  console.log('Removed all t- prefixed test data.');
}

async function main() {
  guard();

  if (has('wipe')) { await wipe(); return; }
  if (!['open', 'closed', 'completed'].includes(STATE)) {
    throw new Error(`--state must be open, closed or completed (got "${STATE}")`);
  }
  await wipe(); // idempotent re-seed

  const now = Date.now();

  // ── People and teams ──────────────────────────────────────────────
  const you = await prisma.player.create({
    data: { name: 'You', email: YOU, isAdmin: true },
  });
  const yourTeam = await prisma.team.create({
    data: { id: 't-team-you', name: 'Wet Weather Specialists', season: SEASON, playerId: you.id },
  });

  const rivals = [];
  for (const [i, [name, email, teamName]] of RIVALS.entries()) {
    const p = await prisma.player.create({ data: { name, email } });
    const t = await prisma.team.create({
      data: { id: `t-team-${i}`, name: teamName, season: SEASON, playerId: p.id },
    });
    rivals.push(t);
  }

  const league = await prisma.league.create({
    data: {
      id: 't-league-1', name: 'The Paddock', isPublic: false,
      season: SEASON, inviteCode: 'TESTLEAGUE',
    },
  });
  for (const t of [yourTeam, ...rivals]) {
    await prisma.leagueTeam.create({ data: { teamId: t.id, leagueId: league.id } });
  }

  // ── Races ─────────────────────────────────────────────────────────
  for (const r of RACES) {
    const isCurrent = r.round === 5;
    const status = isCurrent ? STATE.toUpperCase() : 'COMPLETED';
    const graded = status === 'COMPLETED';

    // Historic rounds sit in the past; the current one closes relative to now.
    const closeAt = isCurrent
      ? new Date(now + offsetMs(CLOSES))
      : new Date(now - (6 - r.round) * 7 * 86400e3);

    const race = await prisma.race.create({
      data: {
        id: `t-race-${r.round}`,
        name: r.name, round: r.round, season: SEASON,
        country: r.country, circuit: r.circuit,
        selectionsOpenAt: new Date(closeAt.getTime() - 3 * 86400e3),
        selectionsCloseAt: closeAt,
        raceDate: new Date(closeAt.getTime() + 2 * 86400e3),
        hasSprint: r.round === 2,
        isDoublePoints: r.dbl,
        status,
      },
    });

    const pairs = r.dbl ? PAIRS : PAIRS.slice(0, 3);
    const matchups = [];
    for (const [i, [title, d1, d2]] of pairs.entries()) {
      matchups.push(await prisma.matchup.create({
        data: {
          id: `t-m-${r.round}-${i + 1}`,
          raceId: race.id, title, order: i + 1,
          isBonus: i === 3,
          driver1Name: d1, driver2Name: d2,
          // driver1 always wins, so "yours" below is easy to reason about
          winnerId: graded ? 'driver1' : null,
        },
      }));
    }

    // Your picks: the first `yours` matchups are right, the rest wrong.
    // On an OPEN race, leave them empty so the grid starts blank.
    if (status !== 'OPEN') {
      for (const [i, m] of matchups.entries()) {
        const right = i < r.yours;
        await prisma.pick.create({
          data: {
            teamId: yourTeam.id, matchupId: m.id,
            selection: right ? 'driver1' : 'driver2',
            isCorrect: graded ? right : null,
          },
        });
      }
      if (graded) {
        await prisma.raceResult.create({
          data: {
            teamId: yourTeam.id, raceId: race.id, season: SEASON,
            points: points(r.yours, matchups.length, r.dbl),
            correct: r.yours, total: matchups.length,
          },
        });
      }
    }

    // Rivals pick unevenly so the distribution bars aren't all 50/50, and one
    // of them sits out entirely so the leaderboard's "—" case is covered.
    for (const [ri, t] of rivals.entries()) {
      if (ri === RIVALS.length - 1) continue; // Nia never plays
      if (status === 'OPEN') continue;
      let correct = 0;
      for (const [i, m] of matchups.entries()) {
        const right = (ri + i) % 3 !== 0;
        if (right) correct++;
        await prisma.pick.create({
          data: {
            teamId: t.id, matchupId: m.id,
            selection: right ? 'driver1' : 'driver2',
            isCorrect: graded ? right : null,
          },
        });
      }
      if (graded) {
        await prisma.raceResult.create({
          data: {
            teamId: t.id, raceId: race.id, season: SEASON,
            points: points(correct, matchups.length, r.dbl),
            correct, total: matchups.length,
          },
        });
      }
    }
  }

  const board = await prisma.raceResult.groupBy({
    by: ['teamId'], where: { season: SEASON }, _sum: { points: true },
  });
  const mine = board.find(b => b.teamId === yourTeam.id)?._sum.points ?? 0;
  const rank = board.filter(b => (b._sum.points ?? 0) > mine).length + 1;

  console.log(`Seeded season ${SEASON} — 5 rounds, 6 teams, 1 league (invite code TESTLEAGUE).`);
  console.log(`Round 5 "${RACES[4].name}" is ${STATE.toUpperCase()}${STATE === 'open' ? `, closing in ${CLOSES}` : ''}.`);
  console.log(`You are "${yourTeam.name}" — ${mine} pts, rank ${rank} of ${board.length}.`);
  console.log(`\nLog in as ${YOU} (admin). The OTP prints in the dev-server terminal.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
