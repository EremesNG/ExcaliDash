import React, { useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleTestProvider } from "./helpers/locale";
import { EditorView } from "../src/pages/editor/EditorView";
import { EditorDialogs } from "../src/pages/editor/EditorDialogs";
import { ShareModal } from "../src/components/ShareModal";
import { useEditorCanvasHandlers } from "../src/pages/editor/useEditorCanvasHandlers";
import { useLibraryImportFromUrl } from "../src/pages/editor/useLibraryImportFromUrl";
import { useEditorSceneLoader } from "../src/pages/editor/useEditorSceneLoader";
import { useEditorPersistence } from "../src/pages/editor/useEditorPersistence";
import * as api from "../src/api";
import type { DrawingSnapshotFull } from "../src/api";
import { toast } from "sonner";

vi.mock("react-dom", () => ({ createPortal: (children: React.ReactNode) => children }));
vi.mock("@excalidraw/excalidraw", () => {
  const Item = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  return {
    Excalidraw: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    MainMenu: Object.assign(Item, {
      Item, ItemCustom: Item, Separator: () => null,
      DefaultItems: {
        SaveAsImage: () => null, ClearCanvas: () => null,
        ChangeCanvasBackground: () => null, Help: () => null,
      },
    }),
    languages: [{ code: "es-ES", label: "Español" }],
    useI18n: () => ({ t: (_key: string, _vars: unknown, fallback: string) => fallback }),
    viewportCoordsToSceneCoords: () => ({ x: 0, y: 0 }),
    convertToExcalidrawElements: vi.fn(),
    CaptureUpdateAction: { IMMEDIATELY: "IMMEDIATELY" },
  };
});
vi.mock("../src/api", () => ({
  getDrawingHistory: vi.fn(),
  getDrawingSnapshot: vi.fn(),
  getDrawing: vi.fn(),
  updateDrawing: vi.fn(),
  isAxiosError: (error: any) => Boolean(error?.isAxiosError),
}));
vi.mock("sonner", () => ({
  Toaster: () => null,
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), loading: vi.fn() },
}));

const ref = <T,>(current: T) => ({ current });
const renderers: ReactTestRenderer[] = [];
const renderSpanish = async (element: React.ReactElement) => {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(<LocaleTestProvider language="es-ES">{element}</LocaleTestProvider>);
  });
  renderers.push(renderer);
  return renderer;
};
const text = (renderer: ReactTestRenderer) => JSON.stringify(renderer.toJSON());
const editorProps: React.ComponentProps<typeof EditorView> = {
  id: "drawing", accessLevel: "owner", canEdit: true, autoHideEnabled: true,
  autosaveFailing: true, drawingName: "Mi dibujo", editorContainerRef: ref(null),
  initialData: { elements: [] }, isHeaderVisible: true, isHistoryOpen: false,
  historyPreview: null, historyButtonRef: ref(null), shareButtonRef: ref(null),
  isRenaming: false, isSavingOnLeave: true, isSceneLoading: false,
  langCode: "es-ES", loadError: null,
  me: { id: "me", name: "Ana", color: "red" }, newName: "Mi dibujo", peers: [], theme: "light",
  onBackClick: vi.fn(), onCanvasChange: vi.fn(), onCanvasDropCapture: vi.fn(),
  onExportClick: vi.fn(), onLibraryChange: vi.fn(), onNavigateHome: vi.fn(),
  onNewNameChange: vi.fn(), onPointerUpdate: vi.fn(), onRenameBlur: vi.fn(),
  onRenameStart: vi.fn(), onRenameSubmit: vi.fn(), onSetExcalidrawAPI: vi.fn(),
  onSetLangCode: vi.fn(), gridStep: 5, onSetGridStep: vi.fn(), onShareOpen: vi.fn(),
  isShareOpen: false, onCloseShare: vi.fn(), onHistoryOpen: vi.fn(),
  onToggleAutoHide: vi.fn(), onToggleTheme: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("document", { body: {} });
  vi.stubGlobal("window", Object.assign(new EventTarget(), { innerWidth: 1200 }));
});
afterEach(async () => {
  await act(async () => renderers.splice(0).forEach((renderer) => renderer.unmount()));
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Spanish editor UI", () => {
  it("reports failed saves in Spanish without replacing the original rejection", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("offline");
    vi.mocked(api.updateDrawing).mockRejectedValue(failure);
    const elements = [{ id: "shape", type: "rectangle", version: 1 }];
    const refs = {
      currentDrawingVersion: ref<number | null>(1), debouncedSave: ref(null),
      excalidrawAPI: ref({ getSceneElementsIncludingDeleted: () => elements, getAppState: () => ({}), getFiles: () => ({}) }),
      isSyncing: ref(false), isUnmounting: ref(false), lastLocalChangeAt: ref(0),
      lastPersistedElements: ref([]), lastPersistedFiles: ref({}), lastSyncedFiles: ref({}),
      latestAppState: ref({}), latestElements: ref(elements), latestFiles: ref({}),
      saveQueue: ref(Promise.resolve()), suspiciousBlankLoad: ref(false), uploadedRefs: ref({}),
    };
    function Save() {
      const persistence = useEditorPersistence({
        drawingId: "drawing", canEdit: true, refs, user: null,
        normalizeImageElementStatus: (scene = []) => scene,
        resolveSafeSnapshot: (snapshot = []) => ({ snapshot, prevented: false, staleEmptySnapshot: false, staleNonRenderableSnapshot: false }),
      });
      return <button onClick={() => persistence.enqueueSceneSave("drawing", elements, {}, {}, { suppressErrors: false })} />;
    }
    const renderer = await renderSpanish(<Save />);
    await act(async () => {
      await expect(renderer.root.findByType("button").props.onClick()).rejects.toBe(failure);
    });
    expect(toast.error).toHaveBeenCalledWith("No se han podido guardar los cambios");
  });
  it("translates a coded load failure in the error toast and editor error state", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(api.getDrawing).mockRejectedValue({ isAxiosError: true, response: { status: 404, data: { code: "DRAWING_NOT_FOUND", message: "Raw server message" } } });
    const refs: Parameters<typeof useEditorSceneLoader>[0]["refs"] = {
      elementVersionMap: ref(new Map()), saveQueue: ref(Promise.resolve()),
      latestElements: ref([]), initialSceneElements: ref([]), latestFiles: ref({}),
      isSyncing: ref(false), lastSyncedFiles: ref({}), lastSyncedElementOrderSig: ref(""),
      lastPersistedFiles: ref({}), currentDrawingVersion: ref(null), lastPersistedElements: ref([]),
      suspiciousBlankLoad: ref(false), hasSceneChangesSinceLoad: ref(false), excalidrawAPI: ref(null),
      latestAppState: ref({}), isBootstrappingScene: ref(true), hasHydratedInitialScene: ref(false),
    };
    const loaderProps = {
      id: "drawing", user: null, location: { pathname: "/shared/drawing", search: "", hash: "" },
      navigate: vi.fn(), refs, setAccessLevel: vi.fn(), setDrawingName: vi.fn(),
      setInitialData: vi.fn(), setIsReady: vi.fn(), setIsSceneLoading: vi.fn(),
      recordElementVersion: vi.fn(), normalizeImageElementStatus: (elements: readonly any[] = []) => elements,
    };
    function Scene() {
      const [loadError, setLoadError] = useState<string | null>(null);
      useEditorSceneLoader({ ...loaderProps, setLoadError });
      return <EditorView {...editorProps} initialData={null} loadError={loadError} />;
    }
    const renderer = await renderSpanish(<Scene />);
    expect(toast.error).toHaveBeenCalledWith("No se ha encontrado el dibujo");
    expect(text(renderer)).toContain("No se ha encontrado el dibujo");
    expect(text(renderer)).toContain("No se puede abrir el dibujo");
    expect(text(renderer)).not.toContain("Raw server message");
  });
  it("asks for trusted library sources in Spanish on initial mount", async () => {
    const confirm = vi.fn(() => false);
    Object.assign(window, {
      location: { hash: "#addLibrary=https://library.example/items", href: "https://site.example/editor/drawing", origin: "https://site.example", pathname: "/editor/drawing", search: "" },
      confirm, history: { replaceState: vi.fn() },
    });
    function LibraryImport() {
      useLibraryImportFromUrl({ excalidrawAPIRef: ref({}), isReady: true, user: null });
      return null;
    }
    await renderSpanish(<LibraryImport />);
    expect(confirm).toHaveBeenCalledWith("¿Importar una biblioteca de un sitio externo?\n\nhttps://library.example\n\nContinúa solo si confías en esta fuente.");
    expect(toast.info).toHaveBeenCalledWith("Importación de biblioteca cancelada", { id: "library-import" });
  });
  it("reports a dropped-image read failure in Spanish", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("FileReader", class {
      error = new Error("unreadable image");
      onerror: (() => void) | null = null;
      readAsDataURL() { this.onerror?.(); }
    });
    vi.stubGlobal("Image", class {
      naturalWidth = 10;
      naturalHeight = 10;
      onload: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    });
    function Canvas() {
      const handlers = useEditorCanvasHandlers({
        canEdit: true, drawingId: "drawing", isReady: false,
        debouncedSavePreview: vi.fn(), emitFilesDeltaIfNeeded: () => false,
        broadcastChanges: vi.fn(),
        resolveSafeSnapshot: () => ({ prevented: false, staleEmptySnapshot: false, staleNonRenderableSnapshot: false }),
        refs: {
          excalidrawAPI: ref({ getAppState: () => ({}) }),
          hasHydratedInitialScene: ref(true), hasSceneChangesSinceLoad: ref(false),
          initialSceneElements: ref([]), isBootstrappingScene: ref(false),
          isSyncing: ref(false), isUnmounting: ref(false), lastLocalChangeAt: ref(0),
          latestAppState: ref({}), latestElements: ref([]), latestFiles: ref({}),
          debouncedSave: ref(null), suspiciousBlankLoad: ref(false),
        },
      });
      return <div onDrop={handlers.handleCanvasDropCapture} />;
    }
    const renderer = await renderSpanish(<Canvas />);
    const event = {
      dataTransfer: { files: [new File(["bad"], "a.png", { type: "image/png" }), new File(["bad"], "b.png", { type: "image/png" })] },
      clientX: 0, clientY: 0, preventDefault: vi.fn(), stopPropagation: vi.fn(),
    };
    await act(async () => { await renderer.root.findByType("div").props.onDrop(event); });
    expect(toast.error).toHaveBeenCalledWith("No se han podido importar las imágenes arrastradas");
  });
  it("explains the private personal Site in Spanish and closes the share notice", async () => {
    const close = vi.fn();
    const renderer = await renderSpanish(<ShareModal drawingId="drawing" drawingName="Mi dibujo" anchorRef={ref(null)} isOpen onClose={close} />);
    expect(text(renderer)).toContain("Site personal");
    expect(text(renderer)).toContain("Esta aplicación es privada y está vinculada a tu cuenta de ChatGPT.");
    expect(text(renderer)).toContain("Los enlaces para compartir con otras personas no están disponibles en esta edición privada.");
    const button = renderer.root.findByType("button");
    expect(button.children).toEqual(["Cerrar"]);
    await act(async () => button.props.onClick());
    expect(close).toHaveBeenCalledOnce();
  });
  it("shows Spanish history dates and restore confirmation in the editor dialog", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 1, 12, 5));
    const snapshot = {
      id: "snapshot", version: 2, createdAt: new Date(2026, 9, 1, 12, 0).toISOString(),
      elements: [], appState: {}, files: {},
    } as DrawingSnapshotFull;
    vi.mocked(api.getDrawingHistory).mockResolvedValue({ snapshots: [snapshot], totalCount: 1 });
    vi.mocked(api.getDrawingSnapshot).mockResolvedValue(snapshot);
    const restore = vi.fn();
    const renderer = await renderSpanish(
      <EditorDialogs drawingId="drawing" historyButtonRef={ref(null)}
        getCurrentVersion={() => 2} isHistoryOpen onPreviewHistory={vi.fn()}
        onRestoreSnapshot={restore} onCloseHistory={vi.fn()} />,
    );
    expect(renderer.root.findByProps({ role: "dialog" }).props["aria-label"]).toBe("Historial de versiones");
    expect(text(renderer)).toContain("Versión 2");
    expect(text(renderer)).toContain("hace 5 minutos");
    expect(text(renderer)).toContain("1 oct 2026, 12:00");
    const row = renderer.root.findAll((node) => node.type === "div" && node.props.className?.includes("cursor-pointer select-none"))[0];
    await act(async () => { await row.props.onClick(); });
    const restoreButton = () => renderer.root.findAllByType("button").find((node) => node.children.includes("Restaurar") || node.children.includes("¿Confirmar?"))!;
    await act(async () => { await restoreButton().props.onClick(); });
    expect(text(renderer)).toContain("¿Confirmar?");
    expect(restore).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ "aria-label": "Cerrar historial de versiones" })).toBeTruthy();
  });
  it("renders editor controls, save status and grid step in Spanish without translating drawing names", async () => {
    const renderer = await renderSpanish(<EditorView {...editorProps} />);
    expect(text(renderer)).toContain("Guardando cambios…");
    expect(text(renderer)).toContain("Cambios sin guardar");
    expect(text(renderer)).toContain("Ana (Tú)");
    expect(text(renderer)).toContain("Mi dibujo");
    expect(text(renderer)).toContain("Modo oscuro");
    expect(renderer.root.findByProps({ title: "Historial de versiones" })).toBeTruthy();
    expect(renderer.root.findByProps({ title: "Exportar dibujo" })).toBeTruthy();
    expect(renderer.root.findByProps({ "aria-label": "Paso de la cuadrícula" }).props.value).toBe(5);
  });
});
