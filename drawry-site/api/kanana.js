const https = require('https');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const KANANA_API_KEY = (process.env.KANANA_API_KEY || '').trim();
  if (!KANANA_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const body = JSON.stringify(req.body);
  const isStream = req.body && req.body.stream === true;

  const options = {
    hostname: 'kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com',
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KANANA_API_KEY}`,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const request = https.request(options, (upstream) => {
    if (isStream) {
      res.writeHead(upstream.statusCode, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
      });
      upstream.on('data', chunk => res.write(chunk));
      upstream.on('end', () => res.end());
      upstream.on('error', () => res.end());
    } else {
      let chunks = '';
      upstream.on('data', chunk => chunks += chunk);
      upstream.on('end', () => {
        try { res.status(upstream.statusCode).json(JSON.parse(chunks)); }
        catch(e) { res.status(upstream.statusCode).send(chunks); }
      });
    }
  });

  request.on('error', (e) => {
    if (!res.headersSent) res.status(500).json({ error: e.message });
    else res.end();
  });
  request.write(body);
  request.end();
};
