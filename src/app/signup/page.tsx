'use client';
// src/app/signup/page.tsx
import { useState, useRef, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get('redirect') || '/dashboard';

  const [step, setStep]       = useState<'details' | 'code'>('details');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res  = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      setLoading(false);
    } else {
      setStep('code');
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email:    email.trim().toLowerCase(),
      code:     code.trim(),
      redirect: false,
    });

    if (res?.error) {
      setError('Invalid or expired code. Please try again.');
      setLoading(false);
    } else {
      router.push(redirect);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '48px auto' }}>
      <div className="page-header">
        <h1>Create account</h1>
        <p>Join Wheel2Wheel and start picking</p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        {step === 'details' ? (
          <form onSubmit={handleCreateAccount}>
            <div className="form-group">
              <label>Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={loading || !name.trim() || !email.trim()}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="form-group">
              <label>Code sent to {email}</label>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{ letterSpacing: '0.25em', fontSize: '1.5rem', textAlign: 'center' }}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={loading || code.length < 6}
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => { setStep('details'); setCode(''); setError(''); }}
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-sm text-gray text-center mt-16">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--red)', textDecoration: 'none', fontWeight: 700 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
