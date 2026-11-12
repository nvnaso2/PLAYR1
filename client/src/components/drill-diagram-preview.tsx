import type { DrillDiagramData, DrillDiagramElement } from "@shared/schema";
import courtAsset from "@/assets/drill-diagram/court.png";
import startAsset from "@/assets/drill-diagram/start-marker.png";
import screenAsset from "@/assets/drill-diagram/screen-marker.png";
import coneAsset from "@/assets/drill-diagram/cone-marker.png";

function DiagramMarker({ element }: { element: DrillDiagramElement }) {
  const x = element.x * 3.88;
  const y = element.y * 3.34;

  if (element.type === "arrow") {
    const startX = (element.startX ?? element.x - 5) * 3.88;
    const startY = (element.startY ?? element.y - 5) * 3.34;
    const controlX = (element.controlX ?? element.x) * 3.88;
    const controlY = (element.controlY ?? element.y - 2) * 3.34;
    const endX = (element.endX ?? element.x + 5) * 3.88;
    const endY = (element.endY ?? element.y + 6) * 3.34;
    const angle = Math.atan2(endY - controlY, endX - controlX);
    const size = 8;
    const left = angle + Math.PI * 0.82;
    const right = angle - Math.PI * 0.82;
    const head = `M ${endX + Math.cos(left) * size} ${endY + Math.sin(left) * size} L ${endX} ${endY} L ${endX + Math.cos(right) * size} ${endY + Math.sin(right) * size}`;
    return (
      <>
        <path d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`} fill="none" stroke="#111" strokeWidth="3.5" strokeDasharray="8 6" strokeLinecap="round" />
        <path d={head} fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }

  if (element.type === "shot") {
    return (
      <g transform={`translate(${x} ${y}) rotate(${element.angle ?? 0}) scale(${element.scale ?? 1})`}>
        <circle r="17" fill="#f27670" />
        <circle r="13.5" fill="#171717" />
        <text x="0" y="4" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">{element.shots ?? 10}</text>
      </g>
    );
  }

  const asset = element.type === "start" ? startAsset : element.type === "screen" ? screenAsset : coneAsset;
  const dimensions = element.type === "start"
    ? { width: 36, height: 36 }
    : element.type === "screen"
      ? { width: 33, height: 31 }
      : { width: 30, height: 38 };

  return (
    <g transform={`translate(${x} ${y}) rotate(${element.angle ?? 0}) scale(${element.scale ?? 1})`}>
      <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet" />
    </g>
  );
}

export function DrillDiagramPreview({ diagramData, className = "" }: { diagramData?: DrillDiagramData | null; className?: string }) {
  return (
    <svg viewBox="0 0 388 334" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Basketball drill court diagram" className={`block h-full w-full ${className}`}>
      <image href={courtAsset} x="0" y="0" width="388" height="334" preserveAspectRatio="none" />
      {diagramData?.elements?.map((element) => <DiagramMarker key={element.id} element={element} />)}
    </svg>
  );
}
