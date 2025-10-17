export default function handler(req, res) {
  const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI;

  if (!cognitoDomain || !clientId || !redirectUri) {
    return res.status(500).json({
      error: 'Cognito 설정이 올바르지 않습니다. 환경변수를 확인하세요.',
    });
  }

  // PKCE Code Verifier 생성
  const codeVerifier = generateRandomString(128);
  
  // Code Challenge 생성 (S256)
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  // 세션에 저장하는 대신 쿠키로 전달 (실제로는 서버사이드 세션 권장)
  res.setHeader('Set-Cookie', [
    `code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  ]);

  const authUrl = `https://${cognitoDomain}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=openid+email+profile&` +
    `code_challenge_method=S256&` +
    `code_challenge=${codeChallenge}`;

  res.redirect(302, authUrl);
}

// PKCE 헬퍼 함수들
function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function sha256(plain) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(plain).digest();
}

function base64URLEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

