import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import courtAsset from "@/assets/drill-diagram/court.png";
import shotAsset from "@/assets/drill-diagram/shot-marker.png";
import startAsset from "@/assets/drill-diagram/start-marker.png";
import screenAsset from "@/assets/drill-diagram/screen-marker.png";
import coneAsset from "@/assets/drill-diagram/cone-marker.png";
import arrowAsset from "@/assets/drill-diagram/movement-arrow.png";

export type DrillDiagramElementType = "shot" | "start" | "screen" | "cone" | "arrow";

export interface DrillDiagramElement {
  id: string;
  type: DrillDiagramElementType;
  x: number;
  y: number;
  shots?: number;
  angle?: number;
  length?: number;
  bend?: number;
  scale?: number;
  startX?: number;
  startY?: number;
  controlX?: number;
  controlY?: number;
  endX?: number;
  endY?: number;
}

export interface DrillDiagram {
  version: 1;
  elements: DrillDiagramElement[];
}

export interface DrillDiagramBuilderProps {
  value: DrillDiagram | null;
  onChange: (value: DrillDiagram) => void;
}

const toolOptions: { type: DrillDiagramElementType; label: string; hint: string }[] = [
  { type: "shot", label: "Shot", hint: "Add shot marker" },
  { type: "start", label: "Start", hint: "Add player start" },
  { type: "screen", label: "Screen", hint: "Add screen marker" },
  { type: "cone", label: "Cone", hint: "Add cone" },
  { type: "arrow", label: "Arrow", hint: "Add movement arrow" },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const COURT_WIDTH = 388;
const COURT_HEIGHT = 334;
const COURT_VIEW_WIDTH = 462;
const COURT_VIEW_HEIGHT = 398;
const COURT_OFFSET_X = 37;
const COURT_OFFSET_Y = 32;

type ArrowPoints = { startX: number; startY: number; controlX: number; controlY: number; endX: number; endY: number };

function getArrowPoints(element: DrillDiagramElement): ArrowPoints {
  return {
    startX: element.startX ?? clamp(element.x - 5, 0, 100),
    startY: element.startY ?? clamp(element.y - 5, 0, 100),
    controlX: element.controlX ?? element.x,
    controlY: element.controlY ?? clamp(element.y - 2, 0, 100),
    endX: element.endX ?? clamp(element.x + 5, 0, 100),
    endY: element.endY ?? clamp(element.y + 6, 0, 100),
  };
}

function arrowHeadPath(endX: number, endY: number, controlX: number, controlY: number) {
  const angle = Math.atan2(endY - controlY, endX - controlX);
  const size = 8;
  const left = angle + Math.PI * 0.82;
  const right = angle - Math.PI * 0.82;
  return `M ${endX + Math.cos(left) * size} ${endY + Math.sin(left) * size} L ${endX} ${endY} L ${endX + Math.cos(right) * size} ${endY + Math.sin(right) * size}`;
}

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `diagram-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToolGlyph({ type }: { type: DrillDiagramElementType }) {
  const asset = type === "shot" ? shotAsset : type === "start" ? startAsset : type === "screen" ? screenAsset : type === "cone" ? coneAsset : arrowAsset;
  if (type === "arrow" || type === "shot") {
    return (
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white p-1">
        <img src={asset} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }
  return <img src={asset} alt="" className="h-7 w-7 object-contain" />;
}

function DiagramMark({
  element,
  selected,
  onPointerDown,
  onHandlePointerDown,
  onArrowPointPointerDown,
  onKeyDown,
}: {
  element: DrillDiagramElement;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
  onHandlePointerDown: (mode: "resize" | "rotate", event: PointerEvent<SVGCircleElement>) => void;
  onArrowPointPointerDown: (point: "start" | "control" | "end", event: PointerEvent<SVGCircleElement>) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
}) {
  const x = element.x * 3.88;
  const y = element.y * 3.34;
  const asset = element.type === "shot" ? shotAsset : element.type === "start" ? startAsset : element.type === "screen" ? screenAsset : element.type === "cone" ? coneAsset : arrowAsset;
  if (element.type === "arrow") {
    const points = getArrowPoints(element);
    const startX = points.startX * 3.88;
    const startY = points.startY * 3.34;
    const controlX = points.controlX * 3.88;
    const controlY = points.controlY * 3.34;
    const endX = points.endX * 3.88;
    const endY = points.endY * 3.34;
    const boxLeft = Math.min(startX, controlX, endX);
    const boxTop = Math.min(startY, controlY, endY);
    const boxWidth = Math.max(12, Math.max(startX, controlX, endX) - boxLeft);
    const boxHeight = Math.max(12, Math.max(startY, controlY, endY) - boxTop);
    return (
      <g
        className="cursor-grab outline-none active:cursor-grabbing"
        role="button"
        tabIndex={0}
        aria-label="Movement arrow. Drag its three points to shape the path."
        aria-pressed={selected}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        style={{ touchAction: "none" }}
      >
        <path d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`} fill="none" stroke="transparent" strokeWidth="28" pointerEvents="stroke" />
        <path d={arrowHeadPath(endX, endY, controlX, controlY)} fill="none" stroke="transparent" strokeWidth="24" pointerEvents="stroke" />
        <path d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`} fill="none" stroke="#111" strokeWidth="3.5" strokeDasharray="8 6" strokeLinecap="round" pointerEvents="none" />
        <path d={arrowHeadPath(endX, endY, controlX, controlY)} fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
        {selected && (
          <>
            <rect x={boxLeft - 4} y={boxTop - 4} width={boxWidth + 8} height={boxHeight + 8} fill="none" stroke="#111" strokeWidth="1.5" pointerEvents="none" />
            <circle cx={startX} cy={startY} r="6" fill="#fff" stroke="#9ca3af" strokeWidth="1.5" className="cursor-move" onPointerDown={(event) => onArrowPointPointerDown("start", event)} />
            <circle cx={controlX} cy={controlY} r="6" fill="#fff" stroke="#9ca3af" strokeWidth="1.5" className="cursor-move" onPointerDown={(event) => onArrowPointPointerDown("control", event)} />
            <circle cx={endX} cy={endY} r="6" fill="#fff" stroke="#9ca3af" strokeWidth="1.5" className="cursor-move" onPointerDown={(event) => onArrowPointPointerDown("end", event)} />
          </>
        )}
      </g>
    );
  }
  const dimensions = element.type === "shot"
    ? { width: 36, height: 36 }
    : element.type === "start"
      ? { width: 36, height: 36 }
    : element.type === "screen"
      ? { width: 33, height: 31 }
      : element.type === "cone"
        ? { width: 30, height: 38 }
        : { width: 60, height: 150 };
  const angle = element.angle ?? 0;
  const iconScale = element.scale ?? 1;
  const boxWidth = dimensions.width;
  const boxHeight = dimensions.height;
  const corners = [
    [-boxWidth / 2, -boxHeight / 2],
    [boxWidth / 2, -boxHeight / 2],
    [-boxWidth / 2, boxHeight / 2],
    [boxWidth / 2, boxHeight / 2],
  ];
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${iconScale})`}
      className="cursor-grab outline-none active:cursor-grabbing"
      role="button"
      tabIndex={0}
      aria-label={`${element.type} marker${element.type === "shot" ? `, ${element.shots ?? 10} shots` : ""}. Drag to reposition.`}
      aria-pressed={selected}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      style={{ touchAction: "none" }}
    >
      <rect
        x={-dimensions.width / 2 - 10}
        y={-dimensions.height / 2 - 10}
        width={dimensions.width + 20}
        height={dimensions.height + 20}
        fill="transparent"
        pointerEvents="all"
      />
      {element.type === "shot" ? (
        <>
          <circle r="17" fill="#f27670" />
          <circle r="13.5" fill="#171717" />
          {!selected && <text x="0" y="4" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff" className="select-none" pointerEvents="none">{element.shots ?? 10}</text>}
        </>
      ) : (
        <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet" />
      )}
      {selected && (
        <g pointerEvents="none">
          <rect
            x={-boxWidth / 2}
            y={-boxHeight / 2}
            width={boxWidth}
            height={boxHeight}
            fill="none"
            stroke="#111827"
            strokeWidth="1.5"
          />
          {corners.map(([cx, cy], index) => (
              <circle
                key={index}
                cx={cx}
                cy={cy}
                r="5.5"
                fill="#fff"
                stroke="#9ca3af"
                strokeWidth="1.5"
                pointerEvents="all"
                className="cursor-nwse-resize"
                onPointerDown={(event) => onHandlePointerDown("resize", event)}
              />
          ))}
          <line x1="0" y1={-boxHeight / 2} x2="0" y2={-boxHeight / 2 - 15} stroke="#9ca3af" strokeWidth="1.5" />
          <circle
            cx="0"
            cy={-boxHeight / 2 - 19}
            r="6"
            fill="#fff"
            stroke="#9ca3af"
            strokeWidth="1.5"
            pointerEvents="all"
            className="cursor-grab"
            onPointerDown={(event) => onHandlePointerDown("rotate", event)}
          />
        </g>
      )}
    </g>
  );
}

export function DrillDiagramBuilder({ value, onChange }: DrillDiagramBuilderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    mode: "move" | "resize" | "rotate" | "arrowPoint";
    arrowPoint?: "start" | "control" | "end";
    startPoints?: ArrowPoints;
    startScale: number;
    startDistance: number;
    startAngle: number;
    startPointerAngle: number;
    startPointerX: number;
    startPointerY: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shotCountDraft, setShotCountDraft] = useState<{ id: string; value: string } | null>(null);
  const diagram = value ?? { version: 1 as const, elements: [] };
  const selected = diagram.elements.find((element) => element.id === selectedId) ?? null;

  const publishElements = (elements: DrillDiagramElement[]) => {
    onChange({ version: 1, elements });
  };

  const updateElement = (id: string, patch: Partial<DrillDiagramElement>) => {
    publishElements(diagram.elements.map((element) => element.id === id ? { ...element, ...patch } : element));
  };

  const commitShotCount = (id: string, draft: string) => {
    const digits = draft.replace(/\D/g, "").slice(0, 2);
    if (digits) updateElement(id, { shots: clamp(Number(digits), 1, 99) });
    setShotCountDraft(null);
  };

  const addElement = (type: DrillDiagramElementType) => {
    const locations: Record<DrillDiagramElementType, { x: number; y: number }> = {
      shot: { x: 50, y: 44 },
      start: { x: 50, y: 79 },
      screen: { x: 43, y: 59 },
      cone: { x: 64, y: 67 },
      arrow: { x: 50, y: 68 },
    };
    const element: DrillDiagramElement = {
      id: makeId(),
      type,
      ...locations[type],
      ...(type === "shot" ? { shots: 10 } : {}),
      angle: 0,
      scale: 1,
      ...(type === "arrow" ? { startX: 42, startY: 64, controlX: 50, controlY: 59, endX: 58, endY: 73 } : {}),
    };
    publishElements([...diagram.elements, element]);
    setSelectedId(element.id);
  };

  const positionFromClient = (clientX: number, clientY: number, bounds: DOMRect) => {
    const x = ((clientX - bounds.left) / bounds.width) * COURT_VIEW_WIDTH - COURT_OFFSET_X;
    const y = ((clientY - bounds.top) / bounds.height) * COURT_VIEW_HEIGHT - COURT_OFFSET_Y;
    return {
      x: (x / COURT_WIDTH) * 100,
      y: (y / COURT_HEIGHT) * 100,
      rawX: x,
      rawY: y,
    };
  };

  const eventPosition = (event: PointerEvent<SVGSVGElement>) =>
    positionFromClient(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const position = eventPosition(event);
    const drag = dragRef.current;
    if (drag.mode === "move") {
      const current = diagram.elements.find((element) => element.id === drag.id);
      if (current?.type === "arrow" && drag.startPoints) {
        const dx = position.x - drag.startPointerX;
        const dy = position.y - drag.startPointerY;
        updateElement(drag.id, {
          startX: clamp(drag.startPoints.startX + dx, 0, 100),
          startY: clamp(drag.startPoints.startY + dy, 0, 100),
          controlX: clamp(drag.startPoints.controlX + dx, 0, 100),
          controlY: clamp(drag.startPoints.controlY + dy, 0, 100),
          endX: clamp(drag.startPoints.endX + dx, 0, 100),
          endY: clamp(drag.startPoints.endY + dy, 0, 100),
        });
        return;
      }
      updateElement(drag.id, { x: position.x, y: position.y });
      return;
    }
    if (drag.mode === "arrowPoint" && drag.arrowPoint) {
      const prefix = drag.arrowPoint === "start" ? "start" : drag.arrowPoint === "control" ? "control" : "end";
      updateElement(drag.id, { [`${prefix}X`]: position.x, [`${prefix}Y`]: position.y } as Partial<DrillDiagramElement>);
      return;
    }
    const current = diagram.elements.find((element) => element.id === drag.id);
    if (!current) return;
    const centerX = current.x * 3.88;
    const centerY = current.y * 3.34;
    const pointerAngle = Math.atan2(position.rawY - centerY, position.rawX - centerX) * 180 / Math.PI;
    if (drag.mode === "resize") {
      const distance = Math.hypot(position.rawX - centerX, position.rawY - centerY);
      updateElement(drag.id, { scale: clamp(drag.startScale * distance / Math.max(drag.startDistance, 1), 0.5, 2) });
    } else if (drag.mode === "rotate") {
      const difference = ((pointerAngle - drag.startPointerAngle + 540) % 360) - 180;
      updateElement(drag.id, { angle: (drag.startAngle + difference + 360) % 360 });
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  };

  const handleMarkerPointerDown = (id: string, event: PointerEvent<SVGGElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(id);
    const element = diagram.elements.find((item) => item.id === id);
    const bounds = svgRef.current?.getBoundingClientRect();
    const position = bounds ? positionFromClient(event.clientX, event.clientY, bounds) : { x: 0, y: 0 };
    dragRef.current = {
      id, pointerId: event.pointerId, mode: "move", startScale: 1, startDistance: 1,
      startAngle: 0, startPointerAngle: 0, startPointerX: position.x, startPointerY: position.y,
      ...(element?.type === "arrow" ? { startPoints: getArrowPoints(element) } : {}),
    };
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleTransformPointerDown = (id: string, mode: "resize" | "rotate", event: PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const element = diagram.elements.find((item) => item.id === id);
    if (!element) return;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = positionFromClient(event.clientX, event.clientY, bounds);
    const pointerX = position.rawX;
    const pointerY = position.rawY;
    const centerX = element.x * 3.88;
    const centerY = element.y * 3.34;
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      mode,
      startScale: element.scale ?? 1,
      startDistance: Math.hypot(pointerX - centerX, pointerY - centerY),
      startAngle: element.angle ?? 0,
      startPointerAngle: Math.atan2(pointerY - centerY, pointerX - centerX) * 180 / Math.PI,
      startPointerX: pointerX,
      startPointerY: pointerY,
    };
    setSelectedId(id);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleArrowPointPointerDown = (id: string, point: "start" | "control" | "end", event: PointerEvent<SVGCircleElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const element = diagram.elements.find((item) => item.id === id);
    if (!element || element.type !== "arrow") return;
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = {
      id,
      pointerId: event.pointerId,
      mode: "arrowPoint",
      arrowPoint: point,
      startScale: 1,
      startDistance: 1,
      startAngle: 0,
      startPointerAngle: 0,
      startPointerX: positionFromClient(event.clientX, event.clientY, bounds).x,
      startPointerY: positionFromClient(event.clientX, event.clientY, bounds).y,
      startPoints: getArrowPoints(element),
    };
    setSelectedId(id);
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleMarkerKeyDown = (id: string, event: KeyboardEvent<SVGGElement>) => {
    const selectedElement = diagram.elements.find((element) => element.id === id);
    if (!selectedElement) return;
    const nudge = event.shiftKey ? 3 : 1;
    const moves: Record<string, Partial<DrillDiagramElement>> = {
      ArrowUp: { y: clamp(selectedElement.y - nudge, 0, 100) },
      ArrowDown: { y: clamp(selectedElement.y + nudge, 0, 100) },
      ArrowLeft: { x: clamp(selectedElement.x - nudge, 0, 100) },
      ArrowRight: { x: clamp(selectedElement.x + nudge, 0, 100) },
    };
    if (moves[event.key]) {
      event.preventDefault();
      event.stopPropagation();
      setSelectedId(id);
      updateElement(id, moves[event.key]);
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      publishElements(diagram.elements.filter((element) => element.id !== id));
      setSelectedId(null);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedId(id);
    }
  };

  const clearCourt = () => {
    publishElements([]);
    setSelectedId(null);
  };

  return (
    <section aria-label="Drill diagram editor" className="flex h-full min-h-0 w-full min-w-0 flex-col bg-black text-zinc-100">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-100">Court diagram</h3>
          <p className="mt-0.5 text-[10px] text-zinc-500">Tap a marker to add it. Drag to position.</p>
        </div>
        <button
          type="button"
          onClick={clearCourt}
          disabled={diagram.elements.length === 0}
          className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:border-orange-500/60 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Clear court diagram"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1.5 border-b border-zinc-800 px-2.5 py-2 sm:gap-2 sm:px-3">
        {toolOptions.map(({ type, label, hint }) => (
          <button
            key={type}
            type="button"
            onClick={() => addElement(type)}
            aria-label={hint}
            className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900/70 px-1 py-2 text-zinc-400 transition-colors hover:border-orange-500/60 hover:bg-zinc-900 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <ToolGlyph type={type} />
            <span className="truncate text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">{label}</span>
          </button>
        ))}
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1 overflow-auto px-2 py-2 sm:px-4 sm:py-3">
        <div
          className="relative mx-auto aspect-[231/199] max-w-full overflow-visible bg-white"
          style={{ width: "min(100%, 900px, calc(116dvh - 255px))" }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${COURT_VIEW_WIDTH} ${COURT_VIEW_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label="Basketball half court. Use the marker controls to add symbols, then drag to reposition."
            className="absolute inset-0 h-full w-full"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerDown={() => {
              setSelectedId(null);
            }}
            style={{ touchAction: "none" }}
          >
            <g transform={`translate(${COURT_OFFSET_X} ${COURT_OFFSET_Y})`}>
              <image href={courtAsset} x="0" y="0" width={COURT_WIDTH} height={COURT_HEIGHT} preserveAspectRatio="xMidYMid meet" />
              {diagram.elements.map((element) => (
                <DiagramMark
                  key={element.id}
                  element={element}
                  selected={selected?.id === element.id}
                  onPointerDown={(event) => handleMarkerPointerDown(element.id, event)}
                  onHandlePointerDown={(mode, event) => handleTransformPointerDown(element.id, mode, event)}
                  onArrowPointPointerDown={(point, event) => handleArrowPointPointerDown(element.id, point, event)}
                  onKeyDown={(event) => handleMarkerKeyDown(element.id, event)}
                />
              ))}
            </g>
          </svg>
          {selected?.type === "shot" && (
            <div
              className="absolute z-50 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#171717]"
              style={{
                left: `${((COURT_OFFSET_X + selected.x * 3.88) / COURT_VIEW_WIDTH) * 100}%`,
                top: `${((COURT_OFFSET_Y + selected.y * 3.34) / COURT_VIEW_HEIGHT) * 100}%`,
                width: 28,
                height: 28,
                pointerEvents: "auto",
              }}
            >
              <input
                aria-label="Shot count"
                autoFocus
                inputMode="numeric"
                maxLength={2}
                value={shotCountDraft?.id === selected.id ? shotCountDraft.value : String(selected.shots ?? 10)}
                onPointerDown={(event) => event.stopPropagation()}
                onFocus={(event) => {
                  setShotCountDraft({ id: selected.id, value: String(selected.shots ?? 10) });
                  event.currentTarget.select();
                }}
                onChange={(event) => {
                  const value = event.currentTarget.value.replace(/\D/g, "").slice(0, 2);
                  setShotCountDraft({ id: selected.id, value });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
                onBlur={(event) => commitShotCount(selected.id, event.currentTarget.value)}
                className="h-full w-full rounded-full border-0 bg-transparent p-0 text-center text-[13px] font-extrabold leading-none text-white caret-white outline-none"
              />
            </div>
          )}
          {diagram.elements.length === 0 && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[61%] flex justify-center">
              <span className="rounded-full border border-zinc-500/50 bg-[#efede5]/90 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Add your first mark
              </span>
            </div>
          )}
        </div>
      </div>
      </div>

      <div className="min-h-[44px] border-t border-zinc-800 px-3 py-2 sm:px-4">
        {selected ? (
          <p className="text-center text-[10px] text-zinc-500">Drag a corner to resize, the top handle to rotate, or the mark to move.</p>
        ) : (
          <p className="flex min-h-6 items-center justify-center gap-1.5 text-center text-[10px] text-zinc-500">
            {diagram.elements.length === 0
              ? "Choose a marker above to start your play."
              : "Select a mark to edit it. Press Delete to remove."}
          </p>
        )}
      </div>
    </section>
  );
}
