export type ShapeType = "frame" | "rect" | "ellipse" | "line" | "text";

export type Tool = "select" | "frame" | "rect" | "ellipse" | "line" | "text" | "hand";

export interface Shape {
  id: string;
  type: ShapeType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  radius: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  hidden: boolean;
}

export interface View {
  x: number;
  y: number;
  zoom: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;

const DEFAULTS: Omit<Shape, "id" | "type" | "name" | "x" | "y" | "w" | "h"> = {
  fill: "#d9d9d9",
  stroke: "#0d99ff",
  strokeWidth: 0,
  opacity: 1,
  radius: 0,
  text: "Text",
  fontSize: 24,
  fontWeight: 500,
  hidden: false,
};

export function createShape(type: ShapeType, x: number, y: number, w: number, h: number): Shape {
  const id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const base: Shape = {
    ...DEFAULTS,
    id,
    type,
    name: { frame: "Frame", rect: "Rectangle", ellipse: "Ellipse", line: "Line", text: "Text" }[type],
    x,
    y,
    w,
    h,
  };
  if (type === "frame") {
    base.fill = "#ffffff";
    base.radius = 8;
  }
  if (type === "rect") base.fill = "#8b8cff";
  if (type === "ellipse") base.fill = "#f2b418";
  if (type === "text") {
    base.fill = "#ffffff";
    base.w = Math.max(w, 160);
    base.h = Math.max(h, 32);
  }
  if (type === "line") {
    base.stroke = "#0d99ff";
    base.strokeWidth = 2;
  }
  return base;
}

export function bounds(shapes: Shape[]) {
  if (shapes.length === 0) return null;
  const x1 = Math.min(...shapes.map((s) => s.x));
  const y1 = Math.min(...shapes.map((s) => s.y));
  const x2 = Math.max(...shapes.map((s) => s.x + s.w));
  const y2 = Math.max(...shapes.map((s) => s.y + s.h));
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

export function normalize(n: number) {
  return Math.round(n * 100) / 100;
}

export const HANDLE_SIZE = 8;

export const FILL_SWATCHES = [
  "#ffffff",
  "#d9d9d9",
  "#8b8cff",
  "#0d99ff",
  "#0fa958",
  "#f2b418",
  "#f24822",
  "#d529b6",
];
