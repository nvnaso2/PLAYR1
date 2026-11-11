import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
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
        : { width: 48, height: 120 };
  const angle = element.angle ?? 0;
  const lengthScale = (element.length ?? 18) / 18;
  const bendScale = 1 + (element.bend ?? 0) / 45;
  return (
    <g
      transform={`translate(${x} ${y})`}
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
        <g transform={`rotate(${angle}) scale(${bendScale} ${lengthScale})`}>
          <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="none" />
        </g>
      ) : (
        <image href={asset} x={-dimensions.width / 2} y={-dimensions.height / 2} width={dimensions.width} height={dimensions.height} preserveAspectRatio="none" />
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

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-zinc-300">
        {label}<span className="font-mono text-zinc-500">{value}{suffix}</span>
      </span>
      <input
        aria-label={label}
        className="h-1.5 w-full cursor-pointer accent-orange-500"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function TinyIcon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center text-base leading-none">{children}</span>;
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
       ...(type === "arrow" ? { angle: 0, length: 18, bend: 0 } : {}),
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
    <section aria-label="Drill diagram editor" className="flex w-full min-w-0 flex-col rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100">
      <div className="flex min-w-0 items-center justify-between gap-3 border-b border-zinc-800 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-100">Court diagram</h3>
          <p className="mt-0.5 text-[10px] text-zinc-500">Add a mark, then drag it into place.</p>
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

      <div className="min-h-[200px] min-w-0 flex-1 px-2.5 py-2.5 sm:px-4 sm:py-3">
        <div className="relative mx-auto aspect-[189/167] w-full max-w-[560px] overflow-hidden rounded-lg border border-zinc-700 bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.3)]">
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

      <div className="min-h-[58px] border-t border-zinc-800 px-3 py-2.5 sm:px-4">
        {selected ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300">
                  {selected.type === "start" ? "Player start" : selected.type}
                </span>
                <span className="text-[9px] text-zinc-600">·</span>
                <span className="truncate text-[9px] text-zinc-500">Drag or use arrow keys</span>
              </div>
              <button
                type="button"
                onClick={removeSelected}
                className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-zinc-500 transition-colors hover:bg-red-950/40 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-label={`Remove ${selected.type} marker`}
              >
                <TinyIcon>−</TinyIcon> Remove
              </button>
            </div>
            {selected.type === "shot" && (
              <label className="flex items-center justify-between gap-3 text-[11px] text-zinc-300">
                <span className="font-semibold">Shot count</span>
                <input
                  aria-label="Shot count"
                  type="number"
                  min={1}
                  max={99}
                  value={selected.shots ?? 10}
                  onChange={(event) => updateElement(selected.id, { shots: clamp(Number(event.currentTarget.value) || 1, 1, 99) })}
                  className="h-8 w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 text-right font-mono text-xs text-zinc-100 outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/40"
                />
              </label>
            )}
            {selected.type === "arrow" && (
              <div className="grid grid-cols-3 gap-3">
                <RangeControl label="Angle" value={Math.round(selected.angle ?? 0)} min={0} max={359} step={1} suffix="°" onChange={(angle) => updateElement(selected.id, { angle })} />
                <RangeControl label="Length" value={Math.round(selected.length ?? 18)} min={6} max={40} step={1} suffix="" onChange={(length) => updateElement(selected.id, { length })} />
                <RangeControl label="Bend" value={Math.round(selected.bend ?? 0)} min={-18} max={18} step={1} suffix="" onChange={(bend) => updateElement(selected.id, { bend })} />
              </div>
            )}
          </div>
        ) : (
          <p className="flex min-h-8 items-center justify-center gap-1.5 text-center text-[10px] text-zinc-500">
            {diagram.elements.length === 0
              ? "Choose a marker above to start your play."
              : "Select a mark to edit it. Press Delete to remove."}
          </p>
        )}
      </div>
    </section>
  );
}
