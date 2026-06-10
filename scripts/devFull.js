import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

function start(name, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    env: { ...process.env },
  });

  child.on("exit", (code, signal) => {
    if (signal) console.log(`[${name}] exited with signal ${signal}`);
    else console.log(`[${name}] exited with code ${code}`);
  });

  return child;
}

console.log("[GoldScope] starting market proxy + Vite dev server");
console.log("[GoldScope] market proxy health: http://localhost:8787/api/market/health");
console.log("[GoldScope] Vite: http://localhost:5173");
console.log("[GoldScope] OANDA optional env: OANDA_API_TOKEN, OANDA_ACCOUNT_ID, OANDA_ENV");

const market = start("market", "node", ["server/marketProxy.js"]);
const vite = start("vite", npmCmd, ["run", "dev"]);

function shutdown() {
  console.log("\n[GoldScope] shutting down...");
  for (const child of [market, vite]) {
    try {
      if (child && !child.killed) child.kill();
    } catch {}
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
