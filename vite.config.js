import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
    console.warn(`[GoldScope Vite Market Proxy] failed to read local credentials: ${error.message || String(error)}`);
    return {};
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.setHeader("cache-control", "no-store");
  res.end(text);
}

async function readText(response) {
  try {
    return await response.text();
  } catch (error) {
    return `Failed to read upstream body: ${error.message || String(error)}`;
  }
}

async function fetchFirstSuccessfulJson(urls, headers = {}) {
  const attempts = [];

  for (const target of urls) {
    try {
      const upstream = await fetch(target, { headers });
      const text = await readText(upstream);

      if (!upstream.ok) {
        attempts.push({ target, status: upstream.status, body: text.slice(0, 240) });
        continue;
      }

      if (/^\s*</.test(text)) {
        attempts.push({ target, status: upstream.status, body: "HTML response instead of JSON" });
        continue;
      }

      try {
        JSON.parse(text);
      } catch {
        attempts.push({ target, status: upstream.status, body: `Non-JSON: ${text.slice(0, 240)}` });
        continue;
      }

      return {
        text,
        contentType: upstream.headers.get("content-type") || "application/json; charset=utf-8",
      };
    } catch (error) {
      attempts.push({ target, status: "network_error", body: error.message || String(error) });
    }
  }

  throw new Error(attempts.map((a) => `${a.status} ${a.target} ${a.body}`).join(" | "));
}

async function fetchFirstSuccessfulText(urls, headers = {}) {
  const attempts = [];

  for (const target of urls) {
    try {
      const upstream = await fetch(target, { headers });
      const text = await readText(upstream);

      if (!upstream.ok) {
        attempts.push({ target, status: upstream.status, body: text.slice(0, 240) });
        continue;
      }

      if (/^\s*</.test(text)) {
        attempts.push({ target, status: upstream.status, body: "HTML response instead of CSV/text" });
        continue;
      }

      return {
        text,
        contentType: upstream.headers.get("content-type") || "text/plain; charset=utf-8",
      };
    } catch (error) {
      attempts.push({ target, status: "network_error", body: error.message || String(error) });
    }
  }

  throw new Error(attempts.map((a) => `${a.status} ${a.target} ${a.body}`).join(" | "));
}

function marketProxyPlugin() {
  const localCreds = readLocalCredentials();
  const token = process.env.OANDA_API_TOKEN || localCreds.OANDA_API_TOKEN || localCreds.OANDA_TOKEN || "";
  const accountId = process.env.OANDA_ACCOUNT_ID || localCreds.OANDA_ACCOUNT_ID || "";
  const oandaEnv = String(process.env.OANDA_ENV || localCreds.OANDA_ENV || "practice").toLowerCase();
  const oandaHost = oandaEnv === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";

  async function callOanda(pathname) {
    const upstream = await fetch(`${oandaHost}${pathname}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await readText(upstream);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    if (!upstream.ok) {
      const msg = body?.errorMessage || body?.error || body?.raw || `HTTP ${upstream.status}`;
      throw new Error(`OANDA HTTP ${upstream.status}: ${String(msg).slice(0, 400)}`);
    }

    return body;
  }

  return {
    name: "goldscope-embedded-market-proxy",
    configureServer(server) {
      console.log(`[GoldScope Vite Market Proxy] embedded route active`);
      console.log(`[GoldScope Vite Market Proxy] credentials file=${LOCAL_SECRETS_PATH} loaded=${Boolean(Object.keys(localCreds).length)}`);
      console.log(`[GoldScope Vite Market Proxy] OANDA env=${oandaEnv} configured=${Boolean(token && accountId)}`);

      server.middlewares.use(async (req, res, next) => {
        try {
          if (!req.url || !req.url.startsWith("/api/")) return next();

          const requestUrl = new URL(req.url, "http://localhost");

          if (requestUrl.pathname === "/api/market/health") {
            sendJson(res, 200, {
              ok: true,
              name: "GoldScope Embedded Vite Market Proxy",
              version: "v2.41.6.5.8",
              embeddedInVite: true,
              oandaEnv,
              oandaConfigured: Boolean(token && accountId),
              credentialsFile: LOCAL_SECRETS_PATH,
              credentialsFileLoaded: Boolean(Object.keys(localCreds).length),
              routes: ["/api/oanda/candles", "/api/oanda/pricing", "/api/yahoo/*", "/api/stooq/*"],
            });
            return;
          }

          if (requestUrl.pathname === "/api/oanda/candles") {
            if (!token || !accountId) {
              sendJson(res, 503, {
                error: "OANDA credentials are not configured.",
                required: ["OANDA_API_TOKEN", "OANDA_ACCOUNT_ID"],
                credentialsFile: LOCAL_SECRETS_PATH,
                credentialsFileLoaded: Boolean(Object.keys(localCreds).length),
              });
              return;
            }

            const instrument = requestUrl.searchParams.get("instrument") || "XAU_USD";
            const granularity = requestUrl.searchParams.get("granularity") || "H1";
            const count = Math.min(5000, Math.max(10, Number(requestUrl.searchParams.get("count") || 600)));
            const body = await callOanda(`/v3/instruments/${encodeURIComponent(instrument)}/candles?price=M&granularity=${encodeURIComponent(granularity)}&count=${encodeURIComponent(count)}`);
            sendJson(res, 200, { ...body, source: "OANDA", instrument, granularity, proxyGeneratedAt: new Date().toISOString() });
            return;
          }

          if (requestUrl.pathname === "/api/oanda/pricing") {
            if (!token || !accountId) {
              sendJson(res, 503, {
                error: "OANDA credentials are not configured.",
                required: ["OANDA_API_TOKEN", "OANDA_ACCOUNT_ID"],
                credentialsFile: LOCAL_SECRETS_PATH,
                credentialsFileLoaded: Boolean(Object.keys(localCreds).length),
              });
              return;
            }

            const instrument = requestUrl.searchParams.get("instrument") || "XAU_USD";
            const body = await callOanda(`/v3/accounts/${encodeURIComponent(accountId)}/pricing?instruments=${encodeURIComponent(instrument)}`);
            sendJson(res, 200, { ...body, source: "OANDA", instrument, proxyGeneratedAt: new Date().toISOString() });
            return;
          }

          if (requestUrl.pathname.startsWith("/api/yahoo/")) {
            const yahooPath = requestUrl.pathname.slice("/api/yahoo/".length);
            const targets = [
              `https://query1.finance.yahoo.com/${yahooPath}${requestUrl.search}`,
              `https://query2.finance.yahoo.com/${yahooPath}${requestUrl.search}`,
            ];

            try {
              const result = await fetchFirstSuccessfulJson(targets, {
                Accept: "application/json,text/plain,*/*",
                "user-agent": "Mozilla/5.0 GoldScopeViteMarketProxy/1.0",
              });
              sendText(res, 200, result.text, result.contentType);
            } catch (error) {
              sendJson(res, 502, {
                error: "Yahoo proxy failed.",
                message: error.message || String(error),
              });
            }
            return;
          }

          if (requestUrl.pathname.startsWith("/api/stooq/")) {
            const stooqPath = requestUrl.pathname.slice("/api/stooq/".length);
            const targets = [
              `https://stooq.com/${stooqPath}${requestUrl.search}`,
              `https://stooq.pl/${stooqPath}${requestUrl.search}`,
            ];

            try {
              const result = await fetchFirstSuccessfulText(targets, {
                Accept: "text/csv,text/plain,*/*",
                "user-agent": "Mozilla/5.0 GoldScopeViteMarketProxy/1.0",
              });
              sendText(res, 200, result.text, result.contentType);
            } catch (error) {
              sendJson(res, 502, {
                error: "Stooq proxy failed.",
                message: error.message || String(error),
              });
            }
            return;
          }

          return next();
        } catch (error) {
          sendJson(res, 502, {
            error: error.message || String(error),
            proxy: "GoldScope Embedded Vite Market Proxy",
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), marketProxyPlugin()],
});
