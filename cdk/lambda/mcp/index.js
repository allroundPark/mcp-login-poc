const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const CONTENTS_TABLE = process.env.CONTENTS_TABLE;
const PAYMENTS_TABLE = process.env.PAYMENTS_TABLE;

// MCP 툴 정의
const tools = [
  {
    name: 'getPublicContent',
    description: 'Get Luna Card product information or financial product details from database',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['cards', 'products'],
          description: 'Type of content - cards: Luna Card products, products: Financial products',
        },
      },
      required: ['type'],
    },
  },
  {
    name: 'getPayments',
    description: 'Get user payment history (requires OAuth authentication)',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

exports.handler = async (event) => {
  console.log('========================================');
  console.log('🔍 FULL REQUEST DEBUG');
  console.log('========================================');
  console.log('Method:', event.requestContext?.http?.method || event.httpMethod);
  console.log('Path:', event.rawPath || event.path);
  console.log('Headers:', JSON.stringify(event.headers || {}, null, 2));
  console.log('Query:', JSON.stringify(event.queryStringParameters || {}, null, 2));
  console.log('Body:', event.body);
  console.log('User-Agent:', event.headers?.['user-agent'] || event.headers?.['User-Agent']);
  console.log('========================================');

  const path = event.rawPath || event.path;
  // Claude Desktop 호환을 위해 /message 를 /mcp 와 동일하게 처리
  const normalizedPath = path === '/message' ? '/mcp' : path;
  const method = event.requestContext?.http?.method || event.httpMethod;

  // CORS 헤더 - Claude Desktop/웹 모두 허용 (Credentials 미사용)
  const requestOrigin = event.headers?.origin || event.headers?.Origin || '';
  const allowedOrigins = new Set([
    'https://claude.ai',
    'http://localhost:3001',
    'http://localhost:4000',
    'app://-'
  ]);
  const allowOriginHeader = allowedOrigins.has(requestOrigin) ? requestOrigin : '*';
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOriginHeader,
    'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version, Anthropic-Beta, Accept, Origin, User-Agent',
    // Credentials 는 '*' 와 함께 사용할 수 없으므로 제외
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  // HEAD 요청 처리 (서버 검증용)
  if (method === 'HEAD') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders,
      },
      body: '',
    };
  }

  try {
    // GET / - 루트 경로 (Claude 연결 검증용)
    if ((normalizedPath === '/' || normalizedPath === '') && method === 'GET') {
      // SSE 요청은 /mcp/sse로 리다이렉트 안내
      const acceptHeader = event.headers?.['accept'] || event.headers?.['Accept'] || '';
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          ...corsHeaders,
        },
        body: JSON.stringify({
          name: 'Luna Card MCP Server',
          version: '1.0.0',
          description: 'MCP Server for Luna Card POC with OAuth integration',
          protocolVersion: '2025-06-18',
          transport: 'http',
          capabilities: {
            tools: {
              listChanged: true
            },
          },
          endpoints: {
            jsonrpc: '/mcp',
            info: '/mcp/info',
            tools: '/mcp/tools',
          },
          instructions: 'Use POST /mcp for JSON-RPC 2.0 requests',
        }),
      };
    }

    // GET /mcp/info - MCP 서버 메타데이터
    if (normalizedPath === '/mcp/info' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
        body: JSON.stringify({
          name: 'Luna Card MCP Server',
          version: '1.0.0',
          description: 'MCP Server for Luna Card POC with OAuth integration',
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {
              listChanged: true
            },
          },
          tools: tools,
        }),
      };
    }

    // GET /mcp/tools - 툴 목록
    if (normalizedPath === '/mcp/tools' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
        body: JSON.stringify({ tools }),
      };
    }

    // GET /mcp - MCP 서버 메타데이터 (Claude 검증용)
    if (normalizedPath === '/mcp' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
        body: JSON.stringify({
          name: 'Luna Card MCP Server',
          version: '1.0.0',
          description: 'MCP Server for Luna Card POC with OAuth integration',
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {
              listChanged: true
            },
          },
        }),
      };
    }

    // POST /mcp - MCP 프로토콜 메시지 처리
    if (normalizedPath === '/mcp' && method === 'POST') {
      const message = JSON.parse(event.body || '{}');
      console.log('MCP Message:', message);

      // Initialize 요청
      if (message.method === 'initialize') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2025-06-18',
            serverInfo: {
              name: 'Luna Card MCP Server',
              version: '1.0.0',
            },
            capabilities: {
              tools: {
                listChanged: true
              },
            },
            tools: tools,
          },
        }),
      };
      }

      // Initialized notification (응답 불필요, 200 OK만)
      if (message.method === 'notifications/initialized') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...corsHeaders,
          },
          body: JSON.stringify({ success: true }),
        };
      }

      // Tools list 요청
      if (message.method === 'tools/list') {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...corsHeaders,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              tools: tools,
            },
          }),
        };
      }

      // Tool 실행 요청
      if (message.method === 'tools/call') {
        const { name, arguments: args } = message.params;
        const authorization = event.headers?.authorization || event.headers?.Authorization;
        const access_token = authorization?.replace('Bearer ', '');

        console.log(`Tool 실행: ${name}`, args);

        // getPublicContent 툴
        if (name === 'getPublicContent') {
          const { type } = args;
          const typeValue = type === 'cards' ? 'card' : 'product';

          const result = await docClient.send(
            new QueryCommand({
              TableName: CONTENTS_TABLE,
              IndexName: 'type-index',
              KeyConditionExpression: '#type = :type',
              ExpressionAttributeNames: {
                '#type': 'type',
              },
              ExpressionAttributeValues: {
                ':type': typeValue,
              },
            })
          );

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...corsHeaders,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result.Items || [], null, 2),
                  },
                ],
              },
            }),
          };
        }

        // getPayments 툴
        if (name === 'getPayments') {
          if (!access_token) {
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                ...corsHeaders,
              },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  code: -32001,
                  message: '로그인이 필요합니다. OAuth 인증을 진행해주세요.',
                  data: {
                    auth_required: true,
                  },
                },
              }),
            };
          }

          // JWT에서 userId 추출 (간단한 방법)
          const userId = extractUserIdFromToken(access_token);

          const result = await docClient.send(
            new QueryCommand({
              TableName: PAYMENTS_TABLE,
              KeyConditionExpression: 'userId = :userId',
              ExpressionAttributeValues: {
                ':userId': userId,
              },
            })
          );

          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              ...corsHeaders,
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result.Items || [], null, 2),
                  },
                ],
              },
            }),
          };
        }

        // 툴을 찾을 수 없음
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...corsHeaders,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32601,
              message: `툴 '${name}'을 찾을 수 없습니다.`,
            },
          }),
        };
      }

      // 지원하지 않는 메서드
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }),
      };
    }

    // GET /health - 헬스체크
    if (normalizedPath === '/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          ...corsHeaders,
        },
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    // 404
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders,
      },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
    };
  }
};

// JWT에서 userId (sub) 추출
function extractUserIdFromToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.sub;
  } catch (error) {
    console.error('Token parse error:', error);
    return null;
  }
}

