import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to handle /api/send-welcome in local dev
function welcomeEmailDevPlugin(env) {
  return {
    name: 'welcome-email-dev-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-welcome' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { email, name } = JSON.parse(body || '{}');
              const athleteName = name || 'Hooper';
              const apiKey = env.RESEND_API_KEY || env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;

              if (!apiKey) {
                console.warn('RESEND_API_KEY not configured.');
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'RESEND_API_KEY is missing' }));
                return;
              }

              const welcomeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to HoopLogs</title></head>
<body style="margin: 0; padding: 0; background-color: #060810; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #060810; padding: 40px 20px;">
    <tr><td align="center">
      <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0d121f; border-radius: 16px; border: 1px solid rgba(255, 85, 0, 0.3); overflow: hidden;">
        <tr><td align="center" style="background: linear-gradient(135deg, #ff5500 0%, #b33800 100%); padding: 32px 20px;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">🏀 HOOPLOGS ARENA</h1>
          <p style="margin: 6px 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">OFFICIAL ATHLETE WELCOME</p>
        </td></tr>
        <tr><td style="padding: 36px 28px;">
          <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">Welcome to the Squad, ${athleteName}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px;">
            Your account is <strong>officially verified</strong>. You now have full access to your personalized basketball training operating system.
          </p>
          <div style="background: rgba(255, 85, 0, 0.08); border-left: 4px solid #ff5500; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #f8fafc; font-style: italic;">
              "Hey ${athleteName}, it's Kamar again. Welcome to the team! I'm thrilled to have you in the arena. Make sure you set your preferred theme, lock in your shooting reps, and check the practice board. We're here to build greatness."
            </p>
            <p style="margin: 8px 0 0; font-size: 13px; font-weight: 700; color: #ff5500;">
              — Kamar, AK. Hooplogs Team
            </p>
          </div>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px;">
            <tr><td align="center">
              <a href="https://hooplogs.vercel.app/dashboard" style="background: linear-gradient(135deg, #ff5500 0%, #d94100 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: 0.5px;">
                ENTER ARENA DASHBOARD →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color: #080b12; padding: 20px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
          <p style="margin: 0; font-size: 12px; color: #64748b;">Powered by Sozidara • © 2026 Sozidara. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

              const resendRes = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey.trim()}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  from: 'Kamar, AK | HoopLogs <onboarding@resend.dev>',
                  to: [email.trim()],
                  subject: `Welcome to the Squad, ${athleteName}! 🏀 — Kamar, AK. HoopLogs Team`,
                  html: welcomeHtml
                })
              });

              const result = await resendRes.json();
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = resendRes.status;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), welcomeEmailDevPlugin(env)],
    chunkSizeWarningLimit: 1000,
  };
})
