export type RingSegment = {
  label: string;
  value: number;
  color: string;
  count: number | string;
};

export type ArchetypeRingChartProps = {
  rings: [RingSegment, RingSegment, RingSegment];
  centerLabel: string;
  centerSub: string;
  size?: number;
};

export function ArchetypeRingChart({
  rings,
  centerLabel,
  centerSub,
  size = 220,
}: ArchetypeRingChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const sw = size * 0.09;
  const radii = [size * 0.42, size * 0.31, size * 0.20];

  return (
    <div className="flex flex-col items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {rings.map((ring, i) => (
            <filter key={`gf-${i}`} id={`gf-${i}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {rings.map((ring, i) => {
          const r = radii[i];
          const circ = 2 * Math.PI * r;
          const filled = Math.max(0, Math.min(1, ring.value));
          const offset = circ * (1 - filled);
          return (
            <g key={ring.label} transform={`rotate(-90, ${cx}, ${cy})`}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#1f2937"
                strokeWidth={sw}
              />
              {filled > 0.01 && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={sw}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
                  filter={`url(#gf-${i})`}
                />
              )}
            </g>
          );
        })}

        <text
          x={cx}
          y={cy - size * 0.04}
          textAnchor="middle"
          fill="white"
          fontSize={size * 0.1}
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          {centerLabel}
        </text>
        <text
          x={cx}
          y={cy + size * 0.09}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={size * 0.055}
          fontFamily="system-ui, sans-serif"
        >
          {centerSub}
        </text>
      </svg>

      <div className="flex gap-6">
        {rings.map((ring) => (
          <div key={ring.label} className="flex flex-col items-center gap-1">
            <div className="w-6 h-1 rounded-full" style={{ background: ring.color }} />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{ring.label}</span>
            <span className="text-sm font-bold text-zinc-200">{ring.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
