# 🔧 Claude.ai 커넥터 토글 활성화 문제 해결

## ✅ 확인된 사항

- ✅ 서버 정상 작동
- ✅ MCP 프로토콜 완벽 준수
- ✅ Tools 2개 정의 및 테스트 완료
- ✅ Pro 계정 확인
- ✅ 커넥터 등록 성공

## 🔴 문제

- ❌ "Search and tools"에서 토글이 회색 비활성 상태

---

## 💡 해결 방법 시도

### 방법 1: 브라우저 완전 초기화

1. **시크릿/프라이빗 모드**로 Claude.ai 접속
   - Chrome: `Cmd+Shift+N` (Mac) / `Ctrl+Shift+N` (Windows)
   - Safari: `Cmd+Shift+N`

2. 로그인 후 커넥터 추가 재시도

### 방법 2: 다른 브라우저 시도

- Chrome에서 안 되면 → Safari
- Safari에서 안 되면 → Firefox

### 방법 3: 캐시 완전 삭제

**Chrome:**
1. `Cmd+Shift+Delete` (Mac) / `Ctrl+Shift+Delete` (Windows)
2. "전체 기간" 선택
3. "쿠키 및 사이트 데이터", "캐시된 이미지/파일" 체크
4. "데이터 삭제"
5. 브라우저 재시작

**Safari:**
1. Safari → 환경설정 → 개인 정보 보호
2. "웹사이트 데이터 관리"
3. "claude.ai" 검색 → 삭제
4. Safari 재시작

### 방법 4: 커넥터 URL 변경 시도

다음 URL들을 순서대로 시도:

```
# 시도 1: 기본
https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp

# 시도 2: 루트 (Discovery)
https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/

# 시도 3: SSE
https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp/sse

# 시도 4: Info
https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp/info
```

---

## 🆘 여전히 안 되면

### Claude 지원팀 문의

**이메일:** support@anthropic.com

**제목:** Custom Connector toggle not activating (Pro account)

**내용:**
```
Hello,

I'm a Claude Pro subscriber trying to add a custom MCP connector, 
but the toggle in "Search and tools" remains grayed out.

Server URL: https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp

The server responds correctly:
- GET /mcp returns server info with tools array
- POST /mcp initialize returns tools in result
- All MCP protocol requirements are met

Account: Pro
Browser: [Chrome/Safari]
UUID: 15482838-ca4c-487e-93fb-c3a2e581d898

Could you please investigate why the tools are not activating?

Thank you!
```

---

## 🎯 대안: Claude Desktop 사용

Claude.ai 웹이 안 되면 **Claude Desktop**을 사용하세요.

### 설정 방법

**1. Claude Desktop 설치**
https://claude.ai/download

**2. 프록시 서버 실행** (로컬)

```bash
cd "/Users/duru/Documents/현대카드/MCP Login Poc"
node mcp-proxy.js
```

**3. Claude Desktop 설정**

`~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "luna-card": {
      "command": "node",
      "args": [
        "/Users/duru/Documents/현대카드/MCP Login Poc/mcp-proxy.js"
      ]
    }
  }
}
```

**4. Claude Desktop 재시작**

---

## 📊 서버 상태 확인

언제든지 서버가 정상인지 확인:

```bash
# 서버 정보
curl https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp | jq .

# Initialize 테스트
curl -X POST https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' \
  | jq .

# Tools 호출 테스트
curl -X POST https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"getPublicContent","arguments":{"type":"cards"}}}' \
  | jq .
```

모두 정상 응답이 나오면 **서버는 문제없습니다**.

---

## 📝 기록

**날짜:** 2025-10-20  
**문제:** Pro 계정인데 커넥터 토글 비활성  
**서버 상태:** 정상  
**시도한 것:** 모든 MCP 스펙 준수, 다양한 엔드포인트 추가, initialize에 tools 포함

**결론:** Claude.ai 웹 플랫폼의 알 수 없는 제한 또는 버그로 추정


