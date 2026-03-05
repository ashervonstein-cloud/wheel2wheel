// src/lib/resend.ts
// Sends verification codes via Resend email API.

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'noreply@wheel2wheel.com';

export async function sendVerificationCode(email: string, code: string): Promise<void> {
  // If no API key is configured, log to console (useful in dev)
  if (!process.env.RESEND_API_KEY) {
    console.log(`[DEV] Verification code for ${email}: ${code}`);
    return;
  }

  await resend.emails.send({
    from: `Wheel2Wheel <${FROM}>`,
    to: email,
    subject: `Your Wheel2Wheel code: ${code}`,
    html: `
      <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 20px; margin-bottom: 8px;">WHEEL2WHEEL</h1>
        <p style="color: #666; margin-bottom: 32px;">Your verification code</p>
        <div style="font-size: 40px; font-weight: 700; letter-spacing: 8px; border: 1px solid #000; padding: 24px; text-align: center;">
          ${code}
        </div>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">
          This code expires in 10 minutes. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  });
}
