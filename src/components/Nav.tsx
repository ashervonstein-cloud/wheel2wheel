'use client';
// src/components/Nav.tsx
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function Nav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;

  return (
    <nav>
      <Link href="/" className="logo">W2W</Link>
      {session && (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/picks">Make Picks</Link>
          <Link href="/leaderboard">Leaderboard</Link>
              {isAdmin && <Link href="/admin" style={{ color: 'var(--red)' }}>Admin</Link>}
        </>
      )}
      <div className="spacer" />
      {session ? (
        <>
          <span className="user-name">{session.user?.name}</span>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => signOut()}
            style={{ borderColor: '#444', color: '#888' }}
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          <Link href="/login">Log In</Link>
          <Link href="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
        </>
      )}
    </nav>
  );
}
