const BASE = process.env.VITE_BASE_URL || "http://localhost:5173";

async function check(path) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json,text/plain,*/*" } });
    const text = await res.text();
    console.log(`\n${url}`);
    console.log(`HTTP ${res.status}`);
    console.log(text.slice(0, 900));
    return res.ok;
  } catch (error) {
    console.log(`\n${url}`);
    console.log(`NETWORK ERROR: ${error.message || String(error)}`);
    return false;
  }
}

await check("/api/market/health");
await check("/api/oanda/candles?instrument=XAU_USD&granularity=H1&count=3");
await check("/api/yahoo/v8/finance/chart/GC=F?range=5d&interval=1h");
await check("/api/stooq/q/d/l/?s=xauusd&i=d");
