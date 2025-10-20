#!/usr/bin/env node

const http = require('http');
const https = require('https');

const AWS_ENDPOINT = 'https://3b044wjwkf.execute-api.ap-northeast-2.amazonaws.com';
const PORT = 3001;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // AWS Lambda로 프록시
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    const url = new URL(req.url, AWS_ENDPOINT);
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      }
    };

    const proxyReq = https.request(url, options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'],
        ...res.getHeaders()
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
    });

    if (body) {
      proxyReq.write(body);
    }
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 MCP Proxy Server running!`);
  console.log(`\n📍 Local URL: http://localhost:${PORT}`);
  console.log(`🔗 Proxying to: ${AWS_ENDPOINT}`);
  console.log(`\n💡 Claude에서 이 URL을 사용하세요:`);
  console.log(`   http://localhost:${PORT}/message`);
  console.log(`\n테스트:`);
  console.log(`   curl http://localhost:${PORT}/health\n`);
});

