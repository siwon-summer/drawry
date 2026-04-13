const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const KANANA_API_KEY = process.env.KANANA_API_KEY;
  if (!KANANA_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  try {
    // 1. req body에서 base64 오디오 데이터 받기
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const { audioBase64, format = 'webm' } = body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 필드가 없음' });
    }

    // 2. Kanana chat completions로 STT 요청
    const payload = JSON.stringify({
      model: 'kanana-o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: audioBase64, format: format }
            },
            {
              type: 'text',
              text: '음성인식 결과만 보여줘. 다른 말 없이 인식된 텍스트만 출력해줘.'
            }
          ]
        }
      ],
      modalities: ['text']
    });

    const options = {
      hostname: 'kanana-o.a2s-endpoint.kr-central-2.kakaocloud.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KANANA_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const result = await new Promise((resolve, reject) => {
      const upstream = https.request(options, (upstreamRes) => {
        let data = '';
        upstreamRes.on('data', chunk => data += chunk);
        upstreamRes.on('end', () => {
          console.log('[STT] Kanana 응답 status:', upstreamRes.statusCode);
          console.log('[STT] Kanana 응답 body:', data);
          resolve({ status: upstreamRes.statusCode, body: data });
        });
      });
      upstream.on('error', reject);
      upstream.write(payload);
      upstream.end();
    });

    const parsed = JSON.parse(result.body);
    const text = parsed?.choices?.[0]?.message?.content || '';
    console.log('[STT] 인식 결과:', text);
    return res.status(200).json({ text });

  } catch (err) {
    console.error('[STT] 오류:', err);
    return res.status(500).json({ error: err.message });
  }
};
