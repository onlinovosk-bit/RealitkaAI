"use client";

type MetricSparklineProps = {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
};

export function MetricSparkline({
  values,
  width = 72,
  height = 28,
  color = "#34d399",
}: MetricSparklineProps) {
  const points = values.filter((v): v is number => v != null);
  if (points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 1);
  const pad = 3;

  const toX = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const toY = (v: number) => pad + (1 - (v - min) / range) * (height - pad * 2);

  const polyline = points.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="opacity-80"
      data-testid="metric-sparkline"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
