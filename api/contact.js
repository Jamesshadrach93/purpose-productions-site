export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message, website } = req.body || {};

  // Honeypot: real users won't fill this hidden field
  if (website) {
    return res.status(200).json({ ok: true });
  }

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Please fill out every field.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'That email doesn\'t look right.' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Email service not configured yet.' });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Purpose Productions <onboarding@resend.dev>',
        to: ['info@purposeproductions.co'],
        reply_to: email,
        subject: `New enquiry from ${name}`,
        text: `${message}\n\n— ${name}\n${email}`,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('Resend error:', resp.status, err);
      return res.status(502).json({ error: 'Could not send right now. Try again in a moment, or email info@purposeproductions.co directly.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Send failed:', err);
    return res.status(500).json({ error: 'Something went wrong. Try again in a moment.' });
  }
}
