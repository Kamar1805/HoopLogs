// src/utils/sendWelcomeEmail.js

/**
 * Triggers the official second welcome email from Coach Kamar via Resend
 * Works in both local dev (Vite middleware) and production (Vercel serverless / Edge).
 */
export async function sendWelcomeEmail({ email, name }) {
  if (!email) return;

  try {
    const res = await fetch('/api/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim(),
        name: name || 'Hooper',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Welcome email dispatch warning:', err);
      return false;
    }

    const data = await res.json();
    console.log('Welcome email dispatched successfully via Resend:', data);
    return true;
  } catch (err) {
    console.warn('Could not dispatch welcome email:', err);
    return false;
  }
}
