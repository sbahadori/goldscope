GoldScope AI credentials - v2.19

Edit:
  public/config/ai_credentials.json

Recommended defaults:
  DeepSeek deep reasoning:
    model = deepseek-v4-pro
    base_url = https://api.deepseek.com

  Groq fast/deep daily analysis:
    model = openai/gpt-oss-120b
    base_url = https://api.groq.com/openai/v1

  OpenRouter free routing:
    model = deepseek/deepseek-r1:free
    base_url = https://openrouter.ai/api/v1

Important:
- public/config/ai_credentials.json is for local development only.
- Do not commit real keys to GitHub.
- Because this file is served by Vite, anyone who can access your local app can read it.
- For production, move provider calls and secrets to a backend/BI proxy.

The custom_models format you received from Groq is supported.
