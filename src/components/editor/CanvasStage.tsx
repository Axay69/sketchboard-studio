import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import {
  createShape,
  HANDLE_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  normalize,
  type Shape,
  type Tool,
  type View,
} from "@/lib/canvas-types";

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface CanvasStageProps {
  shapes: Shape[];
  selectedIds: string[];
  tool: Tool;
  view: View;
  editingId: string | null;
  onSelect: (ids: string[]) => void;
  onChange: (updater: (prev: Shape[]) => Shape[]) => void;
  onHistoryPush: () => void;
  onViewChange: (view: View) => void;
  onToolChange: (tool: Tool) => void;
  onEditingChange: (id: string | null) => void;
}

type DragState =
  | { kind: "pan"; sx: number; sy: number; start: View }
  | { kind: "create"; sx: number; sy: number; id: string }
  | { kind: "move"; sx: number; sy: number; origins: Map<string, { x: number; y: number }> }
  | { kind: "resize"; handle: Handle; orig: Shape }
  | { kind: "marquee"; sx: number; sy: number };

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function CanvasStage({
  shapes,
  selectedIds,
  tool,
  view,
  editingId,
  onSelect,
  onChange,
  onHistoryPush,
  onViewChange,
  onToolChange,
  onEditingChange,
}: CanvasStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const rx = clientX - (rect?.left ?? 0);
    const ry = clientY - (rect?.top ?? 0);
    return { x: (rx - v.x) / v.zoom, y: (ry - v.y) / v.zoom };
  }, []);

  // Space bar temporarily activates the hand/pan cursor.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches("input, textarea, select, [contenteditable]");
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Zoom with ctrl/cmd + wheel around the cursor, otherwise pan.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const wx = (cx - v.x) / v.zoom;
        const wy = (cy - v.y) / v.zoom;
        const zoom = clampZoom(v.zoom * Math.exp(-e.deltaY * 0.0022));
        onViewChange({ zoom, x: cx - wx * zoom, y: cy - wy * zoom });
      } else {
        onViewChange({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onViewChange]);

  const beginDrag = useCallback(
    (
      state: DragState,
      onMove: (e: PointerEvent, world: { x: number; y: number }) => void,
      onUp?: (e: PointerEvent, world: { x: number; y: number }) => void,
    ) => {
      dragRef.current = state;
      const move = (e: PointerEvent) => onMove(e, toWorld(e.clientX, e.clientY));
      const up = (e: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        dragRef.current = null;
        onUp?.(e, toWorld(e.clientX, e.clientY));
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [toWorld],
  );

  const startPan = (e: React.PointerEvent) => {
    beginDrag({ kind: "pan", sx: e.clientX, sy: e.clientY, start: viewRef.current }, (ev) => {
      const s = dragRef.current as Extract<DragState, { kind: "pan" }>;
      onViewChange({ ...s.start, x: s.start.x + (ev.clientX - s.sx), y: s.start.y + (ev.clientY - s.sy) });
    });
  };

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === "hand" || spaceHeld) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (e.button !== 0) return;
    const world = toWorld(e.clientX, e.clientY);
    if (tool !== "select") {
      e.preventDefault();
      onEditingChange(null);
      onHistoryPush();
      const shape = createShape(tool, world.x, world.y, 0, 0);
      onChange((prev) => [...prev, shape]);
      const id = shape.id;
      beginDrag(
        { kind: "create", sx: world.x, sy: world.y, id },
        (_ev, w) => {
          const x = Math.min(w.x, w.x < w.x ? w.x : w.x);
          onChange((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    x: Math.min(sx0(w.x), sx0(w.x)) === 0 ? Math.min(w.x, sx0Ref.current) : s.x,
                  }
                : s,
            ),
          );
        },
      );
      return;
    }
    // Marquee select on empty canvas.
    onSelect([]);
    onEditingChange(null);
    setMarquee({ x: 0, y: 0, w: 0, h: 0 });
    beginDrag(
      { kind: "marquee", sx: world.x, sy: world.y },
      (_ev, w) => {
        setMarquee({
          x: Math.min(w.x, dragRef.current ? (dragRef.current as Extract<DragState, { kind: "marquee" }>).sx : w.x),
          y: Math.min(w.y, dragRef.current ? (dragRef.current as Extract<DragState, { kind: "marquee" }>).sy : w.y),
          w: Math.abs(w.x - (dragRef.current ? (dragRef.current as Extract<DragState, { kind: "marquee" }>).sx : w.x)),
          h: Math.abs(w.y - (dragRef.current ? (dragRef.current as Extract<DragState, { kind: "marquee" }>).sy : w.y)),
        });
      },
      (_ev, w) => {
        const m = dragRef.current as Extract<DragState, { kind: "marquee" }> | null;
        setMarquee(null);
        const rect = m
          ? { x: Math.min(w.x, m.sx), y: Math.min(w.y, m.sy), w: Math.abs(w.x - m.sx), h: Math.abs(w.y - m.sy) }
          : null;
        if (rect && (rect.w > 2 || rect.h > 2)) {
          const hits = shapesRef.current
            .filter(
              (s) =>
                !s.hidden &&
                s.x < rect.x + rect.w &&
                s.x + s.w > rect.x &&
                s.y < rect.y + rect.h &&
                s.y + s.h > rect.y,
            )
            .map((s) => s.id);
          onSelect(hits);
        }
      },
    );
  };

  const startMove = (e: React.PointerEvent, id: string) => {
    if (tool !== "select" || spaceHeld || editingId) return;
    e.stopPropagation();
    let ids = selectedIds;
    if (e.shiftKey) {
      ids = selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id];
    } else if (!selectedIds.includes(id)) {
      ids = [id];
    }
    onSelect(ids);
    const origins = new Map<string, { x: number; y: number }>();
    for (const s of shapesRef.current) {
      if (ids.includes(s.id)) origins.set(s.id, { x: s.x, y: s.y });
    }
    const world = toWorld(e.clientX, e.clientY);
    beginDrag(
      { kind: "move", sx: world.x, sy: world.y, origins },
      (_ev, w) => {
        const st = dragRef.current as Extract<DragState, { kind: "move" }>;
        const dx = w.x - st.sx;
        const dy = w.y - st.sy;
        onChange((prev) =>
          prev.map((s) => {
            const o = st.origins.get(s.id);
            return o ? { ...s, x: normalize(o.x + dx), y: normalize(o.y + dy) } : s;
          }),
        );
      },
    );
  };

  const startResize = (e: React.PointerEvent, handle: Handle, shape: Shape) => {
    e.stopPropagation();
    onHistoryPush();
    beginDrag(
      { kind: "resize", handle, orig: { ...shape } },
      (_ev, w) => {
        const st = dragRef.current as Extract<DragState, { kind: "resize" }>;
        const o = st.orig;
        const h = st.handle;
        let x = o.x;
        let y = o.y;
        let nw = o.w;
        let nh = o.h;
        if (h.includes("e")) nw = Math.max(1, w.x - o.x);
        if (h.includes("s")) nh = Math.max(1, w.y - o.y);
        if (h.includes("w")) {
          const right = o.x + o.w;
          x = Math.min(w.x, right - 1);
          nw = right - x;
        }
        if (h.includes("n")) {
          const bottom = o.y + o.h;
          y = Math.min(w.y, bottom - 1);
          nh = bottom - y;
        }
        const id = o.id;
        onChange((prev) =>
          prev.map((s) => (s.id === id ? { ...s, x: normalize(x), y: normalize(y), w: normalize(nw), h: normalize(nh) } : s)),
        );
      },
    );
  };

  const zoomBy = (factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const cx = (rect?.width ?? 800) / 2;
    const cy = (rect?.height ?? 600) / 2;
    const wx = (cx - v.x) / v.zoom;
    const wy = (cy - v.y) / v.zoom;
    const zoom = clampZoom(v.zoom * factor);
    onViewChange({ zoom, x: cx - wx * zoom, y: cy - wy * zoom });
  };

  const fitToShapes = () => {
    const visible = shapes.filter((s) => !s.hidden);
    if (visible.length === 0) return;
    const x1 = Math.min(...visible.map((s) => s.x));
    const y1 = Math.min(...visible.map((s) => s.y));
    const x2 = Math.max(...visible.map((s) => s.x + s.w));
    const y2 = Math.max(...visible.map((s) => s.y + s.h));
    const rect = containerRef.current?.getBoundingClientRect();
    const bw = x2 - x1;
    const bh = y2 - y1;
    const zoom = clampZoom(Math.min(((rect?.width ?? 800) - 160) / bw, ((rect?.height ?? 600) - 160) / bh));
    onViewChange({
      zoom,
      x: (rect?.width ?? 800) / 2 - ((x1 + x2) / 2) * zoom,
      y: (rect?.height ?? 600) / 2 - ((y1 + y2) / 2) * zoom,
    });
  };

  const zoomToFitRef = useRef(fitToShapes);
  zoomToFitRef.current = fitToShapes;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "0" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        zoomToFitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cursor =
    spaceHeld || tool === "hand" ? (dragRef.current?.kind === "pan" ? "grabbing" : "grab") : tool === "select" ? "default" : "crosshair";

  const screen = (n: number) => n * view.zoom;
  const selected = shapes.filter((s) => selectedIds.includes(s.id));
  const single = selected.length === 1 ? selected[0] : null;
  const selBox = single
    ? { x: single.x, y: single.y, w: single.w, h: single.h }
    : selected.length > 1
      ? {
          x: Math.min(...selected.map((s) => s.x)),
          y: Math.min(...selected.map((s) => s.y)),
          w: Math.max(...selected.map((s) => s.x + s.w)) - Math.min(...selected.map((s) => s.x)),
          h: Math.max(...selected.map((s) => s.y + s.h)) - Math.min(...selected.map((s) => s.y)),
        }
      : null;

  const handles: { h: Handle; cx: number; cy: number }[] = single
    ? [
        { h: "nw", cx: single.x, cy: single.y },
        { h: "n", cx: single.x + single.w / 2, cy: single.y },
        { h: "ne", cx: single.x + single.w, cy: single.y },
        { h: "e", cx: single.x + single.w, cy: single.y + single.h / 2 },
        { h: "se", cx: single.x + single.w, cy: single.y + single.h },
        { h: "s", cx: single.x + single.w / 2, cy: single.y + single.h },
        { h: "sw", cx: single.x, cy: single.y + single.h },
        { h: "w", cx: single.x, cy: single.y + single.h / 2 },
      ]
    : [];

  const editingShape = editingId ? shapes.find((s) => s.id === editingId) : null;

  return (
    <div
      ref={containerRef}
      className="canvas-dots relative h-full w-full overflow-hidden bg-canvas"
      style={{ cursor }}
      onPointerDown={onStagePointerDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* World layer */}
      <div
        className="absolute left-0 top-0"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "0 0" }}
      >
        {shapes
          .filter((s) => !s.hidden)
          .map((s) => {
            const isSelected = selectedIds.includes(s.id);
            const common: React.CSSProperties = {
              position: "absolute",
              left: s.x,
              top: s.y,
              width: s.w,
              height: s.h,
              opacity: s.opacity,
              outline: isSelected && s !== editingShape ? "1.5px solid var(--selection)" : undefined,
              outlineOffset: 0,
            };
            return (
              <div
                key={s.id}
                data-shape-id={s.id}
                style={{ ...common, cursor: tool === "select" && !editingId ? "move" : undefined }}
                onPointerDown={(e) => startMove(e, s.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (s.type === "text" && tool === "select") {
                    onHistoryPush();
                    onEditingChange(s.id);
                  }
                }}
              >
                {s.type === "line" ? (
                  <svg width="100%" height="100%" overflow="visible">
                    <line x1="0" y1={s.h} x2={s.w} y2="0" stroke={s.stroke} strokeWidth={Math.max(1, s.strokeWidth)} strokeLinecap="round" />
                  </svg>
                ) : s.type === "text" ? (
                  <div
                    style={{
                      fontSize: s.fontSize,
                      fontWeight: s.fontWeight,
                      color: s.fill,
                      lineHeight: 1.25,
                      whiteSpace: "pre-wrap",
                      width: "100%",
                    }}
                  >
                    {s.text}
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: s.type === "line" ? undefined : s.fill,
                      border: s.strokeWidth > 0 ? `${s.strokeWidth}px solid ${s.stroke}` : undefined,
                      borderRadius: s.type === "ellipse" ? "50%" : s.radius,
                    }}
                  />
                )}
              </div>
            );
          })}
      </div>

      {/* Screen-space overlay: frame labels, handles, marquee, text editor */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {shapes
          .filter((s) => s.type === "frame" && !s.hidden)
          .map((s) => (
            <div
              key={s.id}
              className="absolute max-w-48 truncate text-[11px] font-medium text-muted-foreground"
              style={{ left: view.x + screen(s.x), top: view.y + screen(s.y) - 18 }}
            >
              {s.name}
            </div>
          ))}

        {selBox && (
          <div
            className="absolute border border-selection"
            style={{
              left: view.x + screen(selBox.x),
              top: view.y + screen(selBox.y),
              width: screen(selBox.w),
              height: screen(selBox.h),
            }}
          />
        )}

        {single &&
          !editingId &&
          handles.map(({ h, cx, cy }) => (
            <div
              key={h}
              className="pointer-events-auto absolute rounded-[2px] border border-selection bg-white shadow-sm"
              style={{
                left: view.x + screen(cx) - HANDLE_SIZE / 2,
                top: view.y + screen(cy) - HANDLE_SIZE / 2,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                cursor:
                  h === "n" || h === "s" ? "ns-resize" : h === "e" || h === "w" ? "ew-resize" : h === "nw" || h === "se" ? "nwse-resize" : "nesw-resize",
              }}
              onPointerDown={(e) => startResize(e, h, single)}
            />
          ))}

        {marquee && (
          <div
            className="absolute border border-selection bg-selection-soft"
            style={{ left: view.x + screen(marquee.x), top: view.y + screen(marquee.y), width: screen(marquee.w), height: screen(marquee.h) }}
          />
        )}

        {editingShape && (
          <textarea
            autoFocus
            className="absolute resize-none overflow-hidden rounded-sm border border-selection bg-transparent p-0 text-foreground outline-none"
            style={{
              left: view.x + screen(editingShape.x),
              top: view.y + screen(editingShape.y),
              width: Math.max(80, screen(editingShape.w)),
              height: Math.max(24, screen(editingShape.h)),
              fontSize: screen(editingShape.fontSize),
              fontWeight: editingShape.fontWeight,
              lineHeight: 1.25,
              color: editingShape.fill,
            }}
            value={editingShape.text}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              onChange((prev) => prev.map((s) => (s.id === editingShape.id ? { ...s, text: e.target.value } : s)))
            }
            onBlur={() => onEditingChange(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onEditingChange(null);
            }}
          />
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 p-1 shadow-lg backdrop-blur">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => zoomBy(1 / 1.2)}
          aria-label="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          className="h-7 min-w-14 rounded-md px-1 text-xs font-medium tabular-nums text-foreground transition-colors hover:bg-accent"
          onClick={() => {
            const v = viewRef.current;
            const rect = containerRef.current?.getBoundingClientRect();
            const cx = (rect?.width ?? 800) / 2;
            const cy = (rect?.height ?? 600) / 2;
            const wx = (cx - v.x) / v.zoom;
            const wy = (cy - v.y) / v.zoom;
            onViewChange({ zoom: 1, x: cx - wx, y: cy - wy });
          }}
        >
          {Math.round(view.zoom * 100)}%
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => zoomBy(1.2)}
          aria-label="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={fitToShapes}
          aria-label="Zoom to fit"
          title="Zoom to fit (⇧⌘0)"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Helpers kept out of render for the create-drag path.
let sx0 = (n: number) => n;
const sx0Ref = { current: 0 };
