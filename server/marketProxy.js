/**
 * GoldScope Market Proxy v2.41.6.5.9
 *
 * Scope fix:
 * - Do NOT proxy all /api routes.
 * - Vite should proxy only:
 *   /api/oanda, /api/yahoo, /api/stooq, /api/market
 * This prevents breaking other internal routes such as Ollama/internal proxy.
 *
 * Market routes:
 * - /api/oanda/candles
 * - /api/oanda/pricing
 * - /api/yahoo/*
 * - /api/stooq/*
 * - /api/market/health
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DEFAULT_SECRETS_PATH =
  process.platform === "win32"
    ? "C:\\src\\Gold\\_local_secrets\\credentials.txt"
    : path.join(os.homedir(), ".goldscope", "credentials.txt");

const LOCAL_SECRETS_PATH = process.env.GOLDSCOPE_CREDENTIALS_FILE || DEFAULT_SECRETS_PATH;

function parseCredentialsText(raw = "") {
  const out = {};
  for (const line of String(raw).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }
  return out;
}

function readLocalCredentials(filePath = LOCAL_SECRETS_PATH) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return {};
    return parseCredentialsText(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`[GoldScope Market Proxy] failed to read local credentials file: ${error.message || String(error)}`);
    return {};
  }
}

const LOCAL_CREDS = readLocalCredentials();

const PORT = Number(process.env.MARKET_PROXY_PORT || process.env.OANDA_PROXY_PORT || LOCAL_CREDS.MARKET_PROXY_PORT || 8787);
const TOKEN = process.env.OANDA_API_TOKEN || LOCAL_CREDS.OANDA_API_TOKEN || LOCAL_CREDS.OANDA_TOKEN || "";
const ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID || LOCAL_CREDS.OANDA_ACCOUNT_ID || "";
const OANDA_ENV = String(process.env.OANDA_ENV || LOCAL_CREDS.OANDA_ENV || "practice").toLowerCase();
const OANDA_HOST = OANDA_ENV === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";

const send = (res, status, body, contentType = "application/json; charset=utf-8") => {
  res.writeHead(status, {
    "content-type": contentType,
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,OPTIONS",
    "access-control-allow-headers": "content-type,authorization",
    "cache-control": "no-store",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
};

const json = (res, status, payload) => send(res, status, payload);

const safeText = async (response) => {
  try {
    return await response.text();
  } catch (error) {
    return `Failed to read upstream body: ${error.message || String(error)}`;
  }
};

const requireOandaConfig = (res) => {
  if (!TOKEN || !ACCOUNT_ID) {
    json(res, 503, {
      error: "OANDA proxy is not configured.",
      provider: "OANDA",
      requiredEnv: ["OANDA_API_TOKEN", "OANDA_ACCOUNT_ID"],
      note: "Set OANDA credentials in the backend environment. React must not contain OANDA credentials.",
    });
    return false;
  }
  return true;
};

async function callOanda(path) {
  const response = await fetch(`${OANDA_HOST}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
    },
  });

  const text = await safeText(response);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const msg = body?.errorMessage || body?.error || body?.raw || `HTTP ${response.status}`;
    throw new Error(`OANDA HTTP ${response.status}: ${String(msg).slice(0, 400)}`);
  }

  return body;
}

async function fetchFirstSuccessfulJson(urls, headers = {}) {
  const attempts = [];

  for (const target of urls) {
    try {
      const upstream = await fetch(target, { headers });
      const text = await safeText(upstream);

      if (!upstream.ok) {
        attempts.push({ target, ok: false, status: upstream.status, body: text.slice(0, 240) });
        continue;
      }

      if (/^\s*</.test(text)) {
        attempts.push({ target, ok: false, status: upstream.status, body: "HTML response instead of JSON" });
        continue;
      }

      try {
        JSON.parse(text);
      } catch {
        attempts.push({ target, ok: false, status: upstream.status, body: `Non-JSON: ${text.slice(0, 240)}` });
        continue;
      }

      return { text, contentType: upstream.headers.get("content-type") || "application/json; charset=utf-8", attempts };
    } catch (error) {
      attempts.push({ target, ok: false, status: "network_error", body: error.message || String(error) });
    }
  }

  const detail = attempts.map((a) => `${a.status} ${a.target} ${a.body}`).join(" | ");
  throw new Error(`All JSON upstream attempts failed: ${detail}`);
}

async function fetchFirstSuccessfulText(urls, headers = {}) {
  const attempts = [];

  for (const target of urls) {
    try {
      const upstream = await fetch(target, { headers });
      const text = await safeText(upstream);

      if (!upstream.ok) {
        attempts.push({ target, ok: false, status: upstream.status, body: text.slice(0, 240) });
        continue;
      }

      if (/^\s*</.test(text)) {
        attempts.push({ target, ok: false, status: upstream.status, body: "HTML response instead of CSV/text" });
        continue;
      }

      return { text, contentType: upstream.headers.get("content-type") || "text/plain; charset=utf-8", attempts };
    } catch (error) {
      attempts.push({ target, ok: false, status: "network_error", body: error.message || String(error) });
    }
  }

  const detail = attempts.map((a) => `${a.status} ${a.target} ${a.body}`).join(" | ");
  throw new Error(`All text upstream attempts failed: ${detail}`);
}

async function proxyYahoo(reqUrl, res) {
  const prefix = "/api/yahoo/";
  const yahooPath = reqUrl.pathname.slice(prefix.length);
  const search = reqUrl.search || "";

  const targets = [
    `https://query1.finance.yahoo.com/${yahooPath}${search}`,
    `https://query2.finance.yahoo.com/${yahooPath}${search}`,
  ];

  try {
    const result = await fetchFirstSuccessfulJson(targets, {
      Accept: "application/json,text/plain,*/*",
      "user-agent": "Mozilla/5.0 GoldScopeMarketProxy/1.0",
    });
    send(res, 200, result.text, result.contentType);
  } catch (error) {
    json(res, 502, {
      error: "Yahoo proxy failed.",
      message: error.message || String(error),
      hint: "If this continues, use OANDA credentials or another market data provider.",
    });
  }
}

async function proxyStooq(reqUrl, res) {
  const prefix = "/api/stooq/";
  const stooqPath = reqUrl.pathname.slice(prefix.length);
  const search = reqUrl.search || "";

  const targets = [
    `https://stooq.com/${stooqPath}${search}`,
    `https://stooq.pl/${stooqPath}${search}`,
  ];

  try {
    const result = await fetchFirstSuccessfulText(targets, {
      Accept: "text/csv,text/plain,*/*",
      "user-agent": "Mozilla/5.0 GoldScopeMarketProxy/1.0",
    });
    send(res, 200, result.text, result.contentType);
  } catch (error) {
    json(res, 502, {
      error: "Stooq proxy failed.",
      message: error.message || String(error),
      hint: "If this continues, configure OANDA or add another fallback provider.",
    });
  }
}

async function handleOanda(reqUrl, res) {
  if (reqUrl.pathname === "/api/oanda/candles") {
    if (!requireOandaConfig(res)) return;
    const instrument = reqUrl.searchParams.get("instrument") || "XAU_USD";
    const granularity = reqUrl.searchParams.get("granularity") || "H1";
    const count = Math.min(5000, Math.max(10, Number(reqUrl.searchParams.get("count") || 600)));
    const path = `/v3/instruments/${encodeURIComponent(instrument)}/candles?price=M&granularity=${encodeURIComponent(granularity)}&count=${encodeURIComponent(count)}`;
    const body = await callOanda(path);
    json(res, 200, { ...body, source: "OANDA", instrument, granularity, proxyGeneratedAt: new Date().toISOString() });
    return;
  }

  if (reqUrl.pathname === "/api/oanda/pricing") {
    if (!requireOandaConfig(res)) return;
    const instrument = reqUrl.searchParams.get("instrument") || "XAU_USD";
    const path = `/v3/accounts/${encodeURIComponent(ACCOUNT_ID)}/pricing?instruments=${encodeURIComponent(instrument)}`;
    const body = await callOanda(path);
    json(res, 200, { ...body, source: "OANDA", instrument, proxyGeneratedAt: new Date().toISOString() });
    return;
  }

  json(res, 404, { error: "Unknown OANDA proxy endpoint." });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      json(res, 204, {});
      return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (reqUrl.pathname === "/health" || reqUrl.pathname === "/api/market/health") {
      json(res, 200, {
        ok: true,
        name: "GoldScope Market Proxy",
        version: "v2.41.6.5.9",
        oandaEnv: OANDA_ENV,
        oandaConfigured: Boolean(TOKEN && ACCOUNT_ID),
        oandaCandlesOk: null,
        oandaPricingOk: null,
        oandaHealthNote: "Detailed OANDA probe is available in embedded Vite proxy health route.",
        credentialsFile: LOCAL_SECRETS_PATH,
        credentialsFileLoaded: Boolean(Object.keys(LOCAL_CREDS).length),
        scope: "market-only",
        routes: ["/api/oanda/candles", "/api/oanda/pricing", "/api/yahoo/*", "/api/stooq/*"],
        note: "Do not proxy all /api here; other app routes such as Ollama should remain separate.",
      });
      return;
    }

    if (reqUrl.pathname.startsWith("/api/oanda/")) {
      await handleOanda(reqUrl, res);
      return;
    }

    if (reqUrl.pathname.startsWith("/api/yahoo/")) {
      await proxyYahoo(reqUrl, res);
      return;
    }

    if (reqUrl.pathname.startsWith("/api/stooq/")) {
      await proxyStooq(reqUrl, res);
      return;
    }

    json(res, 404, {
      error: "Unknown market proxy route.",
      path: reqUrl.pathname,
      supported: ["/api/oanda/*", "/api/yahoo/*", "/api/stooq/*", "/api/market/health"],
    });
  } catch (error) {
    json(res, 502, {
      error: error.message || String(error),
      proxy: "GoldScope Market Proxy",
      version: "v2.41.6.5.9",
    });
  }
});

server.listen(PORT, () => {
  console.log(`[GoldScope Market Proxy] listening on http://localhost:${PORT}`);
  console.log(`[GoldScope Market Proxy] version=v2.41.6.5.9 scope=market-only`);
  console.log(`[GoldScope Market Proxy] OANDA env=${OANDA_ENV} configured=${Boolean(TOKEN && ACCOUNT_ID)}`);
  console.log(`[GoldScope Market Proxy] credentials file=${LOCAL_SECRETS_PATH} loaded=${Boolean(Object.keys(LOCAL_CREDS).length)}`);
});
