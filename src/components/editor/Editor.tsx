import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Redo2, Undo2 } from "lucide-react";
import { CanvasStage } from "@/components/editor/CanvasStage";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { Toolbar } from "@/components/editor/Toolbar";
import { Button } from "@/components/ui/button";
import { createShape, type Shape, type Tool, type View } from "@/lib/canvas-types";

// Seed shapes use stable IDs so SSR and client render identical HTML.
let seedCounter = 0;
function seeded(type: Shape["type"], x: number, y: number, w: number, h: number): Shape {
  const s = createShape(type, x, y, w, h);
  s.id = `seed_${++seedCounter}`;
  return s;
}

function seedShapes(): Shape[] {
  const frame = seeded("frame", 80, 70, 440, 320);
  frame.name = "Hero card";
  const block = seeded("rect", 116, 130, 180, 140);
  block.fill = "#0d99ff";
  block.radius = 12;
  block.name = "Accent block";
  const dot = seeded("ellipse", 330, 140, 130, 130);
  dot.fill = "#f2b418";
  dot.name = "Sun";
  const title = seeded("text", 116, 296, 260, 36);
  title.text = "Design anything";
  title.fontSize = 28;
  title.fontWeight = 600;
  title.fill = "#1e1e1e";
  title.name = "Title";

  const card = seeded("rect", 590, 110, 240, 170);
  card.fill = "#ffffff";
  card.stroke = "#d9d9d9";
  card.strokeWidth = 1;
  card.radius = 12;
  card.name = "Card";
  const label = seeded("text", 610, 140, 200, 30);
  label.text = "Ship faster";
  label.fontSize = 22;
  label.fontWeight = 600;
  label.fill = "#1e1e1e";
  label.name = "Card title";
  const body = seeded("text", 610, 178, 200, 60);
  body.text = "A tiny canvas demo with frames, shapes and text.";
  body.fontSize = 13;
  body.fontWeight = 400;
  body.fill = "#666666";
  body.name = "Card body";

  const divider = seeded("line", 80, 440, 300, 0);
  divider.name = "Divider";
  const caption = seeded("text", 590, 300, 220, 24);
  caption.text = "Select me →";
  caption.fontSize = 14;
  caption.fontWeight = 500;
  caption.fill = "#0d99ff";
  caption.name = "Caption";

  return [frame, block, dot, title, card, label, body, divider, caption];
}

export function Editor() {
  const [shapes, setShapes] = useState<Shape[]>(seedShapes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [view, setView] = useState<View>({ x: 100, y: 90, zoom: 1 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyLen, setHistoryLen] = useState({ past: 0, future: 0 });

  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;
  const selectedRef = useRef(selectedIds);
  selectedRef.current = selectedIds;
  const pastRef = useRef<Shape[][]>([]);
  const futureRef = useRef<Shape[][]>([]);

  const onChange = useCallback((updater: (prev: Shape[]) => Shape[]) => setShapes(updater), []);

  const onHistoryPush = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-49), shapesRef.current];
    futureRef.current = [];
    setHistoryLen({ past: pastRef.current.length, future: 0 });
  }, []);

  const undo = useCallback(() => {
    const past = pastRef.current;
    const prev = past[past.length - 1];
    if (!prev) return;
    pastRef.current = past.slice(0, -1);
    futureRef.current = [shapesRef.current, ...futureRef.current];
    setShapes(prev);
    setSelectedIds((ids) => ids.filter((id) => prev.some((s) => s.id === id)));
    setHistoryLen({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  const redo = useCallback(() => {
    const future = futureRef.current;
    const next = future[0];
    if (!next) return;
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, shapesRef.current];
    setShapes(next);
    setSelectedIds((ids) => ids.filter((id) => next.some((s) => s.id === id)));
    setHistoryLen({ past: pastRef.current.length, future: futureRef.current.length });
  }, []);

  const deleteSelected = useCallback(() => {
    const ids = selectedRef.current;
    if (ids.length === 0) return;
    onHistoryPush();
    setShapes((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelectedIds([]);
  }, [onHistoryPush]);

  const duplicateSelected = useCallback(() => {
    const ids = selectedRef.current;
    if (ids.length === 0) return;
    onHistoryPush();
    const copies: Shape[] = [];
    setShapes((prev) => {
      for (const s of prev) {
        if (!ids.includes(s.id)) continue;
        copies.push({
          ...s,
          id: `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          x: s.x + 24,
          y: s.y + 24,
          name: `${s.name} copy`,
        });
      }
      return [...prev, ...copies];
    });
    setSelectedIds(copies.map((c) => c.id));
  }, [onHistoryPush]);

  const nudge = useCallback(
    (dx: number, dy: number) => {
      const ids = selectedRef.current;
      if (ids.length === 0) return;
      onHistoryPush();
      setShapes((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, x: s.x + dx, y: s.y + dy } : s)));
    },
    [onHistoryPush],
  );

  const toggleHidden = useCallback((id: string) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)));
    setSelectedIds((ids) => ids.filter((x) => x !== id));
  }, []);

  // Global keyboard shortcuts.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches("input, textarea, select, [contenteditable]");
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (isTyping(e.target)) return;
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Escape") {
        setEditingId(null);
        setTool("select");
        return;
      }
      if (e.key.startsWith("Arrow") && !meta) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        if (e.key === "ArrowLeft") nudge(-step, 0);
        if (e.key === "ArrowRight") nudge(step, 0);
        if (e.key === "ArrowUp") nudge(0, -step);
        if (e.key === "ArrowDown") nudge(0, step);
        return;
      }
      if (!meta) {
        const k = e.key.toLowerCase();
        const map: Record<string, Tool> = { v: "select", f: "frame", r: "rect", o: "ellipse", l: "line", t: "text", h: "hand" };
        const nextTool = map[k];
        if (nextTool) setTool(nextTool);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicateSelected, deleteSelected, nudge]);

  const selected = shapes.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-panel px-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          F
        </div>
        <button className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-medium transition-colors hover:bg-accent">
          Untitled
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <div className="mx-auto flex items-center gap-0.5">
          <button
            aria-label="Undo"
            title="Undo (⌘Z)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={undo}
            disabled={historyLen.past === 0}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
            onClick={redo}
            disabled={historyLen.future === 0}
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
        <div className="flex -space-x-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-panel bg-primary text-[10px] font-semibold text-primary-foreground">
            A
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-panel bg-secondary text-[10px] font-semibold text-secondary-foreground">
            K
          </div>
        </div>
        <Button size="sm" className="h-7 rounded-md px-3 text-xs">
          Share
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <LayersPanel
          shapes={shapes}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onToggleHidden={toggleHidden}
        />
        <div className="relative min-w-0 flex-1">
          <CanvasStage
            shapes={shapes}
            selectedIds={selectedIds}
            tool={tool}
            view={view}
            editingId={editingId}
            onSelect={setSelectedIds}
            onChange={onChange}
            onHistoryPush={onHistoryPush}
            onViewChange={setView}
            onToolChange={setTool}
            onEditingChange={setEditingId}
          />
          <Toolbar tool={tool} onToolChange={setTool} />
        </div>
        <PropertiesPanel selected={selected} onChange={onChange} onHistoryPush={onHistoryPush} />
      </div>
    </div>
  );
}
