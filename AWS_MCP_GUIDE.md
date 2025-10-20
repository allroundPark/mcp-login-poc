# 🚀 AWS MCP 서버 - Claude 연결 가이드 (루나카드)

## ✅ 배포 완료!

MCP 서버가 AWS Lambda + API Gateway에 성공적으로 배포되었습니다!

---

## 📋 MCP 서버 정보

**MCP Server URL:**
```
https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com
```

**엔드포인트:**
- `GET /health` - 헬스체크
- `GET /mcp/info` - MCP 서버 정보
- `GET /mcp/tools` - 사용 가능한 툴 목록
- `POST /mcp` - MCP 프로토콜 메시지 처리 (JSON-RPC 2.0)

---

## 🔗 Claude에 연결하기

### 1단계: Claude 설정 열기

#### Pro/Max 사용자:
1. https://claude.ai 접속
2. **Settings (⚙️)** → **Connectors**

#### Team/Enterprise 사용자:
1. **Admin settings** → **Connectors**

### 2단계: 커스텀 커넥터 추가

1. **"Add custom connector"** 클릭
2. **Server URL 입력**:
   ```
   https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com
   ```
3. **"Add"** 클릭

### 3단계: 커넥터 활성화

1. 새 채팅 시작
2. 좌측 하단 **"Search and tools"** 버튼 (🔍) 클릭
3. **"Luna Card MCP Server"** 토글을 **ON**으로 변경

### 4단계: 테스트!

채팅창에 다음과 같이 입력해보세요:

```
루나카드 상품을 알려줘
```

또는

```
금융 상품 목록을 보여줘
```

✅ Claude가 자동으로 `getPublicContent` 툴을 호출하여 데이터를 가져오면 성공!

---

## 🔒 OAuth 인증 기능 테스트 (결제 내역 조회)

### 테스트 메시지:
```
내 결제 내역을 조회해줘
```

Claude가 다음과 같이 응답합니다:
- OAuth 로그인이 필요하다고 안내
- "Connect" 버튼 표시

**참고:** 현재 OAuth 흐름은 Lambda 환경에서 제한적입니다. 
결제 내역 조회를 위해서는:
1. Cognito에서 테스트 사용자 생성
2. JWT 토큰을 직접 발급받아 Authorization 헤더로 전달

---

## 🧪 수동 테스트 (cURL)

### 1. 헬스체크
```bash
curl https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/health
```

### 2. MCP 서버 정보
```bash
curl https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp/info
```

### 3. 공개 컨텐츠 조회 (카드 상품)
```bash
curl -X POST https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getPublicContent",
      "arguments": {
        "type": "cards"
      }
    }
  }'
```

### 4. 공개 컨텐츠 조회 (금융 상품)
```bash
curl -X POST https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getPublicContent",
      "arguments": {
        "type": "products"
      }
    }
  }'
```

---

## 📊 사용 가능한 툴

### 1. getPublicContent
**설명:** 공개 컨텐츠(카드 또는 상품 정보)를 조회합니다.  
**인증:** 불필요  
**파라미터:**
- `type`: `"cards"` 또는 `"products"`

**예시 응답:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"contentId\": \"card-001\", \"title\": \"루나카드 스타\", ...}]"
      }
    ]
  }
}
```

### 2. getPayments
**설명:** 사용자의 결제 내역을 조회합니다.  
**인증:** 필요 (OAuth JWT 토큰)  
**파라미터:** 없음

**예시 요청 (Authorization 헤더 포함):**
```bash
curl -X POST https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "getPayments",
      "arguments": {}
    }
  }'
```

---

## 🛠 아키텍처

```
┌─────────────────────────────────────────────────┐
│  Claude.ai (웹브라우저)                           │
│  "루나카드 상품 정보 알려줘"                       │
└───────────────┬─────────────────────────────────┘
                │ HTTPS 요청
                ↓
┌─────────────────────────────────────────────────┐
│  API Gateway (AWS)                               │
│  https://3b044wjwkf...amazonaws.com             │
│  - CORS 설정                                     │
│  - 라우팅                                        │
└───────────────┬─────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────┐
│  Lambda Function: mcp-poc-mcp-server            │
│  - MCP 프로토콜 처리 (JSON-RPC 2.0)              │
│  - 툴 실행                                       │
│  - JWT 인증 (선택적)                             │
└───────────────┬─────────────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────────────┐
│  DynamoDB Tables                                 │
│  - mcp-poc-contents (공개 컨텐츠)                │
│  - mcp-poc-payments (결제 내역)                  │
└─────────────────────────────────────────────────┘
```

---

## 💡 장점

### ✅ ngrok 불필요
- 로컬 서버 실행 필요 없음
- 터널링 서비스 불필요
- 항상 접근 가능한 고정 URL

### ✅ AWS 통합
- 기존 인프라와 통합
- Cognito, DynamoDB 직접 사용
- CloudWatch로 로그 확인 가능

### ✅ 서버리스
- 사용한 만큼만 과금
- 자동 스케일링
- 관리 부담 최소화

### ✅ 무료 티어
- Lambda: 월 100만 요청 무료
- API Gateway: 월 100만 API 호출 무료
- DynamoDB: 25GB 저장 무료

---

## 🔧 관리 및 모니터링

### CloudWatch 로그 확인
```bash
# 실시간 로그 확인
aws logs tail /aws/lambda/mcp-poc-mcp-server --follow

# 최근 10분 로그
aws logs tail /aws/lambda/mcp-poc-mcp-server --since 10m
```

### Lambda 함수 업데이트
```bash
cd cdk
cdk deploy
```

### 환경 변수 수정
`cdk/lib/mcp-login-poc-stack.ts` 파일에서 Lambda 환경 변수 수정 후 재배포

---

## 🐛 문제 해결

### "Unable to connect to MCP server"
**원인:** URL이 잘못되었거나 Lambda 함수 오류

**해결:**
1. URL 확인: https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com
2. 헬스체크 확인: `curl https://.../health`
3. CloudWatch 로그 확인

### "Internal Server Error"
**원인:** Lambda 함수 내부 오류

**해결:**
```bash
aws logs tail /aws/lambda/mcp-poc-mcp-server --since 5m
```
로그에서 에러 메시지 확인

### Claude에서 툴이 표시되지 않음
**원인:** 커넥터가 활성화되지 않음

**해결:**
1. 채팅 좌측 하단 "Search and tools" 클릭
2. "Luna Card MCP Server" 토글 확인
3. OFF라면 ON으로 변경

---

## 📈 다음 단계

### 프로덕션 준비
1. **OAuth 완전 구현** - Lambda에서 OAuth 흐름 지원
2. **Rate Limiting** - API Gateway에 요청 제한 추가
3. **모니터링** - CloudWatch 알람 설정
4. **보안** - API Key 또는 JWT 인증 강화

### 기능 확장
1. **새로운 툴 추가** - Lambda 코드에 툴 추가
2. **다른 AWS 서비스 통합** - S3, RDS 등
3. **커스텀 도메인** - Route 53으로 예쁜 URL 설정

---

## 🎉 완료!

이제 Claude에서 루나카드 API를 사용할 수 있습니다!

**테스트 메시지:**
```
"루나카드 상품 목록을 알려줘"
"루나카드에 대해 설명해줘"
"금융 상품 중 추천해줘"
```

---

## 📚 참고 자료

- [Claude Custom Connectors 가이드](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [AWS Lambda 문서](https://docs.aws.amazon.com/lambda/)
- [API Gateway 문서](https://docs.aws.amazon.com/apigateway/)

