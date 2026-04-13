const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const KANANA_API_KEY = process.env.KANANA_API_KEY;
  if (!KANANA_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com',
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KANANA_API_KEY}`,
        'Content-Type': req.headers['content-type'],
        'Content-Length': req.headers['content-length'],
      }
    };

    const upstream = https.request(options, (upstreamRes) => {
      let data = '';
      upstreamRes.on('data', chunk => data += chunk);
      upstreamRes.on('end', () => {
        console.log('[STT] Kanana 응답 status:', upstreamRes.statusCode);
        console.log('[STT] Kanana 응답 body:', data);
        res.status(upstreamRes.statusCode).send(data);
        resolve();
      });
    });

    upstream.on('error', (err) => {
      console.error('[STT] upstream 오류:', err);
      res.status(500).json({ error: err.message });
      resolve();
    });

    // req를 upstream으로 직접 파이프 (body parsing 없이)
    req.pipe(upstream);
  });
};
