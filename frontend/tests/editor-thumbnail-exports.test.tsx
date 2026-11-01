import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportScene } from "@excalidraw/excalidraw";
import * as api from "../src/api";
import { makeSvgPreview } from "../src/utils/importHelpers";
import { useDrawingPreview } from "../src/components/drawing-card/useDrawingPreview";

vi.mock("@excalidraw/excalidraw", () => ({
  exportScene: vi.fn(async () => ({ outerHTML: '<svg data-preview="scene" />' })),
}));
vi.mock("../src/api", () => ({
  getDrawing: vi.fn(),
  getDrawingPreview: vi.fn(async () => null),
}));

const drawing = {
  id: "drawing",
  name: "Drawing",
  collectionId: null,
  version: 1,
  createdAt: 1,
  updatedAt: 1,
};
const elements = [
  { id: "image", type: "image", fileId: "photo", status: "pending" },
];
const files = {
  photo: { id: "photo", dataURL: "data:image/png;base64,aW1hZ2U=" },
};
let renderer: ReactTestRenderer | undefined;

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
});

describe("import thumbnails", () => {
  it.each([
    [undefined, "#ffffff"],
    ["#123456", "#123456"],
  ])(
    "exports a light SVG with background %s and embedded image files",
    async (background, expected) => {
      const appState = {
        viewBackgroundColor: background,
        exportWithDarkMode: true,
        exportBackground: false,
        exportEmbedScene: true,
      };
      const svg = await makeSvgPreview(elements, appState, files);
      expect(exportScene).toHaveBeenCalledWith({
        type: "svg",
        data: { elements, appState, files },
        config: {
          padding: 10,
          theme: "light",
          canvasBackgroundColor: expected,
          embedScene: false,
        },
      });
      expect(svg.outerHTML).toBe('<svg data-preview="scene" />');
    },
  );
});

describe("dashboard thumbnails", () => {
  it.each([
    [undefined, false],
    ["white", false],
    [" #FFF ", false],
    ["#123456", "#123456"],
  ])(
    "exports a light SVG with background %s and the current image data",
    async (background, expected) => {
      const appState = {
        viewBackgroundColor: background,
        exportWithDarkMode: true,
        exportBackground: true,
        exportEmbedScene: true,
      };
      vi.mocked(api.getDrawing).mockResolvedValue({
        ...drawing,
        elements,
        appState,
        files: { ...files, unused: { dataURL: "/api/files/deleted" } },
      });
      const generated = vi.fn();
      function Harness() {
        const { previewSvg } = useDrawingPreview(drawing, generated);
        return <output>{previewSvg}</output>;
      }
      await act(async () => {
        renderer = create(<Harness />);
      });
      expect(exportScene).toHaveBeenCalledWith({
        type: "svg",
        data: {
          elements: [{ ...elements[0], status: "saved" }],
          appState,
          files,
        },
        config: {
          padding: 10,
          theme: "light",
          canvasBackgroundColor: expected,
          embedScene: false,
        },
      });
      expect(renderer!.root.findByType("output").children).toEqual([
        '<svg data-preview="scene" />',
      ]);
      expect(generated).toHaveBeenCalledWith("drawing", '<svg data-preview="scene" />');
    },
  );
});
