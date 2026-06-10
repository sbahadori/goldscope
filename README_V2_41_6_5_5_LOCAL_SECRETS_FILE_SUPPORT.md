# GoldScope v2.41.6.5.5 - Local Secrets File Support

Purpose:
Allow the market proxy to read OANDA credentials from:

```text
C:\src\Gold\_local_secrets\credentials.txt
```

No secrets are included in this zip.

Supported credential file format:

```text
OANDA_API_TOKEN=your_token_here
OANDA_ACCOUNT_ID=your_account_id_here
OANDA_ENV=practice
MARKET_PROXY_PORT=8787
```

Also supported:
```text
OANDA_TOKEN=your_token_here
```

Priority:
1. Environment variables
2. Local credentials file

Run:
```cmd
npm install
npm run dev:full
```

Health check:
```text
http://localhost:8787/api/market/health
```

The health response shows:
- oandaConfigured
- credentialsFile
- credentialsFileLoaded

It never exposes the token.
