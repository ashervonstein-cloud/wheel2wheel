'use client';
// src/components/Nav.tsx
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function Nav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <nav>
      <Link href="/" className="logo">W2W</Link>
      <div className="nav-desktop">
        {session && (
          <>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/picks">Picks</Link>
            <Link href="/leaderboard">Leaderboard</Link>
            {isAdmin && <Link href="/admin" style={{ color: 'var(--red)' }}>Admin</Link>}
          </>
        )}
      </div>
      <div className="spacer" />
      <div className="nav-desktop">
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
      </div>
      <button
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      {menuOpen && (
        <div className="nav-mobile-menu">
          {session ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/picks">Picks</Link>
              <Link href="/leaderboard">Leaderboard</Link>
              {isAdmin && <Link href="/admin" style={{ color: 'var(--red)' }}>Admin</Link>}
              <div className="nav-mobile-divider" />
              <span className="nav-mobile-user">{session.user?.name}</span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => signOut()}
                style={{ borderColor: '#444', color: '#888', width: '100%' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">Log In</Link>
              <Link href="/signup">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
