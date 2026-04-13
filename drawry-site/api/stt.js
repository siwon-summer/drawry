const https = require('https');

// body를 소비하지 않고 스트림으로 파이프하기 위해 bodyParser 비활성화
// ※ module.exports = handler 이후에 .config를 붙여야 덮어써지지 않음
function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const KANANA_API_KEY = (process.env.KANANA_API_KEY || '').trim();
  if (!KANANA_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  const contentType = req.headers['content-type'] || '';
  const contentLength = req.headers['content-length'] || '';

  const options = {
    hostname: 'kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com',
    path: '/v1/audio/transcriptions',
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'Authorization': `Bearer ${KANANA_API_KEY}`,
      ...(contentLength && { 'Content-Length': contentLength }),
    }
  };

  const upstream_req = https.request(options, (upstream) => {
    let chunks = '';
    upstream.on('data', chunk => chunks += chunk);
    upstream.on('end', () => {
      try { res.status(upstream.statusCode).json(JSON.parse(chunks)); }
      catch(e) { res.status(upstream.statusCode).send(chunks); }
    });
  });

  upstream_req.on('error', (e) => {
    if (!res.headersSent) res.status(500).json({ error: e.message });
    else res.end();
  });

  req.pipe(upstream_req);
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };

