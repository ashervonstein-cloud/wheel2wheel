'use client';
// src/app/login/page.tsx
import { useState, useRef, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router  = useRouter();
  const params  = useSearchParams();
  const message = params.get('message');

  const [step, setStep]       = useState<'email' | 'code'>('email');
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res  = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to send code');
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
      router.push('/dashboard');
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '48px auto' }}>
      <div className="page-header">
        <h1>Welcome back</h1>
        <p>Log in to make your picks</p>
      </div>

      <div className="card">
        {message && <div className="alert alert-success">{message}</div>}
        {error   && <div className="alert alert-error">{error}</div>}

        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px' }}
              disabled={loading || !email.trim()}
            >
              {loading ? 'Sending...' : 'Send code'}
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
              onClick={() => { setStep('email'); setCode(''); setError(''); }}
            >
              ← Back / resend code
            </button>
          </form>
        )}

        <p className="text-sm text-gray text-center mt-16">
          No account?{' '}
          <Link href="/signup" style={{ color: 'var(--red)', textDecoration: 'none', fontWeight: 700 }}>
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
