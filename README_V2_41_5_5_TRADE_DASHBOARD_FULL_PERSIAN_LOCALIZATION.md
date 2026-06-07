# GoldScope v2.41.5.5 - Trade Dashboard Full Persian Localization

Builds on v2.41.5.4.

Goal:
Make the Trade Plan dashboard Persian-first and language-consistent.

Changes:
- Trade Plan tab label changed to Persian: سناریوها
- TradeScenarioDashboardPanel rewritten as Persian UI.
- Scenario titles localized:
  - Sell on rebound -> فروش در پول‌بک
  - Breakdown sell -> فروش پس از شکست حمایت
  - Support bounce buy -> خرید از برگشت حمایتی
  - Breakout buy -> خرید پس از شکست مقاومت
- Field labels localized:
  - محدوده ورود
  - شرط ورود / شرط فعال‌سازی
  - حد ضرر
  - اهداف قیمتی
  - منبع سطح ورود
  - منبع حد ضرر
  - منبع اهداف
  - جمع‌بندی تصمیم
  - پیوست بنیادی
- Explanation, risk note, source text, and footer proxy warning localized where possible.
- RTL layout improved.
- Technical abbreviations remain English:
  RSI, MACD, ADX, EMA20/EMA50, GC=F, XAUUSD, TP, SL, DXY, DGS10, DFII10, CPI, NFP.

Preserved:
- Dynamic data path:
  localStorage["goldscope.latestSnapshot.v1"].tradeScenarioPlan
- No hard-coded trade levels.
- Section 11 unchanged.
- tradeScenarioPlan object unchanged.
- BLS Sector Composition Parser unchanged.
- Final note guard unchanged.
- Evidence table strict replacement unchanged.
- Technical indicators unchanged.
- Technical Dashboard UI unchanged.
- No Tailwind CDN.
- No FontAwesome CDN.
- No external fonts.
- No keys or credentials included.
