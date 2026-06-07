# GoldScope v2.41.2.5.1 - Package Scripts Fix

This hotfix adds missing npm scripts to package.json:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

Reason:
The previous package.json only contained:
```json
"build": "vite build"
```

So this command failed:
```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

After this fix, run:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

No app logic was changed.
