import type { DrillDiagramData, DrillDiagramElement } from "@shared/schema";

function DiagramMarker({ element }: { element: DrillDiagramElement }) {
  const x = Math.max(0, Math.min(100, element.x));
  const y = Math.max(0, Math.min(100, element.y));

  if (element.type === "shot") {
    return (
      <g>
        <circle cx={x} cy={y} r="5.1" fill="#202020" stroke="#e96b28" strokeWidth="1.1" />
        <circle cx={x} cy={y} r="3.55" fill="#f4f1e9" />
        <text x={x} y={y + 1.05} textAnchor="middle" fontSize="3.1" fontWeight="800" fill="#252525">
          {element.shots ?? 10}
        </text>
      </g>
    );
  }

  if (element.type === "start") {
    return (
      <g transform={`translate(${x} ${y})`}>
        <path d="M0 4.2c.2-2.7 1.25-4.1 2.7-4.1S5.2 1.4 5.4 4.2" fill="#202020" stroke="#e96b28" strokeWidth="1.1" strokeLinecap="round" />
        <circle cy="-2.3" r="1.65" fill="#e96b28" />
      </g>
    );
  }

  if (element.type === "screen") {
    return <path d={`M ${x} ${y - 5.3} L ${x + 5.4} ${y + 4.6} L ${x - 5.4} ${y + 4.6} Z`} fill="#202020" stroke="#e96b28" strokeWidth="1.15" strokeLinejoin="round" />;
  }

  if (element.type === "cone") {
    return <path d={`M ${x} ${y - 5.4} L ${x + 4.8} ${y + 4.4} L ${x - 4.8} ${y + 4.4} Z`} fill="#e96b28" stroke="#202020" strokeWidth="0.7" strokeLinejoin="round" />;
  }

  const angle = (element.angle ?? -45) * Math.PI / 180;
  const length = element.length ?? 18;
  const endX = x + Math.cos(angle) * length;
  const endY = y - Math.sin(angle) * length;
  const bend = element.bend ?? 0;
  const controlX = (x + endX) / 2 + Math.sin(angle) * bend;
  const controlY = (y + endY) / 2 + Math.cos(angle) * bend;
  return (
    <path
      d={`M ${x} ${y} Q ${controlX} ${controlY} ${endX} ${endY}`}
      fill="none"
      stroke="#e96b28"
      strokeWidth="1.15"
      strokeDasharray="1.5 1.4"
      strokeLinecap="round"
      markerEnd="url(#drill-diagram-arrow)"
    />
  );
}

export function DrillDiagramPreview({ diagramData, className = "" }: { diagramData?: DrillDiagramData | null; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Basketball drill court diagram" className={`block h-full w-full ${className}`}>
      <defs>
        <marker id="drill-diagram-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10Z" fill="#e96b28" />
        </marker>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="2" fill="#f4f1e9" />
      <g fill="none" stroke="#262626" strokeWidth="0.72" strokeLinejoin="round">
        <rect x="5" y="5" width="90" height="90" rx="0.5" />
        <path d="M5 28h17v44H5M95 28H78v44h17" />
        <circle cx="50" cy="28" r="17" />
        <path d="M33 28a17 17 0 0 0 34 0" />
        <circle cx="50" cy="11.5" r="2.1" />
        <path d="M47 14.5h6M5 5v23m90-23v23" />
        <path d="M5 5c0 31 20.1 53 45 53S95 36 95 5" strokeDasharray="1.5 1.4" />
        <path d="M5 95h90" />
      </g>
      {diagramData?.elements?.map((element) => <DiagramMarker key={element.id} element={element} />)}
    </svg>
  );
}
