import { useEffect, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { FILL_SWATCHES, type Shape } from "@/lib/canvas-types";

interface PropertiesPanelProps {
  selected: Shape[];
  onChange: (updater: (prev: Shape[]) => Shape[]) => void;
  onHistoryPush: () => void;
}

function NumField({
  label,
  value,
  disabled,
  onCommit,
  onHistoryPush,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
  onHistoryPush: () => void;
}) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  useEffect(() => setDraft(String(Math.round(value * 100) / 100)), [value]);
  return (
    <label
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md border border-input bg-input/30 px-2 transition-colors focus-within:border-selection",
        disabled && "opacity-40",
      )}
    >
      <span className="w-3 text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        className="w-full min-w-0 bg-transparent text-xs text-foreground outline-none tabular-nums"
        value={draft}
        disabled={disabled}
        onFocus={onHistoryPush}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onCommit(n);
        }}
        onBlur={() => setDraft(String(Math.round(value * 100) / 100))}
      />
    </label>
  );
}

export function PropertiesPanel({ selected, onChange, onHistoryPush }: PropertiesPanelProps) {
  const single = selected.length === 1 ? selected[0] : null;
  const isShape = selected.length > 0;

  const patch = (p: Partial<Shape>) =>
    onChange((prev) => prev.map((s) => (selected.some((sel) => sel.id === s.id) ? { ...s, ...p } : s)));

  return (
    <aside className="panel-scroll flex h-full w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-panel">
      <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Design
      </div>

      {!isShape ? (
        <div className="flex flex-col items-start gap-4 px-4 pt-10 text-muted-foreground">
          <MousePointer2 className="h-5 w-5 opacity-50" />
          <p className="text-xs leading-5">
            Select a layer to edit its properties.
          </p>
          <div className="space-y-1.5 text-[11px] leading-4">
            <p className="font-semibold text-foreground">Shortcuts</p>
            <p>V Move · F Frame · R Rect</p>
            <p>O Ellipse · L Line · T Text</p>
            <p>⌘/Ctrl + Z Undo · ⌘D Duplicate</p>
            <p>Space + drag pan · ⌘/Ctrl + scroll zoom</p>
            <p>Double-click text to edit it</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-3 pb-6 pt-1">
          <div className="grid grid-cols-2 gap-1.5">
            <NumField label="X" value={single?.x ?? 0} disabled={!single} onCommit={(v) => patch({ x: v })} onHistoryPush={onHistoryPush} />
            <NumField label="Y" value={single?.y ?? 0} disabled={!single} onCommit={(v) => patch({ y: v })} onHistoryPush={onHistoryPush} />
            <NumField
              label="W"
              value={single?.w ?? 0}
              disabled={!single}
              onCommit={(v) => patch({ w: Math.max(1, v) })}
              onHistoryPush={onHistoryPush}
            />
            <NumField
              label="H"
              value={single?.h ?? 0}
              disabled={!single}
              onCommit={(v) => patch({ h: Math.max(0, v) })}
              onHistoryPush={onHistoryPush}
            />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Fill</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {FILL_SWATCHES.map((c) => (
                <button
                  key={c}
                  aria-label={`Fill ${c}`}
                  className={cn(
                    "h-6 w-6 rounded-md border border-border transition-transform hover:scale-110",
                    single?.fill.toLowerCase() === c.toLowerCase() && "ring-2 ring-selection ring-offset-2 ring-offset-panel",
                  )}
                  style={{ background: c }}
                  onClick={() => {
                    onHistoryPush();
                    patch({ fill: c });
                  }}
                />
              ))}
              <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border border-border">
                <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" />
                <input
                  type="color"
                  aria-label="Custom fill color"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={single?.fill ?? "#ffffff"}
                  onFocus={onHistoryPush}
                  onChange={(e) => patch({ fill: e.target.value })}
                />
              </label>
            </div>
          </div>

          {(!single || single.type !== "text") && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Stroke</p>
              <div className="flex items-center gap-1.5">
                <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border border-border">
                  <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" />
                  <input
                    type="color"
                    aria-label="Stroke color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={single?.stroke ?? "#0d99ff"}
                    onFocus={onHistoryPush}
                    onChange={(e) => patch({ stroke: e.target.value, strokeWidth: Math.max(1, single?.strokeWidth ?? 1) })}
                  />
                </label>
                <div className="flex-1">
                  <NumField
                    label=""
                    value={single?.strokeWidth ?? 1}
                    onCommit={(v) => patch({ strokeWidth: Math.max(0, v) })}
                    onHistoryPush={onHistoryPush}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              Opacity · {Math.round((single?.opacity ?? 1) * 100)}%
            </p>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[Math.round((single?.opacity ?? 1) * 100)]}
              onValueChange={(vals) => {
                const v = vals[0];
                if (v !== undefined) patch({ opacity: v / 100 });
              }}
              onPointerDown={onHistoryPush}
              className="py-1"
            />
          </div>

          {single && (single.type === "rect" || single.type === "frame") && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Corner radius</p>
              <NumField label="R" value={single.radius} onCommit={(v) => patch({ radius: Math.max(0, v) })} onHistoryPush={onHistoryPush} />
            </div>
          )}

          {single && single.type === "text" && (
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-medium text-muted-foreground">Text</p>
              <textarea
                className="panel-scroll min-h-16 w-full resize-y rounded-md border border-input bg-input/30 px-2 py-1.5 text-xs text-foreground outline-none focus:border-selection"
                value={single.text}
                onFocus={onHistoryPush}
                onChange={(e) => patch({ text: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <NumField label="S" value={single.fontSize} onCommit={(v) => patch({ fontSize: Math.max(4, v) })} onHistoryPush={onHistoryPush} />
                <NumField label="W" value={single.fontWeight} onCommit={(v) => patch({ fontWeight: Math.max(100, Math.min(900, Math.round(v / 100) * 100)) })} onHistoryPush={onHistoryPush} />
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
