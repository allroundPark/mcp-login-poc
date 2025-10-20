#!/bin/bash

echo "🔍 Lambda 로그 확인 중..."
echo "=================================="
echo ""

# 최근 5분 로그 가져오기
aws logs tail /aws/lambda/mcp-poc-mcp-server --since 5m --format short | grep -A 30 "🔍 FULL REQUEST DEBUG"

echo ""
echo "=================================="
echo "📊 요청 요약:"
echo ""

# 메서드별 카운트
aws logs tail /aws/lambda/mcp-poc-mcp-server --since 5m --format short | grep "Method:" | sort | uniq -c

echo ""
echo "📋 호출된 JSON-RPC 메서드:"
echo ""

# JSON-RPC 메서드 추출
aws logs tail /aws/lambda/mcp-poc-mcp-server --since 5m --format short | grep '"method"' | sed 's/.*"method"[: ]*"\([^"]*\)".*/\1/' | sort | uniq -c

