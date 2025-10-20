# 🚀 Render.com에 MCP 서버 배포하기 - 루나카드

## ✅ 준비 완료!

모든 설정 파일이 준비되었습니다:
- ✅ `render.yaml` - Render 설정 파일
- ✅ `.env.example` - 환경 변수 예시
- ✅ `.gitignore` - Git 제외 파일
- ✅ `server.js` - Remote MCP 표준 적용

---

## 📝 1단계: Git 커밋 & 푸시

```bash
# 1. 변경사항 확인
git status

# 2. 커밋
git commit -m "Add MCP server with Remote MCP protocol support"

# 3. GitHub에 푸시
git push origin main
```

---

## 🌐 2단계: Render.com 배포

### 1. Render.com 접속
👉 https://render.com 접속 → **Sign Up** (GitHub로 가입 추천)

### 2. New Web Service 생성

1. 대시보드에서 **"New +"** 클릭
2. **"Web Service"** 선택
3. **"Connect a repository"** → GitHub 저장소 연결
4. 이 프로젝트 저장소 선택

### 3. 설정 입력

**Blueprint 감지됨!** 
- `render.yaml` 파일이 자동으로 감지됩니다
- **"Apply"** 클릭하면 자동 설정 완료

**또는 수동 설정:**

| 항목 | 값 |
|------|------|
| **Name** | `luna-mcp-server` |
| **Region** | Singapore (또는 가장 가까운 지역) |
| **Branch** | `main` |
| **Root Directory** | `mcp-server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### 4. 환경 변수 설정

**Environment Variables** 섹션에서 다음 추가:

```
PORT = 4000
COGNITO_DOMAIN = mcp-poc-252610433235.auth.ap-northeast-2.amazoncognito.com
COGNITO_CLIENT_ID = 4gojdp451p4pc34kk4q11i4lip
API_BASE_URL = https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com
COGNITO_REDIRECT_URI = https://luna-mcp-server.onrender.com/oauth/callback
```

**중요:** `COGNITO_REDIRECT_URI`는 배포 후 받은 URL로 업데이트하세요!

### 5. 배포 시작

**"Create Web Service"** 클릭 → 자동 배포 시작! 🚀

배포 시간: **약 2-3분**

---

## 📋 3단계: 배포 완료 후 설정

### 1. URL 확인

배포가 완료되면 URL이 생성됩니다:
```
https://luna-mcp-server.onrender.com
```

### 2. Cognito Redirect URI 업데이트

#### A. Render 환경 변수 업데이트
1. Render Dashboard → 프로젝트 선택
2. **Environment** 탭
3. `COGNITO_REDIRECT_URI` 값을 업데이트:
   ```
   https://luna-mcp-server.onrender.com/oauth/callback
   ```
4. **Save Changes** → 자동 재배포

#### B. AWS Cognito 설정 업데이트
1. AWS Console → Cognito → User Pools
2. `mcp-poc-user-pool` 선택
3. **App integration** 탭
4. `mcp-poc-mcp-server` App client 선택
5. **Edit Hosted UI settings**
6. **Callback URLs**에 추가:
   ```
   https://luna-mcp-server.onrender.com/oauth/callback
   ```
7. **Logout URLs**에 추가:
   ```
   https://luna-mcp-server.onrender.com
   ```
8. **Save changes**

---

## 🧪 4단계: 배포 테스트

### 1. 헬스체크
```bash
curl https://luna-mcp-server.onrender.com/health
```

예상 결과:
```json
{"status":"ok","timestamp":"2025-10-18T..."}
```

### 2. MCP 서버 정보
```bash
curl https://luna-mcp-server.onrender.com/mcp/info
```

### 3. 공개 컨텐츠 조회 테스트
```bash
curl -X POST https://luna-mcp-server.onrender.com/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "getPublicContent",
    "arguments": {
      "type": "cards"
    }
  }'
```

---

## 🔗 5단계: Claude에 연결

### 1. Claude 설정 열기
- **Pro/Max**: Settings → Connectors
- **Team/Enterprise**: Admin settings → Connectors

### 2. 커스텀 커넥터 추가
1. **"Add custom connector"** 클릭
2. **Server URL 입력**:
   ```
   https://luna-mcp-server.onrender.com
   ```
3. **"Add"** 클릭

### 3. 커넥터 활성화
1. 새 채팅 시작
2. 좌측 하단 **"Search and tools"** 버튼 클릭
3. **"Luna Card MCP Server"** 토글 활성화

### 4. 테스트!
```
루나카드 상품 정보를 알려줘
```

✅ Claude가 자동으로 MCP 툴을 호출하면 성공!

---

## 🎯 무료 티어 주의사항

### Render.com 무료 플랜:
- ✅ **무료** HTTPS 제공
- ✅ 자동 SSL 인증서
- ⚠️ **15분간 요청 없으면 자동 슬립**
- ⚠️ 슬립 상태에서 깨어나는 데 **30초~1분** 소요

### 해결 방법:
1. **Render 유료 플랜** ($7/월) → 슬립 없음
2. **Uptime 모니터링** 사용 (예: UptimeRobot) → 5분마다 핑
3. **그냥 사용** → 첫 요청만 느리고 이후는 정상

---

## 🐛 문제 해결

### "Application failed to respond"
- Render 로그 확인: Dashboard → Logs 탭
- 환경 변수가 올바른지 확인
- `package.json`의 `start` 스크립트 확인

### OAuth 인증 실패
- `COGNITO_REDIRECT_URI`가 정확한지 확인
- Cognito Callback URL에 추가했는지 확인
- HTTPS 사용 중인지 확인 (HTTP ❌)

### "Service Unavailable" (슬립 상태)
- 30초~1분 기다린 후 재시도
- 또는 유료 플랜으로 업그레이드

---

## 📊 배포 체크리스트

- [ ] Git 커밋 & 푸시 완료
- [ ] Render.com 계정 생성
- [ ] Web Service 생성 및 배포
- [ ] 환경 변수 설정 (REDIRECT_URI 포함)
- [ ] Cognito Callback URL 업데이트
- [ ] 헬스체크 테스트 성공
- [ ] Claude 커넥터 추가
- [ ] Claude에서 테스트 성공

---

## 🎉 완료!

이제 Claude와 루나카드 MCP 서버가 연결되었습니다!

**다음 사용 예시:**
```
"루나카드 신용카드 상품을 알려줘"
"금융 상품 목록을 보여줘"
"내 결제 내역을 조회해줘" (OAuth 로그인 필요)
```

---

## 📚 추가 자료

- [Render.com 공식 문서](https://render.com/docs)
- [Claude Custom Connectors 가이드](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- [MCP 프로토콜 문서](https://modelcontextprotocol.io)

