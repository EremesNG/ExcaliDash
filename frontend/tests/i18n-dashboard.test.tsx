import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../src/context/AuthContext";
import { PreferencesProvider } from "../src/context/PreferencesContext";
import { UploadProvider } from "../src/context/UploadContext";
import { useLocale } from "../src/context/useLocale";
import * as api from "../src/api";
import { Dashboard } from "../src/pages/Dashboard";
import { Sidebar } from "../src/components/Sidebar";
import { DrawingCard } from "../src/components/DrawingCard";
import { ShareCollectionModal } from "../src/components/ShareCollectionModal";
import { DashboardToolbar } from "../src/pages/dashboard/DashboardToolbar";
import { DrawingsGrid, FileDropOverlay } from "../src/pages/dashboard/DashboardPanels";
import { useDashboardSort } from "../src/pages/dashboard/useDashboardSort";
import { LocaleTestProvider } from "./helpers/locale";

// HTTP and DOM portals are the external boundaries of the Node renderer.
vi.mock("../src/api", () => ({
  authStatus: vi.fn(async () => ({ authEnabled: true })),
  authMe: vi.fn(async () => ({ user: { id: "owner", name: "Alex", email: "alex@example.com" } })),
  getUserPreferences: vi.fn(async () => ({})),
  getDrawings: vi.fn(async () => ({ drawings: [], totalCount: 0 })),
  getCollections: vi.fn(async () => []),
  getUpdateInfo: vi.fn(async () => ({ outboundEnabled: false })),
  createDrawing: vi.fn(async (name: string) => ({ id: "created", name })),
  getDrawing: vi.fn(async () => { throw new Error("Scene service unavailable"); }),
  isS3Enabled: vi.fn(async () => false),
  getDrawingPreview: vi.fn(async () => { throw new Error("Preview service unavailable"); }),
}));
vi.mock("react-dom", () => ({ createPortal: (children: React.ReactNode) => children }));
vi.mock("@excalidraw/excalidraw", () => ({ exportScene: vi.fn() }));

const noop = () => {};
const collection = { id: "plans", name: "Mis planos", createdAt: 1, isOwner: true };
const drawing = {
  id: "plan", name: "Mi plano", collectionId: null, version: 1,
  createdAt: new Date("2026-01-01T12:00:00Z").getTime(),
  updatedAt: new Date("2026-01-01T12:00:00Z").getTime(),
};
const gridProps = {
  drawings: [], collections: [], selectedIds: new Set<string>(), search: "",
  isLoading: false, isDraggingFile: false, isTrashView: false,
  isSharedView: false, isSharedCollection: false,
  onClearSearch: noop, onToggleSelection: noop, onRename: noop, onDelete: noop,
  onHide: noop, onDuplicate: noop, onMoveToCollection: noop, onOpenDrawing: noop,
  onMouseDown: noop, onDragStart: noop, onPreviewGenerated: noop,
};
const Toolbar = ({ count = 2 }: { count?: number }) => {
  const sort = useDashboardSort();
  return <DashboardToolbar
    {...sort} search="" searchInputRef={React.createRef<HTMLInputElement>()}
    sortedDrawingsCount={count} allSelected={false} hasSelection={count > 0}
    isTrashView={false} isSharedView={false} isSharedCollection={false}
    showBulkMoveMenu selectedCount={count} collections={[collection]}
    onSearchChange={noop} onSortFieldChange={noop} onSortDirectionToggle={noop}
    onSelectAll={noop} onBulkDeleteClick={noop} onBulkDuplicate={noop}
    onShowBulkMoveMenuChange={noop} onBulkMove={noop} onImportDrawings={noop}
    onCreateDrawing={noop} onViewerActionError={noop}
  />;
};
let renderer: ReactTestRenderer | undefined;
const textOf = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(textOf).join("");
const mount = async (children: React.ReactNode, language = "es-ES", route = "/") => {
  await act(async () => {
    renderer = create(<MemoryRouter initialEntries={[route]}><AuthProvider><PreferencesProvider>
      <LocaleTestProvider language={language}><UploadProvider>{children}</UploadProvider></LocaleTestProvider>
    </PreferencesProvider></AuthProvider></MemoryRouter>);
  });
  return renderer!.root;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.authStatus).mockResolvedValue({ authEnabled: true });
  vi.mocked(api.getDrawings).mockResolvedValue({ drawings: [], totalCount: 0 });
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("document", { body: {}, addEventListener: noop, removeEventListener: noop });
  vi.stubGlobal("window", {
    location: { pathname: "/", search: "" }, setTimeout, clearTimeout,
    addEventListener: noop, removeEventListener: noop,
    matchMedia: () => ({ matches: true, addEventListener: noop, removeEventListener: noop }),
  });
  vi.stubGlobal("IntersectionObserver", class { observe = noop; disconnect = noop; });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-01-03T12:00:00Z"));
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Spanish dashboard", () => {
  it("translates sidebar navigation, accessible controls and collection actions", async () => {
    const root = await mount(<Sidebar collections={[collection]} selectedCollectionId={undefined}
      onSelectCollection={noop} onCreateCollection={noop} onEditCollection={noop} onDeleteCollection={noop} />);
    expect(textOf(root)).toContain("Todos los dibujos");
    expect(textOf(root)).toContain("Papelera");
    expect(root.findByProps({ "aria-label": "Menú de la cuenta" })).toBeDefined();
    await act(async () => root.findByProps({ title: "Nueva colección" }).props.onClick({ stopPropagation: noop }));
    expect(root.findByProps({ "aria-label": "Nombre de la colección" }).props.placeholder).toBe("Nueva colección...");
    await act(async () => root.findAll((node) => node.type === "div" && node.props.role === "button")
      .find((node) => textOf(node).includes("Mis planos"))!.props.onContextMenu({ preventDefault: noop, stopPropagation: noop, clientX: 0, clientY: 0 }));
    expect(textOf(root)).toContain("Cambiar nombre de la colección");
  });

  it.each([[1, "Mover 1 dibujo a..."], [2, "Mover 2 dibujos a..."]])(
    "translates toolbar labels and selection count %i", async (count, message) => {
      const root = await mount(<Toolbar count={count} />);
      expect(root.findByProps({ placeholder: "Buscar dibujos..." })).toBeDefined();
      expect(root.findByProps({ "aria-label": "Ordenar dibujos" })).toBeDefined();
      expect(textOf(root)).toContain("Modificación");
      expect(textOf(root)).toContain("Nuevo dibujo");
      expect(textOf(root)).toContain(message);
      expect(root.findByProps({ title: "Seleccionar todo" })).toBeDefined();
      await act(async () => root.findByProps({ "aria-label": "Ordenar dibujos" }).props.onClick({ stopPropagation: noop }));
      expect(root.findAllByProps({ role: "option" }).map(textOf)).toEqual(["Nombre", "Creación", "Modificación"]);
    },
  );

  it("interpolates the search as content in the empty state", async () => {
    const root = await mount(<DrawingsGrid {...gridProps} search={'plano "A"'} />);
    expect(textOf(root)).toContain("No se han encontrado dibujos");
    expect(textOf(root)).toContain('No hay resultados para «plano "A"»');
    expect(textOf(root)).toContain("Borrar búsqueda");
  });

  it("translates loading, trash and the import destination", async () => {
    const root = await mount(<><DrawingsGrid {...gridProps} isLoading />
      <DrawingsGrid {...gridProps} isTrashView /><FileDropOverlay viewTitle="Mis planos" /></>);
    expect(root.findByProps({ role: "status" }).props["aria-label"]).toBe("Cargando dibujos");
    expect(textOf(root)).toContain("La papelera está vacía");
    expect(textOf(root)).toContain("Suelta archivos .excalidash aquí para importarlos en Mis planos");
  });

  it("renders a localized relative date, selection name and card context menu", async () => {
    const root = await mount(<DrawingCard drawing={drawing} collections={[]} isSelected={false}
      onToggleSelection={noop} onRename={noop} onDelete={noop} onMoveToCollection={noop}
      onDuplicate={noop} onClick={noop} />);
    expect(textOf(root)).toContain("hace 2 días");
    expect(root.findByProps({ "aria-label": "Seleccionar Mi plano" })).toBeDefined();
    await act(async () => root.findByProps({ id: "drawing-card-plan" }).props.onContextMenu({
      preventDefault: noop, stopPropagation: noop, clientX: 0, clientY: 0,
    }));
    expect(textOf(root)).toContain("Cambiar nombre");
    expect(textOf(root)).toContain("Exportar");
    expect(textOf(root)).toContain("Sin organizar");
  });

  it("translates the reachable personal Site notice", async () => {
    const root = await mount(<ShareCollectionModal collectionId="plans" collectionName="Mis planos" isOpen onClose={noop} />);
    expect(textOf(root)).toContain("Sitio personal");
    expect(textOf(root)).toContain("Las colecciones pertenecen a tu cuenta de ChatGPT.");
    expect(textOf(root)).toContain("Cerrar");
  });

  it.each([[1, "dibujo"], [2, "dibujos"]])("pluralizes the permanent deletion dialog for %i selected drawings", async (count, noun) => {
    vi.mocked(api.authStatus).mockResolvedValue({ authEnabled: false });
    const drawings = Array.from({ length: count }, (_, index) => ({ ...drawing, id: `drawing-${index}` }));
    vi.mocked(api.getDrawings).mockResolvedValue({ drawings, totalCount: count });
    const root = await mount(<Dashboard />, "es-ES", "/collections?id=trash");
    expect(root.findByProps({ title: "Abrir menú" }).props["aria-label"]).toBe("Abrir menú");
    await act(async () => root.findByProps({ title: "Seleccionar todo" }).props.onClick());
    await act(async () => root.findByProps({ title: "Eliminar permanentemente" }).props.onClick());
    expect(textOf(root)).toContain(`¿Seguro que quieres eliminar ${count} ${noun} permanentemente? Esta acción no se puede deshacer.`);
    expect(textOf(root)).toContain(`Eliminar ${count} ${noun}`);
  });

  it("shows the library import failure in Spanish", async () => {
    vi.mocked(api.authStatus).mockResolvedValue({ authEnabled: false });
    const root = await mount(<Dashboard />);
    const dropTarget = root.findAll((node) => node.type === "div" && !!node.props.onDragEnter)[0];
    await act(async () => dropTarget.props.onDrop({ preventDefault: noop, stopPropagation: noop,
      dataTransfer: { files: [new File(["{}"], "library.excalidrawlib")] },
    }));
    expect(textOf(root)).toContain("Error al importar");
    expect(textOf(root)).toContain("Esta versión no permite importar bibliotecas (.excalidrawlib).");
    expect(textOf(root)).toContain("Aceptar");
  });

  it("shows translated read-only action toasts", async () => {
    vi.mocked(api.authStatus).mockResolvedValue({ authEnabled: false });
    vi.mocked(api.getCollections).mockResolvedValueOnce([
      { ...collection, isOwner: false, sharedRole: "view" },
    ]);
    const root = await mount(<Dashboard />, "es-ES", "/collections?id=plans");
    await act(async () => root.findAllByType("button").find((node) => textOf(node).includes("Nuevo dibujo"))!.props.onClick());
    expect(textOf(root)).toContain("Los lectores no pueden crear dibujos");
    await act(async () => root.findAllByType("button").find((node) => textOf(node).includes("Importar dibujos"))!.props.onClick());
    expect(textOf(root)).toContain("Los lectores no pueden importar dibujos");
    expect(api.createDrawing).not.toHaveBeenCalled();
  });

  it("shows the translated export failure on a drawing card", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(noop);
    try {
      const root = await mount(<DrawingCard drawing={drawing} collections={[]} isSelected={false}
        onToggleSelection={noop} onRename={noop} onDelete={noop} onMoveToCollection={noop}
        onDuplicate={noop} onClick={noop} />);
      const openMenu = () => root.findByProps({ id: "drawing-card-plan" }).props.onContextMenu({
        preventDefault: noop, stopPropagation: noop, clientX: 0, clientY: 0,
      });
      await act(async () => openMenu());
      await act(async () => root.findAllByType("button").find((node) => textOf(node).includes("Exportar"))!.props.onClick({ stopPropagation: noop }));
      await act(async () => openMenu());
      expect(textOf(root)).toContain("No se ha podido exportar el dibujo. Inténtalo de nuevo.");
    } finally {
      logged.mockRestore();
    }
  });

  it("creates a drawing with a localized default name", async () => {
    vi.mocked(api.authStatus).mockResolvedValue({ authEnabled: false });
    const Destination = () => <output>{useLocation().pathname}</output>;
    const root = await mount(<><Dashboard /><Destination /></>);
    await act(async () => root.findAllByType("button").find((node) => textOf(node).includes("Nuevo dibujo"))!.props.onClick());
    expect(api.createDrawing).toHaveBeenCalledWith("Dibujo sin título", null);
    expect(root.findByType("output").children).toEqual(["/editor/created"]);
  });

  it("updates toolbar and relative dates when changing language without remounting", async () => {
    const SwitchLanguage = () => {
      const { setLanguage } = useLocale();
      return <button onClick={() => setLanguage("en")}>English</button>;
    };
    const root = await mount(<><SwitchLanguage /><Toolbar />
      <DrawingCard drawing={{ ...drawing, updatedAt: new Date("2026-01-05T12:00:00Z").getTime() }} collections={[]} isSelected
        onToggleSelection={noop} onRename={noop} onDelete={noop} onMoveToCollection={noop} onDuplicate={noop} onClick={noop} />
    </>);
    expect(textOf(root)).toContain("en 2 días");
    expect(root.findByProps({ "aria-label": "Deseleccionar Mi plano" })).toBeDefined();
    await act(async () => root.findAllByType("button").find((node) => textOf(node) === "English")!.props.onClick());
    expect(textOf(root)).toContain("in 2 days");
    expect(textOf(root)).toContain("Date Modified");
    expect(textOf(root)).toContain("Mi plano");
    expect(root.findByProps({ "aria-label": "Deselect Mi plano" })).toBeDefined();
  });

  it("retains the English toolbar and search fallback", async () => {
    const root = await mount(<><Toolbar /><DrawingsGrid {...gridProps} search="plan" /></>, "en");
    expect(textOf(root)).toContain("New Drawing");
    expect(textOf(root)).toContain('No results for "plan"');
  });
});
