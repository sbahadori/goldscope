GoldScope v2.25.1 - Safe Launcher

Use only:
  Start-GoldScope-v2.bat

This version improves the launcher:
- checks node
- checks npm
- checks package.json
- installs dependencies if node_modules is missing
- checks Ollama direct endpoint
- waits before opening browser
- keeps the window open if errors happen

No credential/FRED key files are included or overwritten.

If it still does not open:
1. Run Diagnose-GoldScope.bat
2. Copy the output from the terminal
3. Send it for debugging
