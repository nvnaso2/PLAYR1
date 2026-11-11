import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";

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
  if (type === "shot") {
    return <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-orange-400 text-[9px] font-black text-orange-300">10</span>;
  }
  if (type === "start") {
    return <span className="relative block h-5 w-5 rounded-full border-2 border-orange-400"><span className="absolute left-1/2 top-0.5 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-orange-300" /><span className="absolute bottom-0.5 left-1/2 h-1.5 w-2 -translate-x-1/2 rounded-t-full bg-orange-300" /></span>;
  }
  if (type === "screen") {
    return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5"><path d="M4 16 10 4l6 12H4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  }
  if (type === "cone") {
    return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5"><path d="m10 3 7 13H3L10 3Z" fill="currentColor" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 22 20" className="h-5 w-5"><path d="M3 16 17 5M12 5h5v5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CourtLines() {
  return (
    <g fill="none" stroke="#262626" strokeWidth="0.72" vectorEffect="non-scaling-stroke">
      <rect x="5" y="5" width="90" height="90" rx="0.5" />
      <path d="M5 28h17v44H5M95 28H78v44h17" />
      <circle cx="50" cy="28" r="17" />
      <path d="M33 28a17 17 0 0 0 34 0" />
      <circle cx="50" cy="11.5" r="2.1" />
      <path d="M47 14.5h6M5 5v23m90-23v23" />
      <path d="M5 5c0 31 20.1 53 45 53S95 36 95 5" strokeDasharray="1.5 1.4" />
      <path d="M5 95h90" />
    </g>
  );
}

function ArrowShape({ element, selected }: { element: DrillDiagramElement; selected: boolean }) {
  const angle = ((element.angle ?? 0) * Math.PI) / 180;
  const length = element.length ?? 18;
  const endX = element.x + Math.cos(angle) * length;
  const endY = element.y - Math.sin(angle) * length;
  const bend = element.bend ?? 0;
  const midX = (element.x + endX) / 2 + Math.sin(angle) * bend;
  const midY = (element.y + endY) / 2 + Math.cos(angle) * bend;
  const d = bend === 0
    ? `M ${element.x} ${element.y} L ${endX} ${endY}`
    : `M ${element.x} ${element.y} Q ${midX} ${midY} ${endX} ${endY}`;
  const tangentX = endX - midX;
  const tangentY = endY - midY;
  const tangentAngle = Math.atan2(tangentY, tangentX);
  const headLength = 4.2;
  const leftX = endX - headLength * Math.cos(tangentAngle - Math.PI / 6);
  const leftY = endY - headLength * Math.sin(tangentAngle - Math.PI / 6);
  const rightX = endX - headLength * Math.cos(tangentAngle + Math.PI / 6);
  const rightY = endY - headLength * Math.sin(tangentAngle + Math.PI / 6);
  return (
    <g fill="none" stroke="#ea6b27" strokeWidth={selected ? "1.4" : "1.15"} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
      <path d={d} />
      <path d={`M ${leftX} ${leftY} L ${endX} ${endY} L ${rightX} ${rightY}`} />
    </g>
  );
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
  const stroke = selected ? "#f3a36c" : "#e96b28";
  return (
    <g
      transform={`translate(${element.x} ${element.y})`}
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
        <>
          <g transform={`translate(${-element.x} ${-element.y})`}>
            <ArrowShape element={element} selected={selected} />
          </g>
          <circle r="2.35" fill="#171717" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          <circle r="0.7" fill={stroke} />
        </>
      ) : element.type === "shot" ? (
        <>
          <circle r="5.1" fill="#202020" stroke={stroke} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
          <circle r="3.55" fill="#f4f1e9" />
          <text x="0" y="1.05" textAnchor="middle" fontSize="3.1" fontWeight="800" fill="#252525" className="select-none">{element.shots ?? 10}</text>
        </>
      ) : element.type === "start" ? (
        <>
          <circle cy="-2.3" r="1.65" fill={stroke} />
          <path d="M-2.7 4.2c.2-2.7 1.25-4.1 2.7-4.1s2.5 1.4 2.7 4.1" fill="#202020" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <circle r="6" fill="transparent" />
        </>
      ) : element.type === "screen" ? (
        <path d="M0-5.3 5.4 4.6h-10.8L0-5.3Z" fill="#202020" stroke={stroke} strokeWidth="1.15" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      ) : (
        <path d="M0-5.4 4.8 4.4H-4.8L0-5.4Z" fill={stroke} stroke="#202020" strokeWidth="0.7" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      )}
      {selected && <circle r="7" fill="none" stroke="#ee8a4d" strokeWidth="0.55" strokeDasharray="1 1" vectorEffect="non-scaling-stroke" pointerEvents="none" />}
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
      ...(type === "arrow" ? { angle: 65, length: 18, bend: 0 } : {}),
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
    <section aria-label="Drill diagram editor" className="flex max-h-[58dvh] min-h-0 w-full min-w-0 flex-col overflow-y-auto overscroll-contain rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-h-[64dvh]">
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
        <div className="relative mx-auto h-full min-h-[200px] w-full max-w-[380px] overflow-hidden rounded-lg border border-zinc-700 bg-[#efede5] shadow-[inset_0_0_0_1px_rgba(255,255,255,.3)]">
          <svg
            ref={svgRef}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            role="group"
            aria-label="Basketball half court. Use the marker controls to add symbols, then drag to reposition."
            className="absolute inset-0 h-full w-full"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: "none" }}
          >
            <CourtLines />
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
