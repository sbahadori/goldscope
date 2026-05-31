GoldScope v2.25 - Single Launcher Ollama

This version removes the separate AI proxy bridge.

Run only:
  Start-GoldScope-v2.bat

No longer needed:
  Start-AI-Proxy.bat
  Start-Proxy.bat
  proxy-server.mjs

How AI works now:
  Browser -> Vite internal proxy /api/ollama -> Ollama http://localhost:11434

Before starting:
1. Make sure Ollama is running.
2. Confirm this works:
   http://localhost:11434/api/tags
3. Start GoldScope:
   Start-GoldScope-v2.bat
4. In GoldScope:
   AI Engine -> Check internal proxy -> Check Ollama -> Run smoke test -> Run real GoldScope AI analysis

No credential or FRED key files are included or overwritten.
