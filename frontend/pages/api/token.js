import axios from 'axios';

// 쿠키 파싱 함수
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      const name = parts[0].trim();
      const value = parts.slice(1).join('=').trim();
      cookies[name] = decodeURIComponent(value);
    });
  }
  return cookies;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;

  // 쿠키에서 code_verifier 가져오기
  const cookies = parseCookies(req.headers.cookie);
  const codeVerifier = cookies.code_verifier;

  if (!codeVerifier) {
    return res.status(400).json({ error: 'Code verifier not found' });
  }

  try {
    // Cognito 토큰 엔드포인트 호출
    const tokenUrl = `https://${cognitoDomain}/oauth2/token`;
    
    // 디버깅용 로그
    console.log('Token exchange params:', {
      cognitoDomain,
      clientId,
      redirectUri,
      codeLength: code?.length,
      codeVerifierLength: codeVerifier?.length,
    });
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // code_verifier 쿠키 삭제
    res.setHeader('Set-Cookie', [
      'code_verifier=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ]);

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('토큰 교환 실패:', error.response?.data || error.message);
    return res.status(500).json({
      error: '토큰 교환에 실패했습니다.',
      details: error.response?.data || error.message,
    });
  }
}

