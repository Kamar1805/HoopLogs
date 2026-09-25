// api/send-welcome.js (Serverless function for Vercel / Production)
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const athleteName = name || 'Hooper';
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY is not defined in environment variables.');
    }

    const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to HoopLogs</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060810; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #060810; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #0d121f; border-radius: 16px; border: 1px solid rgba(255, 85, 0, 0.3); overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #ff5500 0%, #b33800 100%); padding: 32px 20px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
                🏀 HOOPLOGS ARENA
              </h1>
              <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600; letter-spacing: 1px;">
                OFFICIAL ATHLETE WELCOME
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 28px;">
              <h2 style="margin: 0 0 16px 0; color: #ffffff; font-size: 20px;">
                Welcome to the Squad, ${athleteName}!
              </h2>
              
              <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1; margin: 0 0 16px 0;">
                Your account is <strong>officially verified</strong>. You now have full access to your personalized basketball tracking operating system.
              </p>

              <div style="background-color: #131929; border-left: 4px solid #ff5500; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #ff5500; text-transform: uppercase; letter-spacing: 1px;">
                  💬 Note from Kamar (AK):
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #e2e8f0; font-style: italic;">
                  "Hey, It's Kamar again.. Welcome to the team! If you are here, it means you're serious about taking your basketball game to the next level. Track your shooting sets across all 5 zones, stick to your tailored athletic workouts, communicate with teammates, and climb the leaderboards. I wish you nothing but greatness in your grind. See you on the court!"
                </p>
                <p style="margin: 10px 0 0 0; font-size: 12px; font-weight: 700; color: #94a3b8;">
                  — Kamar, AK. Hooplogs Team
                </p>
              </div>

              <!-- Key Features -->
              <h3 style="margin: 24px 0 12px 0; color: #ffffff; font-size: 16px; font-weight: 700;">
                What you can do right now:
              </h3>
              <ul style="margin: 0 0 28px 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8;">
                <li><strong>5-Zone Shot Tracker:</strong> Log makes & attempts in Corner 3, Wing 3, Top Key, Mid-Range & Paint.</li>
                <li><strong>Arena Notice Board:</strong> Check practice schedules and RSVP (🏀 Available / ❌ Not Available).</li>
                <li><strong>Athletic Conditioning:</strong> Follow targeted Vertical Rim Elevation, Speed, and Strength programs.</li>
                <li><strong>WhatsApp Direct Connect:</strong> Add your number in your profile so coaches and teammates can reach you.</li>
              </ul>

              <!-- CTA Button -->
              <div align="center" style="margin: 32px 0 16px 0;">
                <a href="https://hooplogs.vercel.app/dashboard" style="background-color: #ff5500; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 800; text-decoration: none; border-radius: 10px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 20px rgba(255, 85, 0, 0.4);">
                  ENTER YOUR ARENA DASHBOARD 🚀
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #070a12; padding: 20px; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                © 2026 HoopLogs • Built for serious hoopers.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Kamar, AK | HoopLogs <onboarding@resend.dev>',
        to: [email.trim()],
        subject: `Welcome to the Squad, ${athleteName}! 🏀 — Kamar, AK. HoopLogs Team`,
        html: welcomeHtml
      })
    });

    const data = await resendRes.json();
    if (!resendRes.ok) {
      console.error('Resend error:', data);
      return res.status(resendRes.status).json(data);
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Send welcome error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
