import type { DrillDiagramData, DrillDiagramElement } from "@shared/schema";
import courtAsset from "@/assets/drill-diagram/court.png";
import shotAsset from "@/assets/drill-diagram/shot-marker.png";
import startAsset from "@/assets/drill-diagram/start-marker.png";
import screenAsset from "@/assets/drill-diagram/screen-marker.png";
import coneAsset from "@/assets/drill-diagram/cone-marker.png";
import arrowAsset from "@/assets/drill-diagram/movement-arrow.png";

function DiagramMarker({ element }: { element: DrillDiagramElement }) {
  const x = element.x * 3.78;
  const y = element.y * 3.34;
  const asset = element.type === "shot" ? shotAsset : element.type === "start" ? startAsset : element.type === "screen" ? screenAsset : element.type === "cone" ? coneAsset : arrowAsset;

  if (element.type === "arrow") {
    const bendScale = 1 + (element.bend ?? 0) / 45;
    const lengthScale = (element.length ?? 18) / 18;
    return (
      <g transform={`translate(${x} ${y}) rotate(${element.angle ?? 0}) scale(${(element.scale ?? 1) * bendScale} ${ (element.scale ?? 1) * lengthScale})`}>
        <image href={asset} x="-30" y="-75" width="60" height="150" preserveAspectRatio="xMidYMid meet" />
      </g>
    );
  }

  const dimensions = element.type === "shot"
    ? { width: 42, height: 42 }
    : element.type === "start"
      ? { width: 36, height: 36 }
    : element.type === "screen"
      ? { width: 33, height: 31 }
      : { width: 30, height: 38 };

  return (
    <g transform={`translate(${x} ${y}) rotate(${element.angle ?? 0}) scale(${element.scale ?? 1})`}>
      <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet" />
      {element.type === "shot" && (element.shots ?? 10) !== 10 && (
        <>
          <circle r="12.2" fill="#171717" pointerEvents="none" />
          <text x="0" y="3.8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" pointerEvents="none">
            {element.shots}
          </text>
        </>
      )}
    </g>
  );
}

export function DrillDiagramPreview({ diagramData, className = "" }: { diagramData?: DrillDiagramData | null; className?: string }) {
  return (
    <svg viewBox="0 0 378 334" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Basketball drill court diagram" className={`block h-full w-full ${className}`}>
      <image href={courtAsset} x="0" y="0" width="378" height="334" preserveAspectRatio="none" />
      {diagramData?.elements?.map((element) => <DiagramMarker key={element.id} element={element} />)}
    </svg>
  );
}
