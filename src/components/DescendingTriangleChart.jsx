import React, { useMemo } from "react";
import { buildDescendingTriangleChartModel, round } from "../technical/descendingTriangleDetector.js";

const COLOR = {
  bg: "#070b12",
  grid: "#1f2937",
  text: "#e5e7eb",
  muted: "#94a3b8",
  green: "#10b981",
  red: "#ef4444",
  gold: "#f59e0b",
  blue: "#60a5fa",
  support: "#38bdf8",
  trend: "#f97316",
};

function safeCandles(analysis) {
  const primary = analysis?.primary || analysis;
  return Array.isArray(primary?.candles) ? primary.candles : [];
}

export default function DescendingTriangleChart({ analysis, height = 420, maxCandles = 110 }) {
  const candles = safeCandles(analysis).slice(-maxCandles);
  const overlay = useMemo(() => buildDescendingTriangleChartModel(analysis), [analysis]);

  const model = useMemo(() => {
    if (!candles.length) return null;
    const prices = candles.flatMap((c) => [c.high, c.low]).filter(Number.isFinite);
    const extra = [
      overlay?.supportZone?.[0],
      overlay?.supportZone?.[1],
      overlay?.breakoutLevel,
      overlay?.measuredTarget,
      overlay?.invalidationLevel,
    ].filter(Number.isFinite);
    const min = Math.min(...prices, ...extra);
    const max = Math.max(...prices, ...extra);
    const pad = Math.max((max - min) * 0.14, 1);
    const yMin = min - pad;
    const yMax = max + pad;
    const width = 920;
    const left = 56;
    const right = 16;
    const top = 26;
    const bottom = 44;
    const plotW = width - left - right;
    const plotH = height - top - bottom;
    const step = plotW / Math.max(candles.length - 1, 1);
    const bodyW = Math.max(3, Math.min(9, step * 0.55));
    const firstIndex = candles[0]?.index ?? 0;

    const x = (globalIndex) => left + ((globalIndex - firstIndex) / Math.max(candles.length - 1, 1)) * plotW;
    const y = (price) => top + ((yMax - price) / Math.max(yMax - yMin, 0.00001)) * plotH;
    const visible = (idx) => idx >= firstIndex && idx <= (candles[candles.length - 1]?.index ?? idx);

    return { width, height, left, right, top, bottom, plotW, plotH, step, bodyW, yMin, yMax, x, y, visible };
  }, [candles, overlay, height]);

  if (!analysis) {
    return <div style={emptyStyle}>No descending triangle analysis available.</div>;
  }

  if (!candles.length || !model) {
    return <div style={emptyStyle}>No candles available for chart rendering.</div>;
  }

  const primary = analysis?.primary || analysis;
  const status = analysis.finalStatus || primary.status;
  const confidence = analysis.finalConfidence ?? primary.confidence;

  const gridPrices = Array.from({ length: 6 }, (_, i) => model.yMin + ((model.yMax - model.yMin) * i) / 5);
  const last = candles[candles.length - 1];

  return (
    <div style={{ background: COLOR.bg, border: "1px solid #1e293b", borderRadius: 14, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ color: COLOR.text, fontWeight: 700 }}>Descending Triangle Detector</div>
          <div style={{ color: COLOR.muted, fontSize: 12 }}>
            Status: {status} · Confidence: {confidence ?? "n/a"}% · Last close: {round(last.close)}
          </div>
        </div>
        <div style={{ color: COLOR.muted, fontSize: 12, textAlign: "right" }}>
          Support: {primary.supportZone?.join(" – ") || "n/a"}<br />
          Break: {primary.breakoutLevel ?? "n/a"} · Target: {primary.measuredTarget ?? "n/a"}
        </div>
      </div>

      <svg viewBox={`0 0 ${model.width} ${model.height}`} width="100%" height={height} role="img" aria-label="Descending triangle chart overlay">
        <rect x="0" y="0" width={model.width} height={model.height} fill={COLOR.bg} />

        {gridPrices.map((p) => (
          <g key={`grid-${p}`}>
            <line x1={model.left} x2={model.width - model.right} y1={model.y(p)} y2={model.y(p)} stroke={COLOR.grid} strokeWidth="1" />
            <text x="8" y={model.y(p) + 4} fill={COLOR.muted} fontSize="11">{round(p)}</text>
          </g>
        ))}

        {candles.map((c) => {
          const cx = model.x(c.index);
          const up = c.close >= c.open;
          const color = up ? COLOR.green : COLOR.red;
          const yOpen = model.y(c.open);
          const yClose = model.y(c.close);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yClose - yOpen));
          return (
            <g key={`${c.index}-${c.time}`}>
              <line x1={cx} x2={cx} y1={model.y(c.high)} y2={model.y(c.low)} stroke={color} strokeWidth="1.4" />
              <rect x={cx - model.bodyW / 2} y={bodyTop} width={model.bodyW} height={bodyH} fill={color} rx="1" />
            </g>
          );
        })}

        {overlay?.supportZone && (
          <g>
            <rect
              x={model.left}
              y={model.y(overlay.supportZone[1])}
              width={model.plotW}
              height={Math.max(3, model.y(overlay.supportZone[0]) - model.y(overlay.supportZone[1]))}
              fill={COLOR.support}
              opacity="0.16"
            />
            <line x1={model.left} x2={model.width - model.right} y1={model.y(overlay.breakoutLevel)} y2={model.y(overlay.breakoutLevel)} stroke={COLOR.support} strokeWidth="2" strokeDasharray="6 4" />
            <text x={model.width - model.right - 160} y={model.y(overlay.breakoutLevel) - 8} fill={COLOR.support} fontSize="12">
              Support / breakdown zone
            </text>
          </g>
        )}

        {overlay?.trendline && model.visible(overlay.trendline.x1) && (
          <g>
            <line
              x1={model.x(overlay.trendline.x1)}
              y1={model.y(overlay.trendline.y1)}
              x2={model.x(Math.min(overlay.trendline.x2, candles[candles.length - 1].index))}
              y2={model.y(overlay.trendline.y2)}
              stroke={COLOR.trend}
              strokeWidth="2.2"
            />
            <text x={model.x(overlay.trendline.x1) + 8} y={model.y(overlay.trendline.y1) - 8} fill={COLOR.trend} fontSize="12">
              Lower-high trendline
            </text>
          </g>
        )}

        {overlay?.supportTouches?.map((p) => model.visible(p.index) ? (
          <circle key={`touch-${p.index}`} cx={model.x(p.index)} cy={model.y(p.price)} r="4" fill={COLOR.support} stroke={COLOR.bg} strokeWidth="1.5" />
        ) : null)}

        {Number.isFinite(overlay?.measuredTarget) && (
          <g>
            <line x1={model.left} x2={model.width - model.right} y1={model.y(overlay.measuredTarget)} y2={model.y(overlay.measuredTarget)} stroke={COLOR.red} strokeWidth="1.5" strokeDasharray="3 5" />
            <text x={model.width - model.right - 130} y={model.y(overlay.measuredTarget) - 8} fill={COLOR.red} fontSize="12">
              Measured target {round(overlay.measuredTarget)}
            </text>
          </g>
        )}

        {Number.isFinite(overlay?.invalidationLevel) && (
          <g>
            <line x1={model.left} x2={model.width - model.right} y1={model.y(overlay.invalidationLevel)} y2={model.y(overlay.invalidationLevel)} stroke={COLOR.gold} strokeWidth="1.4" strokeDasharray="4 4" />
            <text x={model.left + 8} y={model.y(overlay.invalidationLevel) - 8} fill={COLOR.gold} fontSize="12">
              Invalidation {round(overlay.invalidationLevel)}
            </text>
          </g>
        )}
      </svg>

      <div style={{ color: COLOR.muted, fontSize: 12, marginTop: 8 }}>
        This chart marks the candidate support zone, lower-high trendline, support touches, measured target, and invalidation level. It is a research overlay, not an automatic trade command.
      </div>
    </div>
  );
}

const emptyStyle = {
  background: COLOR.bg,
  color: COLOR.muted,
  border: "1px solid #1e293b",
  borderRadius: 14,
  padding: 16,
};
