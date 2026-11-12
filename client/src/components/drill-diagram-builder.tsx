import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { Minus, Plus, RotateCcw, RotateCw, Trash2 } from "lucide-react";
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

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `diagram-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function ToolGlyph({ type }: { type: DrillDiagramElementType }) {
  const asset = type === "shot" ? shotAsset : type === "start" ? startAsset : type === "screen" ? screenAsset : type === "cone" ? coneAsset : arrowAsset;
  if (type === "arrow") {
    return (
      <span className="flex h-9 w-8 items-center justify-center rounded-md bg-white p-1">
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
  onKeyDown,
}: {
  element: DrillDiagramElement;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGGElement>) => void;
  onKeyDown: (event: KeyboardEvent<SVGGElement>) => void;
}) {
  const x = element.x * 3.78;
  const y = element.y * 3.34;
  const asset = element.type === "shot" ? shotAsset : element.type === "start" ? startAsset : element.type === "screen" ? screenAsset : element.type === "cone" ? coneAsset : arrowAsset;
  const dimensions = element.type === "shot" || element.type === "start"
    ? { width: 36, height: 36 }
    : element.type === "screen"
      ? { width: 33, height: 31 }
      : element.type === "cone"
        ? { width: 30, height: 38 }
        : { width: 60, height: 150 };
  const angle = element.angle ?? 0;
  const lengthScale = (element.length ?? 18) / 18;
  const bendScale = 1 + (element.bend ?? 0) / 45;
  const iconScale = element.scale ?? 1;
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
      {element.type === "arrow" ? (
        <g transform={`scale(${bendScale} ${lengthScale})`}>
          <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet" />
        </g>
      ) : (
        <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="xMidYMid meet" />
      )}
      {element.type === "shot" && (element.shots ?? 10) !== 10 && (
        <>
          <circle r="12.2" fill="#171717" pointerEvents="none" />
          <text x="0" y="3.8" textAnchor="middle" fontSize="10" fontWeight="800" fill="#fff" className="select-none" pointerEvents="none">{element.shots}</text>
        </>
      )}
    </g>
  );
}

export function DrillDiagramBuilder({ value, onChange }: DrillDiagramBuilderProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const diagram = value ?? { version: 1 as const, elements: [] };
  const selected = diagram.elements.find((element) => element.id === selectedId) ?? null;

  const publishElements = (elements: DrillDiagramElement[]) => {
    onChange({ version: 1, elements });
  };

  const updateElement = (id: string, patch: Partial<DrillDiagramElement>) => {
    publishElements(diagram.elements.map((element) => element.id === id ? { ...element, ...patch } : element));
  };

  const addElement = (type: DrillDiagramElementType) => {
    const locations: Record<DrillDiagramElementType, { x: number; y: number }> = {
      shot: { x: 50, y: 44 },
      start: { x: 50, y: 79 },
      screen: { x: 43, y: 59 },
      cone: { x: 64, y: 67 },
      arrow: { x: 50, y: 71 },
    };
    const element: DrillDiagramElement = {
      id: makeId(),
      type,
      ...locations[type],
      ...(type === "shot" ? { shots: 10 } : {}),
      angle: 0,
      scale: 1,
      ...(type === "arrow" ? { length: 18, bend: 0 } : {}),
    };
    publishElements([...diagram.elements, element]);
    setSelectedId(element.id);
  };

  const eventPosition = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100),
      y: clamp(((event.clientY - bounds.top) / bounds.height) * 100, 0, 100),
    };
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const position = eventPosition(event);
    updateElement(dragRef.current.id, { x: position.x, y: position.y });
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
    dragRef.current = { id, pointerId: event.pointerId };
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

  const removeSelected = () => {
    if (!selected) return;
    publishElements(diagram.elements.filter((element) => element.id !== selected.id));
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
        <div className="relative mx-auto aspect-[189/167] w-full max-w-[min(92vw,900px)] overflow-visible rounded-lg border border-zinc-700 bg-white">
          <svg
            ref={svgRef}
            viewBox="0 0 378 334"
            preserveAspectRatio="none"
            role="group"
            aria-label="Basketball half court. Use the marker controls to add symbols, then drag to reposition."
            className="absolute inset-0 h-full w-full"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: "none" }}
          >
            <image href={courtAsset} x="0" y="0" width="378" height="334" preserveAspectRatio="none" />
            {diagram.elements.map((element) => (
              <DiagramMark
                key={element.id}
                element={element}
                selected={selected?.id === element.id}
                onPointerDown={(event) => handleMarkerPointerDown(element.id, event)}
                onKeyDown={(event) => handleMarkerKeyDown(element.id, event)}
              />
            ))}
          </svg>
          {diagram.elements.length === 0 && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[61%] flex justify-center">
              <span className="rounded-full border border-zinc-500/50 bg-[#efede5]/90 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                Add your first mark
              </span>
            </div>
          )}
        </div>
      </div>

        {selected && (
          <div className="absolute right-3 top-3 z-10 w-[min(21rem,calc(100%-1.5rem))] rounded-xl border border-orange-500/60 bg-[#101010]/95 p-3 shadow-2xl backdrop-blur-sm sm:right-5 sm:top-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="truncate text-[10px] font-bold uppercase tracking-[.16em] text-orange-300">
                Edit {selected.type === "start" ? "player start" : selected.type}
              </span>
              <button type="button" onClick={removeSelected} aria-label={`Remove ${selected.type} marker`} className="rounded-full p-1.5 text-zinc-400 hover:bg-red-950 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selected.type === "shot" && (
                <label className="mr-auto flex items-center gap-2 text-xs text-zinc-300">
                  Shots
                  <input aria-label="Shot count" type="number" min={1} max={99} value={selected.shots ?? 10}
                    onChange={(event) => updateElement(selected.id, { shots: clamp(Number(event.currentTarget.value) || 1, 1, 99) })}
                    className="h-9 w-16 rounded-lg border border-zinc-700 bg-black px-2 text-center text-sm text-white outline-none focus:border-orange-400" />
                </label>
              )}
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">Size</span>
              <button type="button" aria-label="Shrink marker" onClick={() => updateElement(selected.id, { scale: clamp((selected.scale ?? 1) - 0.1, 0.5, 2) })} className="rounded-lg border border-zinc-700 p-2 text-zinc-200 hover:border-orange-400"><Minus className="h-4 w-4" /></button>
              <button type="button" aria-label="Enlarge marker" onClick={() => updateElement(selected.id, { scale: clamp((selected.scale ?? 1) + 0.1, 0.5, 2) })} className="rounded-lg border border-zinc-700 p-2 text-zinc-200 hover:border-orange-400"><Plus className="h-4 w-4" /></button>
              <span className="ml-1 text-[10px] uppercase tracking-wider text-zinc-500">Rotate</span>
              <button type="button" aria-label="Rotate marker counterclockwise" onClick={() => updateElement(selected.id, { angle: ((selected.angle ?? 0) - 15 + 360) % 360 })} className="rounded-lg border border-zinc-700 p-2 text-zinc-200 hover:border-orange-400"><RotateCcw className="h-4 w-4" /></button>
              <button type="button" aria-label="Rotate marker clockwise" onClick={() => updateElement(selected.id, { angle: ((selected.angle ?? 0) + 15) % 360 })} className="rounded-lg border border-zinc-700 p-2 text-zinc-200 hover:border-orange-400"><RotateCw className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      <div className="min-h-[44px] border-t border-zinc-800 px-3 py-2 sm:px-4">
        {selected ? (
          <p className="text-center text-[10px] text-zinc-500">Use the on-court controls to resize, rotate, or edit shots.</p>
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
