import { Circle, Eye, EyeOff, Frame, Minus, Square, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Shape } from "@/lib/canvas-types";

const ICONS = { frame: Frame, rect: Square, ellipse: Circle, line: Minus, text: Type } as const;

interface LayersPanelProps {
  shapes: Shape[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onToggleHidden: (id: string) => void;
}

export function LayersPanel({ shapes, selectedIds, onSelect, onToggleHidden }: LayersPanelProps) {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-panel">
      <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Layers
      </div>
      <div className="panel-scroll flex-1 overflow-y-auto px-1.5 pb-3">
        {[...shapes].reverse().map((s) => {
          const Icon = ICONS[s.type];
          const active = selectedIds.includes(s.id);
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              className={cn(
                "group flex h-8 items-center gap-2 rounded-md px-2 text-[13px] outline-none",
                active ? "bg-selection-soft text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              onPointerDown={(e) => {
                if (e.shiftKey) {
                  onSelect(active ? selectedIds.filter((id) => id !== s.id) : [...selectedIds, s.id]);
                } else {
                  onSelect([s.id]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect([s.id]);
              }}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
              <span className={cn("flex-1 truncate", s.hidden && "opacity-50")}>{s.name}</span>
              <button
                aria-label={s.hidden ? "Show layer" : "Hide layer"}
                className={cn(
                  "rounded p-0.5 text-muted-foreground transition-opacity hover:text-foreground",
                  s.hidden ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onToggleHidden(s.id);
                }}
              >
                {s.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
