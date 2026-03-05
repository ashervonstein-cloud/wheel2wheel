# Wheel2Wheel 🏁

An F1 fantasy picks game. Pick the winner from 3 driver head-to-head matchups each race week.
Score points, compete in leagues, win the championship.

---

## What's Built

| Feature | Status |
|---|---|
| Player signup & login | ✅ |
| Create teams | ✅ |
| Create leagues (public or private) | ✅ |
| Join leagues via invite link | ✅ |
| Admin: create race matchups | ✅ |
| Admin: open/close submissions | ✅ |
| Admin: enter results & auto-score | ✅ |
| Weekly picks UI | ✅ |
| Leaderboard | ✅ |
| Double points weeks | ✅ |
| Sprint race support | ✅ |

---

## How to Set Up (Step by Step)

### Step 1 — Install the tools you need

You'll need two programs installed on your computer:

1. **Node.js** (runs JavaScript) → https://nodejs.org — download the "LTS" version
2. **PostgreSQL** (the database) → https://www.postgresql.org/download/

> Alternatively, use a hosted database like [Neon](https://neon.tech) (free tier available) — 
> they give you a connection string without installing anything locally.

### Step 2 — Download and open this project

If you received this as a zip file, unzip it. Then open your terminal (Mac: search "Terminal", 
Windows: search "Command Prompt") and navigate to the project folder:

```bash
cd path/to/wheel2wheel
```

### Step 3 — Install project dependencies

```bash
npm install
```

This downloads all the libraries the project needs. It may take a minute.

### Step 4 — Set up your environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in:

```
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/wheel2wheel"
NEXTAUTH_SECRET="any-long-random-string-here"
NEXTAUTH_URL="http://localhost:3000"
```

For `NEXTAUTH_SECRET`, just type any random string of letters and numbers (20+ characters).

### Step 5 — Create the database

If using local PostgreSQL, first create the database:
```bash
psql -U postgres -c "CREATE DATABASE wheel2wheel;"
```

Then run this to create all the tables:
```bash
npm run db:push
```

### Step 6 — Add sample data (optional but recommended for testing)

```bash
npm run db:seed
```

This creates:
- Admin account: `admin@wheel2wheel.com` / `admin123`
- Player account: `player@example.com` / `player123`
- A sample race open for picks

### Step 7 — Start the app

```bash
npm run dev
```

Open your browser and go to: **http://localhost:3000**

---

## How the Game Works (for admins)

### Each race week:

1. **Create the race** → Go to Admin → Create Race
   - Fill in the race name, dates, and the 3 driver matchups
   - Check "Double Points Week" to add a 4th bonus matchup

2. **Open submissions** → Admin → All Races → "Open for Picks"
   - Players can now make their selections

3. **Close submissions** → When qualifying starts → "Close Submissions"
   - No more picks accepted

4. **Enter results** → After the race → "Enter Results"
   - Click which driver won each matchup
   - Hit "Process Results" — points are automatically calculated and awarded

### Scoring:
- 1 correct pick = 1 point
- 2 correct picks = 3 points  
- 3 correct picks = 6 points
- All correct on a double points week = doubled!

---

## Project Structure (for reference)

```
wheel2wheel/
├── prisma/
│   ├── schema.prisma     ← Database structure (tables and relationships)
│   └── seed.js           ← Sample data for testing
├── src/
│   ├── app/
│   │   ├── api/          ← All backend API routes
│   │   │   ├── auth/     ← Signup, login
│   │   │   ├── teams/    ← Create/list teams
│   │   │   ├── leagues/  ← Create/join/list leagues
│   │   │   ├── matchups/ ← Get current race matchups
│   │   │   ├── picks/    ← Submit and retrieve picks
│   │   │   └── admin/    ← Admin race management and results
│   │   ├── dashboard/    ← Player dashboard page
│   │   ├── picks/        ← Weekly picks page
│   │   ├── leaderboard/  ← Standings page
│   │   ├── admin/        ← Admin panel page
│   │   ├── login/        ← Login page
│   │   └── signup/       ← Signup page
│   ├── components/
│   │   └── Nav.tsx       ← Navigation bar
│   └── lib/
│       ├── prisma.ts     ← Database connection
│       ├── auth.ts       ← Login/session configuration
│       └── scoring.ts    ← Points calculation logic
├── .env.example          ← Copy this to .env and fill in your values
└── package.json          ← Project dependencies
```

---

## Common Issues

**"Cannot connect to database"**  
→ Make sure PostgreSQL is running and your `DATABASE_URL` in `.env` is correct.

**"Invalid invite code" when joining a league**  
→ Invite codes are case-sensitive. Make sure you're copying the full code.

**I forgot the admin password**  
→ Run `npm run db:seed` again — it will reset the seed accounts.

**The app shows "No race open for picks"**  
→ An admin needs to create a race and click "Open for Picks".

---

## What's Not Built Yet

- Email notifications (framework is in place, needs SMTP credentials)
- Payments / pricing
- Localization / multiple languages
- Automatic race schedule import from F1 API
- Mobile app
