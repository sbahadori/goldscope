/**
 * GoldScope AI Proxy Server
 * 
 * Fixes CORS issues when calling Ollama, DeepSeek, Groq, OpenRouter
 * from the browser/artifact.
 * 
 * Run: node proxy-server.mjs
 * Then in the artifact set Base URL to: http://localhost:3333
 */

import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const PORT = 3333;

const ALLOWED_TARGETS = {
  ollama:      "http://localhost:11434",
  deepseek:    "https://api.deepseek.com",
  groq:        "https://api.groq.com",
  openrouter:  "https://openrouter.ai",
  together:    "https://api.together.xyz",
  lmstudio:    "http://localhost:1234",
  localai:     "http://localhost:8080",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, HTTP-Referer, X-Title, X-API-Key",
  "Access-Control-Max-Age":       "86400",
};

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${msg}`);
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  // Health check
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      message: "GoldScope AI proxy running",
      port: PORT,
      targets: Object.keys(ALLOWED_TARGETS),
      usage: "POST /proxy/{target}/path  — e.g. /proxy/ollama/api/chat"
    }));
    return;
  }

  // Parse route: /proxy/{target}/{...path}
  const match = req.url.match(/^\/proxy\/([^/]+)(\/.*)?$/);
  if (!match) {
    res.writeHead(404, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unknown route. Use /proxy/{target}/path" }));
    return;
  }

  const targetKey = match[1];
  const forwardPath = match[2] || "/";
  const targetBase = ALLOWED_TARGETS[targetKey];

  if (!targetBase) {
    res.writeHead(400, { ...CORS_HEADERS, "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: `Unknown target: ${targetKey}`,
      available: Object.keys(ALLOWED_TARGETS)
    }));
    return;
  }

  let body = [];
  req.on("data", chunk => body.push(chunk));
  req.on("end", () => {
    const bodyBuf = Buffer.concat(body);
    const targetUrl = new URL(forwardPath, targetBase);

    const isHttps = targetUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const options = {
      hostname: targetUrl.hostname,
      port:     targetUrl.port || (isHttps ? 443 : 80),
      path:     targetUrl.pathname + (targetUrl.search || ""),
      method:   req.method,
      headers:  {}
    };

    // Forward all headers except host
    for (const [k, v] of Object.entries(req.headers)) {
      if (k.toLowerCase() === "host") continue;
      options.headers[k] = v;
    }
    if (bodyBuf.length) {
      options.headers["content-length"] = bodyBuf.length;
    }

    log(`→ ${targetKey} ${req.method} ${forwardPath}`);

    const proxyReq = transport.request(options, proxyRes => {
      const statusCode = proxyRes.statusCode || 500;
      log(`← ${targetKey} ${statusCode}`);

      const responseHeaders = { ...CORS_HEADERS };
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (k.toLowerCase() === "access-control-allow-origin") continue;
        responseHeaders[k] = v;
      }

      res.writeHead(statusCode, responseHeaders);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", err => {
      log(`✗ ${targetKey} error: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { ...CORS_HEADERS, "Content-Type": "application/json" });
      }
      const msg = targetKey === "ollama" || targetKey === "lmstudio" || targetKey === "localai"
        ? `Cannot reach ${targetKey} at ${targetBase}. Make sure it is running locally.`
        : `Cannot reach ${targetKey}: ${err.message}`;
      res.end(JSON.stringify({ error: msg, target: targetKey, base: targetBase }));
    });

    if (bodyBuf.length) proxyReq.write(bodyBuf);
    proxyReq.end();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("=".repeat(52));
  console.log("  GoldScope AI Proxy Server");
  console.log("=".repeat(52));
  console.log(`  Listening on : http://localhost:${PORT}`);
  console.log(`  Health check : http://localhost:${PORT}/health`);
  console.log("");
  console.log("  Supported targets:");
  for (const [k, v] of Object.entries(ALLOWED_TARGETS)) {
    console.log(`    /proxy/${k.padEnd(12)} → ${v}`);
  }
  console.log("");
  console.log("  Usage in artifact:");
  console.log(`    Ollama  : http://localhost:${PORT}/proxy/ollama`);
  console.log(`    DeepSeek: http://localhost:${PORT}/proxy/deepseek`);
  console.log(`    Groq    : http://localhost:${PORT}/proxy/groq`);
  console.log(`    OpenRtr : http://localhost:${PORT}/proxy/openrouter`);
  console.log("=".repeat(52));
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n✗ Port ${PORT} is already in use.`);
    console.error(`  Kill the existing process or change PORT at top of file.\n`);
  } else {
    console.error("Server error:", err.message);
  }
  process.exit(1);
});
