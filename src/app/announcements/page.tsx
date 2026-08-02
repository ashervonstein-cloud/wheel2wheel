// src/app/announcements/page.tsx
// Running changelog, newest first. Public: it should be shareable without
// an account, the way the landing page is.
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ANNOUNCEMENTS } from '@/lib/announcements';

export const metadata: Metadata = {
  title: "What's New",
  description: 'Every update to Wheel2Wheel, newest first.',
};

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function AnnouncementsPage() {
  const entries = [...ANNOUNCEMENTS].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="page-header">
        <h1>What&apos;s New</h1>
        <p>Every change to the game, newest first.</p>
      </div>

      <ol className="changelog">
        {entries.map((entry) => (
          <li key={entry.date + entry.title} className="entry">
            <div className="entry-meta">
              <time dateTime={entry.date}>{DATE.format(new Date(entry.date + 'T00:00:00Z'))}</time>
              {entry.isLatest && <span className="badge badge-red">New</span>}
            </div>

            <div className="entry-body">
              <h2 className="entry-title">{entry.title}</h2>
              <p className="entry-summary">{entry.summary}</p>

              {entry.points && (
                <ul className="entry-points">
                  {entry.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              )}

              {entry.image && (
                <figure className="entry-figure">
                  <Image
                    src={entry.image.src}
                    alt={entry.image.alt}
                    width={1200}
                    height={702}
                    sizes="(max-width: 768px) 100vw, 700px"
                  />
                  {entry.image.caption && <figcaption>{entry.image.caption}</figcaption>}
                </figure>
              )}

              {entry.cta && (
                <Link href={entry.cta.href} className="btn btn-outline btn-sm entry-cta">
                  {entry.cta.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="changelog-foot">
        Got an idea for the game? Tell whoever roped you into this league.
      </p>
    </div>
  );
}
