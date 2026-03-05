// prisma/seed.js
// Run with: npm run db:seed
// This creates sample data so you can test the app

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.player.upsert({
    where: { email: 'admin@wheel2wheel.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@wheel2wheel.com',
      password: adminPassword,
      isAdmin: true,
    },
  });

  // Create a sample player
  const playerPassword = await bcrypt.hash('player123', 10);
  const player = await prisma.player.upsert({
    where: { email: 'player@example.com' },
    update: {},
    create: {
      name: 'Max Fan',
      email: 'player@example.com',
      password: playerPassword,
    },
  });

  // Create a team for the sample player
  const team = await prisma.team.upsert({
    where: { id: 'seed-team-1' },
    update: {},
    create: {
      id: 'seed-team-1',
      name: 'Redbull Believers',
      season: 2025,
      playerId: player.id,
    },
  });

  // Create a public league
  const league = await prisma.league.upsert({
    where: { id: 'seed-league-1' },
    update: {},
    create: {
      id: 'seed-league-1',
      name: 'Global Championship',
      isPublic: true,
      season: 2025,
      inviteCode: 'GLOBAL2025',
    },
  });

  // Add team to league
  await prisma.leagueTeam.upsert({
    where: { teamId_leagueId: { teamId: team.id, leagueId: league.id } },
    update: {},
    create: { teamId: team.id, leagueId: league.id },
  });

  // Create an upcoming race
  const now = new Date();
  const race = await prisma.race.upsert({
    where: { id: 'seed-race-1' },
    update: {},
    create: {
      id: 'seed-race-1',
      name: 'Bahrain Grand Prix',
      round: 1,
      season: 2025,
      country: 'Bahrain',
      circuit: 'Bahrain International Circuit',
      selectionsOpenAt: new Date(now.getTime() - 1000 * 60 * 60 * 24), // yesterday
      selectionsCloseAt: new Date(now.getTime() + 1000 * 60 * 60 * 48), // 2 days from now
      raceDate: new Date(now.getTime() + 1000 * 60 * 60 * 72),
      hasSprint: false,
      isDoublePoints: false,
      status: 'OPEN',
    },
  });

  // Create 3 matchups for the race
  const matchups = [
    { order: 1, title: 'Red Bull Driver Battle', driver1Name: 'Max Verstappen', driver2Name: 'Sergio Perez' },
    { order: 2, title: 'McLaren Driver Battle', driver1Name: 'Lando Norris', driver2Name: 'Oscar Piastri' },
    { order: 3, title: 'Ferrari Driver Battle', driver1Name: 'Charles Leclerc', driver2Name: 'Carlos Sainz' },
  ];

  for (const m of matchups) {
    await prisma.matchup.upsert({
      where: { id: `seed-matchup-${m.order}` },
      update: {},
      create: {
        id: `seed-matchup-${m.order}`,
        raceId: race.id,
        ...m,
        isBonus: false,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log('   Admin login: admin@wheel2wheel.com / admin123');
  console.log('   Player login: player@example.com / player123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
