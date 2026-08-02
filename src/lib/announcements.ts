// src/lib/announcements.ts
// The running changelog shown at /announcements, newest first.
// To add an entry: put it at the top of the array. Nothing else to touch.

export type Announcement = {
  /** ISO date. Drives both the displayed date and the ordering. */
  date: string;
  title: string;
  /** One or two sentences. This is the whole story for a scanner. */
  summary: string;
  /** Optional detail bullets, shown under the summary. */
  points?: string[];
  /** Optional screenshot in /public. */
  image?: { src: string; alt: string; caption?: string };
  /** Optional deep link into the product. */
  cta?: { href: string; label: string };
  /** Marks the newest meaningful release. Only ever set one. */
  isLatest?: boolean;
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    date: '2026-08-01',
    title: 'Pick your own double points week',
    summary:
      'Boosts are here. You get two a season — spend one on any race and everything you score there counts double.',
    points: [
      'A clean sweep goes from 6 points to 12, worth more than three ordinary good weekends.',
      'Spend it any time while picks are open, and take it back right up until selections close.',
      'Nobody sees your Boost until picks lock. Then everybody does.',
      'Not available on official double points weeks — those are already doubled.',
      "Forget to submit picks? You keep the Boost. It's only spent on a race you actually played.",
    ],
    image: {
      src: '/media/boosts.png',
      alt: 'The Picks page showing an active Boost above the driver matchups',
      caption: 'The Boost sits under the deadline on the Picks page.',
    },
    cta: { href: '/picks', label: 'Use a Boost' },
    isLatest: true,
  },
  {
    date: '2026-07-31',
    title: 'You can finally see whether you were right',
    summary:
      'The results screen used to show who won each matchup and leave you to work out how you did. Now it tells you.',
    points: [
      'Every finished race opens with your score — how many you called right, and the points it earned.',
      'Each matchup says CORRECT or MISSED against your pick, instead of leaving you to line up a tick with a tag.',
      'A live countdown to the deadline on the Picks page, turning red in the last six hours.',
      'The Submit button now sits in reach of your thumb, with its confirmation next to it rather than off-screen.',
    ],
  },
  {
    date: '2026-07-31',
    title: 'A leaderboard you can read on a phone',
    summary:
      'The standings table used to need sideways scrolling on mobile, and never showed you where you were.',
    points: [
      'Your own row is highlighted and tagged, so "where am I?" is answered at a glance.',
      'On a phone the table becomes a card per team — no more dragging sideways.',
      'A dash instead of a zero for anyone who sat a round out, so missing a race no longer looks like scoring nothing.',
    ],
    cta: { href: '/leaderboard', label: 'View standings' },
  },
  {
    date: '2026-07-08',
    title: 'Shareable standings',
    summary:
      'Download the leaderboard as an image, sized for dropping straight into the group chat.',
    cta: { href: '/leaderboard', label: 'View standings' },
  },
];
