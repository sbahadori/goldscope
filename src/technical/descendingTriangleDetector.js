// GoldScope - Descending Triangle Pattern Detector
// Pure deterministic detector for XAUUSD structure analysis.
// It detects only one pattern: descending triangle.
// Output is research context, not an automatic buy/sell instruction.

const DEFAULT_CONFIG = {
  primaryTimeframe: "30m",
  lookback: 140,
  pivotLeft: 3,
  pivotRight: 3,
  minSupportTouches: 3,
  minLowerHighs: 2,
  minCompressionRatio: 0.68,
  supportTolerancePct: 0.0025,
  supportAtrMultiplier: 0.55,
  breakoutAtrMultiplier: 0.18,
  volumeBreakoutMultiplier: 1.15,
  higherTimeframes: ["1h", "4h", "1d"],
};

export const TIMEFRAME_MINUTES = {
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "4h": 240,
  "1d": 1440,
  "1w": 10080,
};

function isFiniteNumber(x) {
  return Number.isFinite(Number(x));
}

export function round(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

function mean(values) {
  const clean = values.filter(isFiniteNumber).map(Number);
  if (!clean.length) return NaN;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function median(values) {
  const clean = values.filter(isFiniteNumber).map(Number).sort((a, b) => a - b);
  if (!clean.length) return NaN;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

export function normalizeCandles(candles = []) {
  return (Array.isArray(candles) ? candles : [])
    .map((c, index) => ({
      index,
      time: c.time || c.date || c.timestamp || String(index),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: isFiniteNumber(c.volume) ? Number(c.volume) : null,
    }))
    .filter((c) =>
      isFiniteNumber(c.open) &&
      isFiniteNumber(c.high) &&
      isFiniteNumber(c.low) &&
      isFiniteNumber(c.close) &&
      c.high >= c.low &&
      c.high >= Math.max(c.open, c.close) &&
      c.low <= Math.min(c.open, c.close)
    )
    .sort((a, b) => {
      const ta = new Date(a.time).getTime();
      const tb = new Date(b.time).getTime();
      if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb;
      return a.index - b.index;
    })
    .map((c, i) => ({ ...c, index: i }));
}

export function resampleCandles(candles = [], targetTimeframe = "1h") {
  const minutes = TIMEFRAME_MINUTES[targetTimeframe];
  const clean = normalizeCandles(candles);
  if (!minutes || minutes <= 0 || clean.length < 2) return clean;

  const bucketMs = minutes * 60 * 1000;
  const buckets = new Map();

  for (const c of clean) {
    const t = new Date(c.time).getTime();
    if (!Number.isFinite(t)) continue;
    const bucketTime = Math.floor(t / bucketMs) * bucketMs;
    const key = new Date(bucketTime).toISOString();
    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        time: key,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: isFiniteNumber(c.volume) ? c.volume : null,
      });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      if (isFiniteNumber(c.volume)) existing.volume = (existing.volume || 0) + c.volume;
    }
  }

  return normalizeCandles([...buckets.values()]);
}

export function sma(values, period) {
  const clean = values.map(Number);
  if (clean.length < period) return NaN;
  return mean(clean.slice(-period));
}

export function ema(values, period) {
  const clean = values.filter(isFiniteNumber).map(Number);
  if (clean.length < period) return NaN;
  const k = 2 / (period + 1);
  let value = mean(clean.slice(0, period));
  for (let i = period; i < clean.length; i += 1) {
    value = clean[i] * k + value * (1 - k);
  }
  return value;
}

export function atr(candles, period = 14) {
  const c = normalizeCandles(candles);
  if (c.length < period + 1) return NaN;
  const trs = [];
  for (let i = 1; i < c.length; i += 1) {
    trs.push(Math.max(
      c[i].high - c[i].low,
      Math.abs(c[i].high - c[i - 1].close),
      Math.abs(c[i].low - c[i - 1].close)
    ));
  }
  return sma(trs, period);
}

export function rsi(closes, period = 14) {
  const v = closes.filter(isFiniteNumber).map(Number);
  if (v.length < period + 1) return NaN;
  let gains = 0;
  let losses = 0;
  for (let i = v.length - period; i < v.length; i += 1) {
    const diff = v[i] - v[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const v = closes.filter(isFiniteNumber).map(Number);
  if (v.length < slow + signal) return { macd: NaN, signal: NaN, histogram: NaN, state: "unknown" };
  const macdSeries = [];
  for (let i = slow; i <= v.length; i += 1) {
    const subset = v.slice(0, i);
    macdSeries.push(ema(subset, fast) - ema(subset, slow));
  }
  const m = macdSeries[macdSeries.length - 1];
  const s = ema(macdSeries, signal);
  const h = m - s;
  return {
    macd: m,
    signal: s,
    histogram: h,
    state: h > 0 ? "bullish" : h < 0 ? "bearish" : "neutral",
  };
}

export function bollinger(candles, period = 20, mult = 2) {
  const closes = normalizeCandles(candles).map((c) => c.close);
  if (closes.length < period) return { basis: NaN, upper: NaN, lower: NaN, bandwidthPct: NaN, position: "unknown" };
  const slice = closes.slice(-period);
  const basis = mean(slice);
  const variance = mean(slice.map((x) => (x - basis) ** 2));
  const sd = Math.sqrt(variance);
  const upper = basis + mult * sd;
  const lower = basis - mult * sd;
  const last = closes[closes.length - 1];
  return {
    basis,
    upper,
    lower,
    bandwidthPct: ((upper - lower) / Math.max(Math.abs(basis), 1)) * 100,
    position: last > upper ? "above_upper" : last < lower ? "below_lower" : "inside",
  };
}

export function stochasticRsi(closes, period = 14, smooth = 3) {
  const v = closes.filter(isFiniteNumber).map(Number);
  if (v.length < period * 2 + smooth) return { k: NaN, d: NaN, state: "unknown" };
  const rsiValues = [];
  for (let i = period + 1; i <= v.length; i += 1) {
    rsiValues.push(rsi(v.slice(0, i), period));
  }
  const recent = rsiValues.slice(-period);
  const minRsi = Math.min(...recent);
  const maxRsi = Math.max(...recent);
  const lastRsi = rsiValues[rsiValues.length - 1];
  const k = maxRsi === minRsi ? 50 : ((lastRsi - minRsi) / (maxRsi - minRsi)) * 100;
  const kSeries = rsiValues.slice(-period - smooth).map((rv, idx, arr) => {
    const window = arr.slice(Math.max(0, idx - period + 1), idx + 1);
    const lo = Math.min(...window);
    const hi = Math.max(...window);
    return hi === lo ? 50 : ((rv - lo) / (hi - lo)) * 100;
  });
  const d = sma(kSeries, smooth);
  let state = "neutral";
  if (k >= 80) state = "overbought";
  else if (k <= 20) state = "oversold";
  else if (k > d && k > 50) state = "bullish_momentum";
  else if (k < d && k < 50) state = "bearish_momentum";
  return { k, d, state };
}

export function detectPivots(candles, left = 3, right = 3, atrValue = NaN) {
  const c = normalizeCandles(candles);
  const highs = [];
  const lows = [];
  if (c.length < left + right + 1) return { highs, lows };

  const minSwing = Number.isFinite(atrValue) ? atrValue * 0.15 : 0;
  for (let i = left; i < c.length - right; i += 1) {
    const window = c.slice(i - left, i + right + 1);
    const h = c[i].high;
    const l = c[i].low;
    const maxHigh = Math.max(...window.map((x) => x.high));
    const minLow = Math.min(...window.map((x) => x.low));
    const highSeparation = h - Math.max(...window.filter((_, idx) => idx !== left).map((x) => x.high));
    const lowSeparation = Math.min(...window.filter((_, idx) => idx !== left).map((x) => x.low)) - l;

    if (h === maxHigh && highSeparation >= minSwing) highs.push({ ...c[i], type: "high" });
    if (l === minLow && lowSeparation >= minSwing) lows.push({ ...c[i], type: "low" });
  }
  return { highs, lows };
}

function linearRegression(points, yKey = "high") {
  if (!points || points.length < 2) return { slope: NaN, intercept: NaN, r2: NaN };
  const xs = points.map((p) => Number(p.index));
  const ys = points.map((p) => Number(p[yKey]));
  const xMean = mean(xs);
  const yMean = mean(ys);
  const denom = xs.reduce((acc, x) => acc + (x - xMean) ** 2, 0);
  if (!denom) return { slope: 0, intercept: yMean, r2: 0 };
  const slope = xs.reduce((acc, x, i) => acc + (x - xMean) * (ys[i] - yMean), 0) / denom;
  const intercept = yMean - slope * xMean;
  const ssTot = ys.reduce((acc, y) => acc + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2 };
}

function evaluateIndicators(candles) {
  const c = normalizeCandles(candles);
  const closes = c.map((x) => x.close);
  const last = c[c.length - 1] || {};
  const rsi14 = rsi(closes, 14);
  const macdValue = macd(closes);
  const atr14 = atr(c, 14);
  const bb20 = bollinger(c, 20, 2);
  const stoch = stochasticRsi(closes, 14, 3);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  let score = 0;
  const evidence = [];
  if (macdValue.state === "bearish") { score -= 1; evidence.push("MACD histogram is bearish."); }
  if (macdValue.state === "bullish") { score += 1; evidence.push("MACD histogram is bullish."); }
  if (Number.isFinite(rsi14) && rsi14 < 45) { score -= 0.75; evidence.push("RSI14 is below 45, showing bearish momentum context."); }
  else if (Number.isFinite(rsi14) && rsi14 > 55) { score += 0.75; evidence.push("RSI14 is above 55, showing bullish momentum context."); }
  else if (Number.isFinite(rsi14)) evidence.push("RSI14 is neutral; no momentum confirmation.");
  if (stoch.state === "bearish_momentum" || stoch.state === "overbought") { score -= 0.5; evidence.push(`Stochastic RSI state is ${stoch.state}.`); }
  if (stoch.state === "bullish_momentum" || stoch.state === "oversold") { score += 0.5; evidence.push(`Stochastic RSI state is ${stoch.state}.`); }
  if (last.close < ema20 && ema20 < ema50) { score -= 1; evidence.push("Price is below EMA20 and EMA20 is below EMA50."); }
  if (last.close > ema20 && ema20 > ema50) { score += 1; evidence.push("Price is above EMA20 and EMA20 is above EMA50."); }
  if (bb20.position === "below_lower") { score -= 0.35; evidence.push("Price is below lower Bollinger Band; breakdown/extension context."); }
  if (bb20.position === "above_upper") { score += 0.35; evidence.push("Price is above upper Bollinger Band; upside extension context."); }

  return {
    score: round(score, 2),
    bias: score <= -1.25 ? "bearish" : score >= 1.25 ? "bullish" : score < 0 ? "mild-bearish" : score > 0 ? "mild-bullish" : "neutral",
    rsi14: round(rsi14, 2),
    macd: { histogram: round(macdValue.histogram, 4), state: macdValue.state },
    stochRsi: { k: round(stoch.k, 2), d: round(stoch.d, 2), state: stoch.state },
    atr14: round(atr14, 3),
    bollinger: { position: bb20.position, bandwidthPct: round(bb20.bandwidthPct, 2) },
    ema: { ema20: round(ema20, 2), ema50: round(ema50, 2), ema200: round(ema200, 2) },
    evidence,
  };
}

function buildSupportCluster(lows, tolerance) {
  if (!lows.length) return null;
  const sorted = lows.slice().sort((a, b) => a.low - b.low);
  let best = [];

  for (let i = 0; i < sorted.length; i += 1) {
    const seed = sorted[i].low;
    const cluster = sorted.filter((p) => Math.abs(p.low - seed) <= tolerance);
    if (cluster.length > best.length) best = cluster;
  }

  if (!best.length) return null;
  const level = median(best.map((p) => p.low));
  return {
    level,
    zoneLow: level - tolerance,
    zoneHigh: level + tolerance,
    touches: best.sort((a, b) => a.index - b.index),
  };
}

function calculateCompression(highPoints, supportLevel) {
  const values = highPoints.map((h) => Math.max(0, h.high - supportLevel));
  if (values.length < 2) return { ratio: NaN, compressed: false };
  const first = values[0];
  const last = values[values.length - 1];
  return { ratio: first ? last / first : NaN, compressed: first > 0 && last < first };
}

function breakoutStatus({ candles, support, atrValue, volumeBreakoutMultiplier }) {
  const c = normalizeCandles(candles);
  const last = c[c.length - 1];
  const prev = c[c.length - 2];
  if (!last || !support) return { status: "unknown", valid: false, evidence: [] };

  const closeBreak = last.close < support.zoneLow;
  const wickOnly = last.low < support.zoneLow && last.close >= support.zoneLow;
  const depth = closeBreak ? support.zoneLow - last.close : 0;
  const minDepth = Number.isFinite(atrValue) ? atrValue * DEFAULT_CONFIG.breakoutAtrMultiplier : 0;
  const body = Math.abs(last.close - last.open);
  const range = Math.max(last.high - last.low, 0.00001);
  const bodyQuality = body / range;
  const recentVolumes = c.slice(-21, -1).map((x) => x.volume).filter(isFiniteNumber);
  const avgVolume = mean(recentVolumes);
  const volumeOk = isFiniteNumber(last.volume) && Number.isFinite(avgVolume) && avgVolume > 0
    ? last.volume >= avgVolume * volumeBreakoutMultiplier
    : null;

  const evidence = [];
  if (wickOnly) evidence.push("Price swept below support but closed back inside/above support zone; possible fake breakdown.");
  if (closeBreak) evidence.push("Latest candle closed below the support zone.");
  if (closeBreak && depth >= minDepth) evidence.push("Breakout depth is meaningful relative to ATR.");
  if (closeBreak && bodyQuality >= 0.45) evidence.push("Breakout candle has acceptable body quality, not only a wick.");
  if (volumeOk === true) evidence.push("Volume/tick-volume expanded on the breakout candle.");
  if (volumeOk === false) evidence.push("Volume confirmation is weak or unavailable.");
  if (prev && prev.close < support.zoneLow && last.close < support.zoneLow) evidence.push("Two consecutive closes below support increase breakdown confidence.");

  if (wickOnly) return { status: "fake_breakdown_risk", valid: false, closeBreak, wickOnly, depth: round(depth, 3), bodyQuality: round(bodyQuality, 2), volumeOk, evidence };
  if (closeBreak && depth >= minDepth && bodyQuality >= 0.35) return { status: "breakdown_confirmed", valid: true, closeBreak, wickOnly, depth: round(depth, 3), bodyQuality: round(bodyQuality, 2), volumeOk, evidence };
  if (last.close >= support.zoneLow && last.close <= support.zoneHigh) return { status: "testing_support", valid: false, closeBreak, wickOnly, depth: round(depth, 3), bodyQuality: round(bodyQuality, 2), volumeOk, evidence };
  return { status: "candidate_waiting", valid: false, closeBreak, wickOnly, depth: round(depth, 3), bodyQuality: round(bodyQuality, 2), volumeOk, evidence };
}

function classifyHigherTimeframe(block) {
  if (!block || block.status === "insufficient_data") return { bias: "unknown", score: 0, evidence: ["No usable higher-timeframe data."] };
  const last = block.lastClose;
  const ema20 = block.indicators?.ema?.ema20;
  const ema50 = block.indicators?.ema?.ema50;
  const ema200 = block.indicators?.ema?.ema200;
  let score = 0;
  const evidence = [];
  if (isFiniteNumber(last) && isFiniteNumber(ema20) && isFiniteNumber(ema50)) {
    if (last < ema20 && ema20 < ema50) { score -= 1.5; evidence.push("Higher timeframe EMA stack is bearish."); }
    if (last > ema20 && ema20 > ema50) { score += 1.5; evidence.push("Higher timeframe EMA stack is bullish."); }
  }
  if (isFiniteNumber(last) && isFiniteNumber(ema200)) {
    if (last < ema200) { score -= 0.5; evidence.push("Price is below EMA200 on this timeframe."); }
    if (last > ema200) { score += 0.5; evidence.push("Price is above EMA200 on this timeframe."); }
  }
  if (block.indicators?.bias === "bearish") score -= 0.75;
  if (block.indicators?.bias === "bullish") score += 0.75;
  const bias = score <= -1 ? "bearish_confirming" : score >= 1 ? "bullish_contradicting" : "neutral";
  return { bias, score: round(score, 2), evidence };
}

export function detectDescendingTriangle(candles = [], config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const cleaned = normalizeCandles(candles).slice(-cfg.lookback);
  if (cleaned.length < 60) {
    return {
      detected: false,
      status: "insufficient_data",
      confidence: 0,
      reason: "Need at least 60 clean candles for descending triangle detection.",
    };
  }

  const atrValue = atr(cleaned, 14);
  const last = cleaned[cleaned.length - 1];
  const tolerance = Math.max(last.close * cfg.supportTolerancePct, Number.isFinite(atrValue) ? atrValue * cfg.supportAtrMultiplier : 0);
  const pivots = detectPivots(cleaned, cfg.pivotLeft, cfg.pivotRight, atrValue);
  const recentLows = pivots.lows.slice(-8);
  const support = buildSupportCluster(recentLows, tolerance);

  if (!support || support.touches.length < cfg.minSupportTouches) {
    return {
      detected: false,
      status: "no_horizontal_support",
      confidence: 0,
      reason: "No repeated horizontal support cluster with enough valid pivot touches.",
      pivots,
      indicators: evaluateIndicators(cleaned),
    };
  }

  const startIndex = Math.min(...support.touches.map((p) => p.index));
  const highCandidates = pivots.highs
    .filter((h) => h.index >= Math.max(0, startIndex - 20) && h.index <= last.index)
    .slice(-6);
  const lowerHighs = [];
  for (const h of highCandidates) {
    if (!lowerHighs.length || h.high < lowerHighs[lowerHighs.length - 1].high + tolerance * 0.4) {
      lowerHighs.push(h);
    }
  }

  const regression = linearRegression(highCandidates, "high");
  const slopePctPerCandle = Number.isFinite(regression.slope) ? (regression.slope / Math.max(last.close, 1)) * 100 : NaN;
  const compression = calculateCompression(highCandidates, support.level);
  const breakout = breakoutStatus({ candles: cleaned, support, atrValue, volumeBreakoutMultiplier: cfg.volumeBreakoutMultiplier });
  const indicators = evaluateIndicators(cleaned);

  const patternHeight = Math.max(...highCandidates.map((h) => h.high)) - support.level;
  const measuredTarget = support.zoneLow - patternHeight;
  const invalidation = highCandidates.length
    ? Math.max(highCandidates[highCandidates.length - 1].high, support.zoneHigh + tolerance)
    : support.zoneHigh + tolerance;

  const scoreParts = {
    supportQuality: support.touches.length >= 4 ? 25 : support.touches.length >= 3 ? 20 : 0,
    descendingHighs: regression.slope < 0 && lowerHighs.length >= cfg.minLowerHighs ? 20 : regression.slope < 0 ? 12 : 0,
    compression: compression.compressed && compression.ratio <= cfg.minCompressionRatio ? 15 : compression.compressed ? 9 : 0,
    breakout: breakout.valid ? 15 : breakout.status === "testing_support" ? 6 : breakout.status === "fake_breakdown_risk" ? -8 : 0,
    indicators: indicators.bias === "bearish" ? 12 : indicators.bias === "mild-bearish" ? 7 : indicators.bias === "bullish" ? -10 : indicators.bias === "mild-bullish" ? -5 : 0,
  };

  const rawConfidence = Object.values(scoreParts).reduce((a, b) => a + b, 0);
  const geometryOk = support.touches.length >= cfg.minSupportTouches && regression.slope < 0 && highCandidates.length >= cfg.minLowerHighs;
  const confidence = geometryOk ? clamp(rawConfidence, 0, 100) : clamp(rawConfidence * 0.5, 0, 50);

  return {
    detected: geometryOk,
    pattern: "descending_triangle",
    status: geometryOk ? breakout.status : "weak_candidate",
    confidence: round(confidence, 0),
    timeframe: cfg.primaryTimeframe,
    supportZone: [round(support.zoneLow), round(support.zoneHigh)],
    supportLevel: round(support.level),
    breakoutLevel: round(support.zoneLow),
    measuredTarget: round(measuredTarget),
    invalidationLevel: round(invalidation),
    patternHeight: round(patternHeight),
    tolerance: round(tolerance, 3),
    trendline: {
      slope: round(regression.slope, 5),
      slopePctPerCandle: round(slopePctPerCandle, 4),
      r2: round(regression.r2, 3),
      points: highCandidates.map((p) => ({ index: p.index, time: p.time, price: round(p.high) })),
    },
    supportTouches: support.touches.map((p) => ({ index: p.index, time: p.time, price: round(p.low) })),
    compression: { ratio: round(compression.ratio, 3), compressed: compression.compressed },
    breakout,
    indicators,
    scoreParts,
    candles: cleaned,
    guardrail: "Pattern detection is conditional research context only. Require candle close, retest, and macro/yield/DXY alignment before any trade decision.",
  };
}

export function analyzeDescendingTriangleMultiTimeframe(candlesByTimeframe = {}, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const primaryCandles = candlesByTimeframe[cfg.primaryTimeframe]
    || candlesByTimeframe.primary
    || candlesByTimeframe["30m"]
    || [];

  const primary = detectDescendingTriangle(primaryCandles, cfg);
  const confirmations = {};
  let mtfScore = 0;

  for (const tf of cfg.higherTimeframes) {
    const source = candlesByTimeframe[tf] || resampleCandles(primaryCandles, tf);
    const clean = normalizeCandles(source).slice(-Math.max(80, Math.floor(cfg.lookback / 2)));
    if (clean.length < 30) {
      confirmations[tf] = { timeframe: tf, status: "insufficient_data", bias: "unknown", score: 0 };
      continue;
    }
    const indicators = evaluateIndicators(clean);
    const lastClose = clean[clean.length - 1]?.close;
    const block = { timeframe: tf, status: "available", lastClose: round(lastClose), indicators };
    const classified = classifyHigherTimeframe(block);
    confirmations[tf] = { ...block, ...classified };
    mtfScore += Number(classified.score || 0);
  }

  const primaryBearish = primary.detected ? 1 : 0;
  const mtfBias = mtfScore <= -2 ? "bearish_confirmed" : mtfScore >= 2 ? "bullish_conflict" : "mixed_or_neutral";
  const finalConfidence = clamp(Number(primary.confidence || 0) + (mtfBias === "bearish_confirmed" ? 10 : mtfBias === "bullish_conflict" ? -12 : 0), 0, 100);

  return {
    pattern: "descending_triangle",
    primary,
    higherTimeframes: confirmations,
    multiTimeframeScore: round(mtfScore, 2),
    multiTimeframeBias: mtfBias,
    finalStatus: primary.detected
      ? primary.breakout?.valid
        ? "breakdown_confirmed_with_mtf_check"
        : "candidate_waiting_for_breakdown"
      : "not_detected",
    finalConfidence: round(primaryBearish ? finalConfidence : 0, 0),
    decision: primary.detected && primary.breakout?.valid && mtfBias !== "bullish_conflict"
      ? "conditional_bearish_research_validated"
      : primary.detected
        ? "wait_for_breakout_or_retest_confirmation"
        : "no_pattern_signal",
    guardrail: "This module does not place trades. It detects structure and returns conditional confirmation context for GoldScope.",
  };
}

export function buildDescendingTriangleChartModel(analysis) {
  const primary = analysis?.primary || analysis;
  const candles = primary?.candles || [];
  if (!candles.length || !primary?.detected) return null;
  const lastIndex = candles[candles.length - 1].index;
  const trendPoints = primary.trendline?.points || [];
  const firstTrend = trendPoints[0];
  const lastTrend = trendPoints[trendPoints.length - 1];
  return {
    type: "descending_triangle_overlay",
    status: primary.status,
    confidence: primary.confidence,
    supportZone: primary.supportZone,
    supportTouches: primary.supportTouches,
    trendline: firstTrend && lastTrend ? {
      x1: firstTrend.index,
      y1: firstTrend.price,
      x2: lastIndex,
      y2: round(lastTrend.price + (primary.trendline.slope || 0) * (lastIndex - lastTrend.index)),
    } : null,
    breakoutLevel: primary.breakoutLevel,
    measuredTarget: primary.measuredTarget,
    invalidationLevel: primary.invalidationLevel,
  };
}
