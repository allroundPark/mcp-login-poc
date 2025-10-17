# 🚀 배포 가이드

이 문서는 현대카드 MCP Login POC를 처음부터 끝까지 배포하는 상세한 가이드입니다.

## 📋 사전 준비

### 필수 요구사항

- AWS 계정 (관리자 권한)
- Node.js 18+ 설치
- AWS CLI 설치 및 설정
- Vercel 계정 (프론트엔드 배포용, 선택)

### AWS CLI 설정

```bash
aws configure
# AWS Access Key ID 입력
# AWS Secret Access Key 입력
# Default region: ap-northeast-2
# Default output format: json
```

## 1️⃣ AWS 인프라 배포 (30분 소요)

### Step 1: CDK 설치 및 Bootstrap

```bash
# CDK CLI 전역 설치
npm install -g aws-cdk

# 프로젝트 디렉토리로 이동
cd "MCP Login Poc/cdk"

# 패키지 설치
npm install

# CDK Bootstrap (최초 1회만 실행)
cdk bootstrap aws://ACCOUNT_ID/ap-northeast-2
# ACCOUNT_ID는 본인의 AWS 계정 ID
```

### Step 2: Lambda 함수 의존성 설치

```bash
# Public Lambda
cd lambda/public
npm install
cd ../..

# Protected Lambda
cd lambda/protected
npm install
cd ../..
```

### Step 3: CDK 스택 배포

```bash
# 배포 전 확인
cdk synth

# 배포 실행
cdk deploy

# 또는 자동 승인
cdk deploy --require-approval never
```

### Step 4: 배포 결과 저장

배포가 완료되면 다음과 같은 출력값이 표시됩니다. **반드시 저장**하세요:

```
Outputs:
McpLoginPocStack.UserPoolId = ap-northeast-2_XXXXXXXXX
McpLoginPocStack.FrontendClientId = 1a2b3c4d5e6f7g8h9i0j
McpLoginPocStack.McpClientId = 9i8h7g6f5e4d3c2b1a0
McpLoginPocStack.CognitoDomain = mcp-poc-123456789012
McpLoginPocStack.CognitoHostedUIUrl = https://mcp-poc-123456789012.auth.ap-northeast-2.amazoncognito.com
McpLoginPocStack.ApiEndpoint = https://abc123def4.execute-api.ap-northeast-2.amazonaws.com
McpLoginPocStack.ContentsTableName = mcp-poc-contents
McpLoginPocStack.PaymentsTableName = mcp-poc-payments
```

이 값들을 메모장에 복사해두세요. 다음 단계에서 사용합니다.

## 2️⃣ 샘플 데이터 시드 (5분 소요)

### Step 1: 데이터 시드 실행

```bash
cd scripts
npm install

# AWS 리전 설정 (필요시)
export AWS_REGION=ap-northeast-2

# 시드 실행
npm run seed
```

### Step 2: 결과 확인

```
🌱 데이터 시드 시작...

📝 Contents 테이블 시드 중...
✅ card-001 추가 완료
✅ card-002 추가 완료
✅ card-003 추가 완료
✅ product-001 추가 완료
✅ product-002 추가 완료

💳 Payments 테이블 시드 중...
✅ pay-001 추가 완료
✅ pay-002 추가 완료
✅ pay-003 추가 완료

🎉 데이터 시드 완료!
```

## 3️⃣ Cognito 사용자 생성 (10분 소요)

### Step 1: AWS Console에서 사용자 생성

1. AWS Console → Amazon Cognito
2. User Pools 선택
3. `mcp-poc-user-pool` 클릭
4. Users 탭 → Create user
5. 다음 정보 입력:
   - Username: `testuser`
   - Email: 본인의 실제 이메일 주소
   - Temporary password: 원하는 임시 비밀번호 (예: `Test1234!`)
   - ✅ Mark email address as verified 체크
   - ✅ Send an email invitation 체크 해제
6. Create user 클릭

### Step 2: Sub 값 확인

1. 생성된 사용자 클릭
2. User attributes 섹션에서 `sub` 값 복사
   - 예: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Step 3: DynamoDB 데이터 업데이트

1. AWS Console → DynamoDB → Tables
2. `mcp-poc-payments` 테이블 선택
3. Explore table items
4. `userId`가 `test-user-001`인 항목들 선택
5. Edit item
6. `userId` 값을 위에서 복사한 `sub` 값으로 변경
7. 3개 항목 모두 업데이트

또는 AWS CLI 사용:

```bash
# Sub 값을 환경변수로 설정
export USER_SUB="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# 기존 항목 삭제 (선택)
aws dynamodb delete-item \
  --table-name mcp-poc-payments \
  --key '{"userId": {"S": "test-user-001"}, "paymentId": {"S": "pay-001"}}'

# 새 항목 추가 (각 payment마다 실행)
aws dynamodb put-item \
  --table-name mcp-poc-payments \
  --item '{
    "userId": {"S": "'$USER_SUB'"},
    "paymentId": {"S": "pay-001"},
    "amount": {"N": "45000"},
    "currency": {"S": "KRW"},
    "paidAt": {"S": "2025-10-15T10:30:00Z"},
    "merchant": {"S": "스타벅스"}
  }'
```

## 4️⃣ 프론트엔드 로컬 실행 (10분 소요)

### Step 1: 환경변수 설정

```bash
cd ../../frontend

# 환경변수 파일 생성
cp .env.example .env
```

### Step 2: .env 파일 편집

```env
NEXT_PUBLIC_API_BASE_URL=https://abc123def4.execute-api.ap-northeast-2.amazonaws.com
NEXT_PUBLIC_COGNITO_DOMAIN=mcp-poc-123456789012.auth.ap-northeast-2.amazoncognito.com
NEXT_PUBLIC_COGNITO_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-2
NEXT_PUBLIC_COGNITO_REDIRECT_URI=http://localhost:3000/auth/callback
```

### Step 3: 프론트엔드 실행

```bash
npm install
npm run dev
```

### Step 4: 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 카드 상품과 금융 상품이 표시되는지 확인
3. "마이 대시보드" 클릭
4. Cognito Hosted UI로 리다이렉트 확인
5. 생성한 계정으로 로그인
6. 최초 로그인 시 비밀번호 변경 요구됨 → 새 비밀번호 설정
7. 대시보드에서 결제내역 3개 확인

## 5️⃣ Vercel 배포 (15분 소요)

### Step 1: Vercel CLI 설치 및 로그인

```bash
npm i -g vercel
vercel login
```

### Step 2: 프론트엔드 배포

```bash
cd frontend
vercel

# 질문에 답변:
# Set up and deploy? Y
# Which scope? (본인 계정 선택)
# Link to existing project? N
# Project name? mcp-login-poc
# In which directory is your code located? ./
# Override settings? N
```

### Step 3: 환경변수 설정

Vercel Dashboard에서 설정:

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. 다음 변수들 추가:

```
NEXT_PUBLIC_API_BASE_URL = https://abc123def4.execute-api.ap-northeast-2.amazonaws.com
NEXT_PUBLIC_COGNITO_DOMAIN = mcp-poc-123456789012.auth.ap-northeast-2.amazoncognito.com
NEXT_PUBLIC_COGNITO_CLIENT_ID = 1a2b3c4d5e6f7g8h9i0j
NEXT_PUBLIC_COGNITO_REGION = ap-northeast-2
NEXT_PUBLIC_COGNITO_REDIRECT_URI = https://your-app.vercel.app/auth/callback
```

**중요:** `NEXT_PUBLIC_COGNITO_REDIRECT_URI`를 본인의 Vercel 도메인으로 변경하세요.

### Step 4: 재배포

```bash
vercel --prod
```

### Step 5: Cognito Callback URL 업데이트

1. AWS Console → Cognito → User Pools → `mcp-poc-user-pool`
2. App integration 탭
3. `mcp-poc-frontend` App client 선택
4. Edit Hosted UI settings
5. Callback URLs에 추가:
   ```
   https://your-app.vercel.app/auth/callback
   ```
6. Logout URLs에 추가:
   ```
   https://your-app.vercel.app
   ```
7. Save changes

### Step 6: Vercel 배포 테스트

1. Vercel 도메인 접속 (예: `https://mcp-login-poc.vercel.app`)
2. 로컬 테스트와 동일하게 진행

## 6️⃣ MCP 서버 실행 (10분 소요)

### Step 1: 환경변수 설정

```bash
cd ../mcp-server
cp .env.example .env
```

### Step 2: .env 파일 편집

```env
API_BASE_URL=https://abc123def4.execute-api.ap-northeast-2.amazonaws.com
COGNITO_DOMAIN=mcp-poc-123456789012.auth.ap-northeast-2.amazoncognito.com
COGNITO_CLIENT_ID=9i8h7g6f5e4d3c2b1a0
COGNITO_REGION=ap-northeast-2
COGNITO_REDIRECT_URI=http://localhost:4000/oauth/callback
PORT=4000
```

**주의:** `COGNITO_CLIENT_ID`는 **McpClientId**를 사용하세요 (FrontendClientId와 다름!)

### Step 3: MCP 서버 실행

```bash
npm install
npm start
```

### Step 4: MCP 서버 테스트

#### 테스트 1: 공개 컨텐츠 조회

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

예상 결과:
```json
{
  "success": true,
  "data": [
    {
      "contentId": "card-001",
      "type": "card",
      "title": "현대카드 M",
      ...
    }
  ]
}
```

#### 테스트 2: OAuth 로그인 및 결제내역 조회

1. 브라우저에서 `http://localhost:4000/oauth/authorize` 접속
2. Cognito Hosted UI에서 로그인
3. 콜백 페이지에서 Access Token 복사
4. 다음 명령어 실행:

```bash
curl -X POST http://localhost:4000/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "getPayments",
    "arguments": {},
    "access_token": "여기에-복사한-액세스-토큰-붙여넣기"
  }'
```

예상 결과:
```json
{
  "success": true,
  "data": [
    {
      "userId": "a1b2c3d4-...",
      "paymentId": "pay-001",
      "amount": 45000,
      "currency": "KRW",
      "merchant": "스타벅스",
      ...
    }
  ]
}
```

## 7️⃣ Cursor/Claude 연동 (선택)

현재 MCP 서버는 표준 REST API로 구현되어 있습니다. Cursor AI와 연동하려면:

### 방법 1: 수동 요청

Cursor AI 채팅에서:

```
"localhost:4000에 있는 MCP 서버에 연결해서 getPublicContent 툴로 카드 상품 목록을 가져와줘"
```

### 방법 2: MCP SDK 통합 (고급)

공식 MCP SDK를 사용한 완전한 통합이 필요합니다. 자세한 내용은 [MCP 공식 문서](https://modelcontextprotocol.io)를 참조하세요.

## ✅ 배포 체크리스트

- [ ] AWS CDK 스택 배포 완료
- [ ] DynamoDB 테이블에 샘플 데이터 시드 완료
- [ ] Cognito 사용자 생성 및 sub 값으로 데이터 업데이트 완료
- [ ] 프론트엔드 로컬 실행 및 테스트 완료
- [ ] Vercel 배포 및 Cognito Callback URL 업데이트 완료
- [ ] MCP 서버 실행 및 테스트 완료
- [ ] 전체 인증 흐름 테스트 완료

## 🛠️ 문제 해결

### CDK 배포 실패: "Policy contains a statement with one or more invalid principals"

**해결:**
```bash
cdk bootstrap
```

### Cognito 로그인 후 "redirect_uri_mismatch" 에러

**해결:**
- Cognito App Client 설정에서 Callback URL이 정확히 등록되었는지 확인
- 환경변수의 `REDIRECT_URI`와 일치하는지 확인

### API Gateway 401 Unauthorized

**해결:**
- JWT 토큰이 올바른지 확인
- 토큰이 만료되지 않았는지 확인 (기본 1시간)
- App Client ID가 JWT Authorizer의 Audience에 포함되었는지 확인

### DynamoDB 결제내역 조회 시 빈 배열 반환

**해결:**
- DynamoDB의 `userId`가 Cognito User의 `sub` 값과 일치하는지 확인
- AWS Console → DynamoDB → `mcp-poc-payments` 테이블 확인

### Vercel 배포 후 환경변수 적용 안됨

**해결:**
- Vercel Dashboard에서 환경변수 저장 후 반드시 재배포
```bash
vercel --prod
```

## 📞 지원

문제가 계속되면 다음을 확인하세요:

1. CloudWatch Logs에서 Lambda 에러 로그 확인
2. Browser DevTools에서 네트워크 요청 확인
3. MCP 서버 콘솔 로그 확인

---

배포를 완료하셨나요? 🎉 이제 Claude와 함께 현대카드 API를 사용할 준비가 되었습니다!

