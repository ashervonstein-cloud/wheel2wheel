'use client';
// src/components/Nav.tsx
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/picks', label: 'Picks' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export function Nav() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.isAdmin;
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Dismiss on outside tap and on Escape — the panel used to trap you until
  // you found the toggle again.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || toggleRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navLinks = (onNavigate?: () => void) => (
    <>
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={isActive(href) ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          href="/admin"
          onClick={onNavigate}
          className="nav-admin"
          aria-current={isActive('/admin') ? 'page' : undefined}
        >
          Admin
        </Link>
      )}
    </>
  );

  return (
    <nav>
      <Link href="/" className="logo">W2W</Link>
      <div className="nav-desktop">{session && navLinks()}</div>
      <div className="spacer" />
      <div className="nav-desktop">
        {session ? (
          <>
            <span className="user-name">{session.user?.name}</span>
            <button className="btn btn-outline btn-sm nav-signout" onClick={() => signOut()}>
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
        ref={toggleRef}
        className="nav-hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="nav-mobile-menu"
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"
             fill="none" stroke="currentColor" strokeWidth="1.8">
          {menuOpen
            ? <path d="M5 5l10 10M15 5L5 15" />
            : <path d="M3 6h14M3 10h14M3 14h14" />}
        </svg>
      </button>

      {menuOpen && (
        <div className="nav-mobile-menu" id="nav-mobile-menu" ref={menuRef}>
          {session ? (
            <>
              {navLinks(() => setMenuOpen(false))}
              <div className="nav-mobile-divider" />
              <span className="nav-mobile-user">{session.user?.name}</span>
              <button
                className="btn btn-outline btn-sm nav-signout"
                onClick={() => signOut()}
                style={{ width: '100%' }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>Log In</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
