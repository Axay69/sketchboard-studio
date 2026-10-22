import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "@/components/editor/Editor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fig Canvas — Figma-style editor demo" },
      {
        name: "description",
        content:
          "A Figma-style canvas editor demo: draw frames, shapes, lines and text, then move, resize and style them with layers and properties panels.",
      },
      { property: "og:title", content: "Fig Canvas — Figma-style editor demo" },
      {
        property: "og:description",
        content: "Draw frames, shapes, lines and text on an infinite canvas with layers, properties, undo and zoom.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <Editor />;
}
