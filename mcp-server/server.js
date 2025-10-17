import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// OAuth 상태 저장 (실제 프로덕션에서는 Redis 등 사용)
const oauthSessions = new Map();

// MCP 툴 정의
const tools = [
  {
    name: 'getPublicContent',
    description: '공개 컨텐츠(카드 또는 상품 정보)를 조회합니다. 인증이 필요하지 않습니다.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['cards', 'products'],
          description: '조회할 컨텐츠 타입 (cards: 카드 상품, products: 금융 상품)',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'getPayments',
    description: '사용자의 결제 내역을 조회합니다. 로그인(OAuth)이 필요합니다.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// MCP 메타데이터 엔드포인트
app.get('/mcp/info', (req, res) => {
  res.json({
    name: 'Hyundai Card MCP Server',
    version: '1.0.0',
    description: 'MCP Server for Hyundai Card POC with OAuth integration',
    tools: tools,
    auth: {
      type: 'oauth',
      client_id: process.env.COGNITO_CLIENT_ID,
      authorization_url: `https://${process.env.COGNITO_DOMAIN}/oauth2/authorize`,
      token_url: `https://${process.env.COGNITO_DOMAIN}/oauth2/token`,
      scopes: ['openid', 'email', 'profile'],
      redirect_url: process.env.COGNITO_REDIRECT_URI,
    },
  });
});

// 툴 목록 엔드포인트
app.get('/mcp/tools', (req, res) => {
  res.json({ tools });
});

// 툴 실행 엔드포인트
app.post('/mcp/execute', async (req, res) => {
  const { tool, arguments: args, access_token } = req.body;

  console.log(`[MCP] 툴 실행 요청: ${tool}`, args);

  try {
    if (tool === 'getPublicContent') {
      // 무인증 API 호출
      const { type } = args;
      const response = await axios.get(`${process.env.API_BASE_URL}/public/${type}`);
      
      return res.json({
        success: true,
        data: response.data,
      });
    }

    if (tool === 'getPayments') {
      // 인증 필요한 API 호출
      if (!access_token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: '로그인이 필요합니다. OAuth 인증을 진행해주세요.',
          auth_required: true,
        });
      }

      const response = await axios.get(`${process.env.API_BASE_URL}/me/payments`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      return res.json({
        success: true,
        data: response.data,
      });
    }

    return res.status(404).json({
      success: false,
      error: 'Tool not found',
      message: `툴 '${tool}'을 찾을 수 없습니다.`,
    });
  } catch (error) {
    console.error(`[MCP] 툴 실행 오류:`, error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '인증이 만료되었거나 유효하지 않습니다.',
        auth_required: true,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// OAuth 인증 시작
app.get('/oauth/authorize', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // 세션 저장
  oauthSessions.set(state, {
    codeVerifier,
    timestamp: Date.now(),
  });

  // 10분 후 세션 삭제
  setTimeout(() => {
    oauthSessions.delete(state);
  }, 600000);

  const authUrl =
    `https://${process.env.COGNITO_DOMAIN}/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.COGNITO_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.COGNITO_REDIRECT_URI)}&` +
    `scope=openid+email+profile&` +
    `state=${state}&` +
    `code_challenge_method=S256&` +
    `code_challenge=${codeChallenge}`;

  res.redirect(authUrl);
});

// OAuth 콜백
app.get('/oauth/callback', async (req, res) => {
  const { code, state, error: authError } = req.query;

  if (authError) {
    return res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>❌ 인증 실패</h1>
          <p>오류: ${authError}</p>
          <p>이 창을 닫고 다시 시도해주세요.</p>
        </body>
      </html>
    `);
  }

  const session = oauthSessions.get(state);
  if (!session) {
    return res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>❌ 세션 만료</h1>
          <p>인증 세션이 만료되었습니다. 다시 시도해주세요.</p>
        </body>
      </html>
    `);
  }

  const { codeVerifier } = session;
  oauthSessions.delete(state);

  try {
    // 토큰 교환
    const tokenUrl = `https://${process.env.COGNITO_DOMAIN}/oauth2/token`;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.COGNITO_CLIENT_ID,
      code: code,
      redirect_uri: process.env.COGNITO_REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const response = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, id_token, refresh_token } = response.data;

    console.log('[OAuth] 토큰 획득 성공');

    // 토큰을 Claude/Cursor로 전달하는 방법
    // 실제 구현에서는 MCP 프로토콜에 따라 처리
    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>✅ 로그인 성공</h1>
          <p>인증이 완료되었습니다. 이제 결제내역 조회가 가능합니다.</p>
          <h3>획득한 토큰:</h3>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; word-break: break-all;">
            <p><strong>Access Token:</strong></p>
            <p style="font-size: 12px; font-family: monospace;">${access_token}</p>
          </div>
          <p style="margin-top: 20px;">
            <strong>Claude에서 사용하려면:</strong><br/>
            위 Access Token을 복사하여 MCP 서버 요청 시 함께 전달하세요.
          </p>
          <script>
            // 토큰을 로컬스토리지에 저장 (개발용)
            localStorage.setItem('mcp_access_token', '${access_token}');
            localStorage.setItem('mcp_id_token', '${id_token}');
            console.log('토큰이 로컬스토리지에 저장되었습니다.');
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('[OAuth] 토큰 교환 실패:', error.response?.data || error.message);
    res.send(`
      <html>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>❌ 토큰 교환 실패</h1>
          <p>${error.message}</p>
          <pre style="text-align: left; background: #f5f5f5; padding: 20px; border-radius: 8px;">
            ${JSON.stringify(error.response?.data || {}, null, 2)}
          </pre>
        </body>
      </html>
    `);
  }
});

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// PKCE 헬퍼 함수
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on http://localhost:${PORT}`);
  console.log(`📋 MCP Info: http://localhost:${PORT}/mcp/info`);
  console.log(`🔐 OAuth Login: http://localhost:${PORT}/oauth/authorize`);
});

