# MCP 서버 - 루나카드 POC

Claude와 통합하여 OAuth 인증을 통해 루나카드 API에 접근하는 Remote MCP 서버입니다.

## 설치 및 실행

```bash
# 패키지 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 CDK 배포 후 받은 값들로 수정

# 서버 실행
npm start

# 또는 개발 모드 (자동 재시작)
npm run dev
```

## 엔드포인트

- `GET /mcp/info` - MCP 서버 메타데이터 및 OAuth 설정
- `GET /mcp/tools` - 사용 가능한 툴 목록
- `POST /mcp/execute` - 툴 실행
- `GET /oauth/authorize` - OAuth 로그인 시작
- `GET /oauth/callback` - OAuth 콜백
- `GET /health` - 헬스체크

## 사용 가능한 툴

### 1. getPublicContent

공개 컨텐츠(카드 또는 금융 상품)를 조회합니다.

**파라미터:**
- `type`: `"cards"` 또는 `"products"`

**예제 요청:**
```json
{
  "tool": "getPublicContent",
  "arguments": {
    "type": "cards"
  }
}
```

### 2. getPayments

사용자의 결제 내역을 조회합니다. (OAuth 인증 필요)

**파라미터:** 없음

**예제 요청:**
```json
{
  "tool": "getPayments",
  "arguments": {},
  "access_token": "your-access-token-here"
}
```

## OAuth 인증 흐름

1. 브라우저에서 `http://localhost:4000/oauth/authorize` 접속
2. Cognito Hosted UI로 리다이렉트
3. 사용자 ID/비밀번호 입력
4. 콜백 페이지에서 Access Token 확인
5. Access Token을 복사하여 `getPayments` 호출 시 사용

## Cursor/Claude 연결

1. MCP 서버 실행
2. Cursor 설정에서 MCP 서버 추가:
   - URL: `http://localhost:4000`
   - OAuth 지원: 활성화

3. Claude 대화에서 사용:
   ```
   "루나카드 상품 목록을 보여줘"
   → getPublicContent 자동 호출

   "내 결제내역을 보여줘"
   → OAuth 로그인 팝업 → getPayments 호출
   ```

## 개발 참고사항

- 토큰 저장: 현재는 메모리에 임시 저장 (프로덕션에서는 Redis 등 사용)
- PKCE: Authorization Code Flow with PKCE 사용
- CORS: 모든 오리진 허용 (프로덕션에서는 제한 필요)

