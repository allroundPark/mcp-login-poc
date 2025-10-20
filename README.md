# 🎴 루나카드 MCP Login POC

ID/비밀번호 + OAuth(Authorization Code + PKCE) 기반 인증을 통한 최소 기능 POC입니다.

## 📋 프로젝트 구조

```
MCP Login Poc/
├── cdk/                    # AWS 인프라 (CDK)
│   ├── bin/
│   ├── lib/
│   ├── lambda/            # Lambda 함수 코드
│   │   ├── public/       # 무인증 API
│   │   └── protected/    # 인증 필요 API
│   └── scripts/          # 데이터 시드 스크립트
├── frontend/              # Next.js 프론트엔드
│   ├── pages/
│   │   ├── index.js      # 공개 랜딩 페이지
│   │   ├── dashboard.js  # 보호된 대시보드
│   │   ├── api/
│   │   │   ├── login.js  # Cognito 로그인 리다이렉트
│   │   │   └── token.js  # 토큰 교환
│   │   └── auth/
│   │       └── callback.js # OAuth 콜백
│   └── styles/
├── mcp-server/            # MCP 서버 (Claude 연동)
│   ├── server.js         # Express 서버
│   └── README.md
└── README.md              # 이 파일
```

## 🎯 주요 기능

### ✅ 구현된 기능

1. **공개 컨텐츠 조회** (무인증)
   - 카드 상품 정보
   - 금융 상품 정보

2. **결제내역 조회** (인증 필요)
   - JWT 기반 인증
   - 사용자별 결제내역

3. **OAuth 인증 흐름**
   - Cognito Hosted UI
   - Authorization Code + PKCE
   - 액세스 토큰 관리

4. **MCP 서버 (Claude 연동)**
   - getPublicContent 툴
   - getPayments 툴 (OAuth)

## 🚀 시작하기

### 1. AWS 인프라 배포

```bash
cd cdk

# 패키지 설치
npm install

# Lambda 함수 의존성 설치
cd lambda/public && npm install && cd ../..
cd lambda/protected && npm install && cd ../..

# CDK 배포
npm run deploy

# 배포 완료 후 출력값 확인 및 저장:
# - UserPoolId
# - FrontendClientId
# - McpClientId
# - CognitoDomain
# - ApiEndpoint
```

### 2. 샘플 데이터 시드

```bash
cd cdk/scripts
npm install
npm run seed
```

**중요:** 첫 사용자 생성 후, DynamoDB의 `userId`를 Cognito User의 `sub` 값으로 변경해야 합니다.

### 3. Cognito 사용자 생성

AWS Console → Cognito User Pool → Users → Create user

- 사용자 이름: `testuser` (또는 원하는 이름)
- 이메일: 실제 이메일 주소
- 임시 비밀번호 설정

생성 후 User의 `sub` 값을 확인하고, DynamoDB `mcp-poc-payments` 테이블의 기존 데이터를 해당 `sub`로 변경합니다.

### 4. 프론트엔드 설정 및 실행

```bash
cd frontend

# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env

# .env 파일 편집 (CDK 출력값 입력):
# NEXT_PUBLIC_API_BASE_URL=https://xxxxx.execute-api.ap-northeast-2.amazonaws.com
# NEXT_PUBLIC_COGNITO_DOMAIN=mcp-poc-xxxxx.auth.ap-northeast-2.amazoncognito.com
# NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxx (FrontendClientId)
# NEXT_PUBLIC_COGNITO_REGION=ap-northeast-2
# NEXT_PUBLIC_COGNITO_REDIRECT_URI=http://localhost:3000/auth/callback

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

### 5. Vercel 배포 (선택)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
cd frontend
vercel

# 환경변수 설정 (Vercel Dashboard 또는 CLI)
vercel env add NEXT_PUBLIC_API_BASE_URL
vercel env add NEXT_PUBLIC_COGNITO_DOMAIN
vercel env add NEXT_PUBLIC_COGNITO_CLIENT_ID
vercel env add NEXT_PUBLIC_COGNITO_REGION
vercel env add NEXT_PUBLIC_COGNITO_REDIRECT_URI

# REDIRECT_URI를 Vercel 도메인으로 변경
# 예: https://your-app.vercel.app/auth/callback
```

**중요:** Vercel 배포 후, Cognito User Pool의 App Client 설정에서 Callback URL을 추가해야 합니다.

AWS Console → Cognito → User Pool → App Client → Edit Hosted UI settings
- Callback URL에 `https://your-app.vercel.app/auth/callback` 추가
- Logout URL에 `https://your-app.vercel.app` 추가

### 6. MCP 서버 설정 및 실행

```bash
cd mcp-server

# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env

# .env 파일 편집 (CDK 출력값 입력):
# API_BASE_URL=https://xxxxx.execute-api.ap-northeast-2.amazonaws.com
# COGNITO_DOMAIN=mcp-poc-xxxxx.auth.ap-northeast-2.amazoncognito.com
# COGNITO_CLIENT_ID=xxxxx (McpClientId - 주의: Frontend와 다름!)
# COGNITO_REGION=ap-northeast-2
# COGNITO_REDIRECT_URI=http://localhost:4000/oauth/callback
# PORT=4000

# 서버 실행
npm start
```

서버가 `http://localhost:4000`에서 실행됩니다.

### 7. MCP 서버 테스트

#### 공개 컨텐츠 조회 (무인증)

```bash
curl -X POST http://localhost:4000/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "getPublicContent",
    "arguments": {
      "type": "cards"
    }
  }'
```

#### OAuth 로그인 및 결제내역 조회

1. 브라우저에서 `http://localhost:4000/oauth/authorize` 접속
2. Cognito Hosted UI에서 로그인
3. 콜백 페이지에서 Access Token 복사
4. 다음 명령어로 결제내역 조회:

```bash
curl -X POST http://localhost:4000/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "getPayments",
    "arguments": {},
    "access_token": "여기에-액세스-토큰-붙여넣기"
  }'
```

## 🤖 Cursor/Claude 연동

### 현재 MCP 서버 상태

이 POC의 MCP 서버는 **표준 REST API 서버**로 구현되어 있습니다. Claude Desktop이나 Cursor에서 직접 연동하려면 추가 작업이 필요합니다:

### 옵션 1: 수동 테스트 (현재 가능)

Cursor의 AI 채팅에서 다음과 같이 요청할 수 있습니다:

```
"MCP 서버에 연결해서 루나카드 상품 목록을 가져와줘"
```

Cursor가 자동으로 `http://localhost:4000/mcp/execute` 엔드포인트를 호출합니다.

### 옵션 2: MCP SDK 통합 (권장, 추가 작업 필요)

공식 MCP SDK를 사용하여 완전한 통합을 구현하려면:

1. `@modelcontextprotocol/sdk` 패키지 설치
2. MCP 표준 프로토콜 구현
3. Cursor 설정 파일에 MCP 서버 등록

자세한 내용은 [MCP 공식 문서](https://modelcontextprotocol.io)를 참조하세요.

## 📝 API 엔드포인트

### 공개 API (무인증)

- `GET /public/cards` - 카드 상품 목록
- `GET /public/products` - 금융 상품 목록

### 보호된 API (JWT 필요)

- `GET /me/payments` - 사용자 결제내역
  - Header: `Authorization: Bearer <access_token>`

## 🔐 인증 흐름

```
사용자 → 프론트엔드 → Cognito Hosted UI
                           ↓
                    (ID/비밀번호 입력)
                           ↓
      콜백 (인증 코드) → 토큰 교환 (PKCE)
                           ↓
                     액세스 토큰 획득
                           ↓
              API Gateway (JWT Authorizer)
                           ↓
                    Lambda (DynamoDB)
```

## 🧪 테스트 시나리오

### 1. 공개 컨텐츠 조회

1. 프론트엔드 홈페이지 접속
2. 카드 상품 3개, 금융 상품 2개 확인

### 2. 인증 후 결제내역 조회

1. "마이 대시보드" 클릭
2. 로그인 페이지로 리다이렉트
3. Cognito Hosted UI에서 로그인
4. 대시보드에서 결제내역 3개 확인

### 3. MCP 서버를 통한 Claude 연동

1. MCP 서버 실행
2. 공개 컨텐츠 API 호출 (무인증)
3. OAuth 로그인
4. 결제내역 API 호출 (인증)

## 🛠️ 트러블슈팅

### CDK 배포 실패

- AWS 자격증명 확인: `aws configure`
- CDK Bootstrap 실행: `cdk bootstrap`

### Cognito 로그인 실패

- Callback URL이 정확히 등록되었는지 확인
- App Client ID가 올바른지 확인
- User Pool에 사용자가 생성되었는지 확인

### API Gateway 401 에러

- JWT 토큰이 올바른지 확인
- App Client ID가 JWT Authorizer에 등록되었는지 확인
- 토큰이 만료되지 않았는지 확인

### DynamoDB 데이터 조회 안됨

- userId가 Cognito User의 `sub`와 일치하는지 확인
- 테이블 이름이 정확한지 확인
- Lambda 함수에 DynamoDB 읽기 권한이 있는지 확인

## 📚 참고 자료

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Amazon Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Next.js Documentation](https://nextjs.org/docs)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)

## 📄 라이센스

이 프로젝트는 POC 목적으로 제작되었습니다.

## 👥 기여

문의사항이나 개선사항이 있으시면 이슈를 등록해주세요.

