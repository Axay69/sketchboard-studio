import { Circle, Frame, Hand, Minus, MousePointer2, Square, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tool } from "@/lib/canvas-types";

const TOOLS: { tool: Tool; icon: typeof Square; label: string; key: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Move", key: "V" },
  { tool: "frame", icon: Frame, label: "Frame", key: "F" },
  { tool: "rect", icon: Square, label: "Rectangle", key: "R" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", key: "O" },
  { tool: "line", icon: Minus, label: "Line", key: "L" },
  { tool: "text", icon: Type, label: "Text", key: "T" },
  { tool: "hand", icon: Hand, label: "Hand tool", key: "H" },
];

export function Toolbar({ tool, onToolChange }: { tool: Tool; onToolChange: (t: Tool) => void }) {
  return (
    <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur">
      {TOOLS.map(({ tool: t, icon: Icon, label, key }) => (
        <button
          key={t}
          title={`${label} (${key})`}
          aria-label={label}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
            tool === t
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
          onClick={() => onToolChange(t)}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
