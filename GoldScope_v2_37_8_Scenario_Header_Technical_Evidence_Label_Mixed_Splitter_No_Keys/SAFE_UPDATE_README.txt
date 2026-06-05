GoldScope v2.21.3 Ollama Smoke Test

This package does not include or overwrite:
- public/config/ai_credentials.json
- FRED key/config files
- secret files

Fix/debug:
- Adds Run Ollama smoke test button.
- Smoke test sends a tiny prompt: Reply with exactly one word: OK.
- Main Ollama prompt is smaller to reduce local model timeout/empty output.
- If smoke test works but full analysis does not, the prompt/model is the bottleneck.
- If smoke test fails, the app/proxy/Ollama path is the problem.
