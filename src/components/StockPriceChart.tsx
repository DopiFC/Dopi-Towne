import React, { useMemo, useState } from 'react';
import { formatNumber } from '../game/economy';
import type { CurrencyType, StockSessionPoint } from '../game/types';

interface StockPriceChartProps {
  history: StockSessionPoint[];
  currency: CurrencyType;
  stockCode: string;
}

export const StockPriceChart: React.FC<StockPriceChartProps> = ({
  history,
  currency,
  stockCode,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (history.length === 0) return null;
    const width = 640;
    const height = 216;
    const padLeft = 56;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    const prices = history.map((h) => h.price);
    const minRaw = Math.min(...prices);
    const maxRaw = Math.max(...prices);
    const spread = Math.max(2, maxRaw - minRaw);
    const minVal = Math.max(1, Math.floor(minRaw - spread * 0.12));
    const maxVal = Math.ceil(maxRaw + spread * 0.12);
    const range = Math.max(1, maxVal - minVal);

    const points = history.map((pt, idx) => {
      const x =
        padLeft +
        (history.length > 1 ? (idx / (history.length - 1)) * plotW : plotW / 2);
      const y = padTop + plotH - ((pt.price - minVal) / range) * plotH;
      return { ...pt, x, y, idx };
    });

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(
      padTop + plotH
    ).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`;

    const isPositive = history[history.length - 1].price >= history[0].price;
    const midVal = Math.round((minVal + maxVal) / 2);

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      plotW,
      plotH,
      points,
      linePath,
      areaPath,
      isPositive,
      yTicks: [
        { val: maxVal, y: padTop },
        { val: midVal, y: padTop + plotH / 2 },
        { val: minVal, y: padTop + plotH },
      ],
      xTickIndices: [0, 6, 12, 18, Math.max(0, history.length - 1)],
    };
  }, [history]);

  if (!chartData) return null;

  const strokeColor = chartData.isPositive ? '#059669' : '#DC2626';
  const fillId = `stock-area-${stockCode}-${chartData.isPositive ? 'up' : 'down'}`;
  const activePoint =
    hoveredIdx !== null && chartData.points[hoveredIdx]
      ? chartData.points[hoveredIdx]
      : chartData.points[chartData.points.length - 1];
  const unitLabel = currency === 'coins' ? 'Xu' : 'Vàng';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <span>Biểu đồ 24 phiên gần nhất (cập nhật mỗi 15 phút)</span>
        <span className="font-mono-num font-semibold text-slate-800">
          Phiên {activePoint.label}: {formatNumber(activePoint.price)} {unitLabel}
        </span>
      </div>

      <div className="w-full rounded-2xl bg-[#FAFDF8] border border-[#DCE7D3] p-2 sm:p-3 overflow-hidden">
        <svg
          viewBox={`0 0 ${chartData.width} ${chartData.height}`}
          className="w-full h-[195px] sm:h-[216px] select-none"
          role="img"
          aria-label={`Biểu đồ giá 24 phiên của cổ phiếu ${stockCode}`}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {chartData.yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={chartData.padLeft}
                y1={tick.y}
                x2={chartData.width - chartData.padRight}
                y2={tick.y}
                stroke="#E2EBD9"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={chartData.padLeft - 8}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px] font-mono"
              >
                {formatNumber(tick.val)}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <path d={chartData.areaPath} fill={`url(#${fillId})`} />

          {/* Main Price Line */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Crosshair */}
          <line
            x1={activePoint.x}
            y1={chartData.padTop}
            x2={activePoint.x}
            y2={chartData.padTop + chartData.plotH}
            stroke={strokeColor}
            strokeOpacity="0.35"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <circle
            cx={activePoint.x}
            cy={activePoint.y}
            r="4.5"
            fill="#FFFFFF"
            stroke={strokeColor}
            strokeWidth="2.5"
          />

          {/* X-Axis Labels */}
          {chartData.xTickIndices.map((idx) => {
            const pt = chartData.points[idx];
            if (!pt) return null;
            return (
              <text
                key={idx}
                x={pt.x}
                y={chartData.height - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[11px] font-mono"
              >
                {pt.label}
              </text>
            );
          })}

          {/* Interactive Hover Hit Targets */}
          {chartData.points.map((pt) => (
            <rect
              key={pt.idx}
              x={pt.x - chartData.plotW / (chartData.points.length * 2)}
              y={chartData.padTop}
              width={Math.max(12, chartData.plotW / chartData.points.length)}
              height={chartData.plotH}
              fill="transparent"
              className="cursor-crosshair"
              onMouseEnter={() => setHoveredIdx(pt.idx)}
              onClick={() => setHoveredIdx(pt.idx)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

interface MiniSparklineProps {
  history: StockSessionPoint[];
}

export const MiniSparkline: React.FC<MiniSparklineProps> = React.memo(
  ({ history }) => {
    if (history.length < 2) return null;
    const width = 68;
    const height = 24;
    const prices = history.map((h) => h.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = Math.max(1, maxP - minP);
    const isUp = prices[prices.length - 1] >= prices[0];
    const stroke = isUp ? '#059669' : '#DC2626';

    const d = prices
      .map((p, i) => {
        const x = (i / (prices.length - 1)) * (width - 4) + 2;
        const y = height - 3 - ((p - minP) / range) * (height - 6);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

MiniSparkline.displayName = 'MiniSparkline';
