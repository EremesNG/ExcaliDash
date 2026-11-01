import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import JSZip from "jszip";
import { api, axios } from "../src/api/client";
import { MemoryRouter } from "react-router-dom";
import { ConfirmModal } from "../src/components/ConfirmModal";
import { UploadStatus } from "../src/components/UploadStatus";
import { ProtectedRoute } from "../src/components/ProtectedRoute";
import { AuthStatusErrorPanel } from "../src/components/AuthStatusErrorPanel";
import { UserAvatar } from "../src/components/UserAvatar";
import { LanguageSelector } from "../src/components/LanguageSelector";
import { useLocale } from "../src/context/useLocale";
import { AuthProvider } from "../src/context/AuthContext";
import { UploadProvider, useUpload } from "../src/context/UploadContext";
import { importDrawings, importLegacyFiles } from "../src/utils/importUtils";
import { importLegacyZip } from "../src/utils/importHelpers";
import { rehydrateFilesForExport } from "../src/utils/rehydrateFiles";
import { getDrawing } from "../src/api/drawings";
import { LocaleTestProvider } from "./helpers/locale";

vi.mock("react-dom", () => ({ createPortal: (node: React.ReactNode) => node }));
vi.mock("@excalidraw/excalidraw", () => ({
  exportScene: vi.fn(async () => ({ outerHTML: "<svg/>" })),
  languages: [{ code: "es-ES", label: "Español" }],
}));

let renderer: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const storage = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  vi.stubGlobal("window", {
    location: { pathname: "/", search: "" },
    setTimeout: vi.fn(() => 1), clearTimeout: vi.fn(),
  });
  vi.stubGlobal("document", { body: {}, addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const spanish = () => {
  act(() => { renderer = create(<LocaleTestProvider language="es-ES">{null}</LocaleTestProvider>); });
};
const drawingFile = (name: string, value: unknown) => new File([JSON.stringify(value)], name);
const apiError = (data: unknown) => new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
  data, status: 400, statusText: "Bad Request", headers: {}, config: {} as any,
});

it("resolves interpolated import failures in Spanish outside React, including API codes", async () => {
  spanish();
  expect((await importDrawings([drawingFile("foto.txt", null)], null)).errors)
    .toEqual(["No se encontraron archivos compatibles."]);
  expect((await importDrawings([drawingFile("roto.json", null)], null)).errors)
    .toEqual(["roto.json: Estructura de archivo no válida: roto.json"]);
  expect((await importDrawings([new File(["{"], "roto.json")], null)).errors)
    .toEqual(["roto.json: JSON no válido: roto.json"]);
  vi.spyOn(api, "post").mockRejectedValue(apiError({ code: "INVALID_DRAWING", error: "Invalid drawing" }));
  expect((await importDrawings([drawingFile("plano.excalidraw", { elements: [], appState: {} })], null)).errors)
    .toEqual(["plano.excalidraw: El dibujo no es válido"]);
  expect((await importLegacyFiles([drawingFile("antiguo.json", { drawings: [] })], null)).errors)
    .toEqual(["antiguo.json: El JSON de exportación antiguo no contiene dibujos."]);
});

it("keeps archive, entry and drawing indexes in Spanish legacy import errors", async () => {
  spanish();
  const zip = new JSZip();
  zip.file("antiguo.json", JSON.stringify({ drawings: [null] }));
  const archive = new File([await zip.generateAsync({ type: "uint8array" })], "respaldo.zip");
  expect((await importLegacyZip(archive, null)).errors).toEqual([
    "respaldo.zip:antiguo.json: dibujo 1: Estructura no válida (faltan elements/appState)",
  ]);
});

const text = () => renderer!.root.findAllByType("button").map((button) => button.children.filter((child) => typeof child === "string").join(""));

it("localizes confirmation defaults and retry controls without replacing caller labels", () => {
  act(() => {
    renderer = create(<LocaleTestProvider language="es-ES">
      <ConfirmModal isOpen title="Prueba" message="Mensaje" onConfirm={() => {}} onCancel={() => {}} />
      <AuthStatusErrorPanel message="Sin conexión" onRetry={() => {}} />
      <ConfirmModal isOpen title="Prueba" message="Mensaje" confirmText="Continuar" cancelText="Volver" onConfirm={() => {}} onCancel={() => {}} />
    </LocaleTestProvider>);
  });
  expect(text()).toEqual(expect.arrayContaining(["Eliminar", "Cancelar", "Reintentar conexión"]));
  expect(renderer!.root.findAllByProps({ "aria-label": "Cerrar" })).toHaveLength(2);
  expect(text()).toEqual(expect.arrayContaining(["Continuar", "Volver"]));
});

it("localizes active upload counts, percentages and filename accessibility labels", async () => {
  let finish!: (value: any) => void;
  const pending = new Promise((resolve) => { finish = resolve; });
  vi.spyOn(api, "post").mockImplementation(async (_path, _payload, config) => {
    config?.onUploadProgress?.({ loaded: 37, total: 100 } as any);
    return await pending as any;
  });
  const files = [drawingFile("uno.json", {}), drawingFile("dos.json", {})];
  let uploading: Promise<void>;
  const Upload = () => {
    const { uploadFiles } = useUpload();
    return <button onClick={() => { uploading = uploadFiles(files, null); }}>Subir</button>;
  };
  await act(async () => {
    renderer = create(<LocaleTestProvider language="es-ES"><UploadProvider><Upload /><UploadStatus /></UploadProvider></LocaleTestProvider>);
  });
  await act(async () => { renderer!.root.findByType(Upload).findByType("button").props.onClick(); });
  expect(renderer!.root.findByType("h3").children.join("")).toBe("Subidas (2 activas)");
  expect(renderer!.root.findAllByType("span").map((span) => span.children.join(""))).toContain("37\u00a0%");
  expect(renderer!.root.findAllByType("div").filter((div) => div.props.style?.width === "37%")).toHaveLength(2);
  expect(renderer!.root.findByProps({ "aria-label": "Quitar uno.json de las subidas" })).toBeDefined();
  act(() => { renderer!.root.findByProps({ "aria-label": "Quitar dos.json de las subidas" }).props.onClick(); });
  expect(renderer!.root.findByType("h3").children.join("")).toBe("Subidas (1 activa)");
  await act(async () => { finish({ data: {} }); await uploading!; });
  expect(renderer!.root.findByType("h3").children.join("")).toBe("Subidas (Completadas)");
  expect(text()).toContain("Borrar todo");
});

it("shows Spanish auth failures when AuthProvider is above LocaleProvider", async () => {
  vi.spyOn(axios, "get").mockRejectedValue(new Error("Network Error"));
  await act(async () => {
    renderer = create(<MemoryRouter><AuthProvider><LocaleTestProvider language="es-ES">
      <ProtectedRoute><div>Privado</div></ProtectedRoute>
    </LocaleTestProvider></AuthProvider></MemoryRouter>);
  });
  expect(renderer!.root.findByType(AuthStatusErrorPanel).props.message).toBe(
    "No se pudo conectar con la API del servidor. Revisa BACKEND_URL, FRONTEND_URL y la configuración del proxy inverso.",
  );
  expect(text()).toContain("Reintentar conexión");
});

it("localizes export image failures with the failed file IDs and API validation errors", async () => {
  spanish();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403 })));
  const file = { dataURL: "/api/files/drawing/image", mimeType: "image/png" };
  await expect(rehydrateFilesForExport({ imagen: file }, "drawing"))
    .rejects.toThrow("No se pudo incluir 1 imagen del dibujo: imagen");
  await expect(rehydrateFilesForExport({ imagen: file, foto: file }, "drawing"))
    .rejects.toThrow("No se pudieron incluir 2 imágenes del dibujo: imagen, foto");
  vi.spyOn(api, "get").mockResolvedValue({ data: null });
  await expect(getDrawing("drawing")).rejects.toThrow("Datos de dibujo no válidos");
});

it("translates utility messages at call time after the provider language changes", async () => {
  const Language = () => {
    const { setLanguage } = useLocale();
    return <button onClick={() => setLanguage("es-ES")}>Español</button>;
  };
  act(() => { renderer = create(<LocaleTestProvider language="en"><Language /></LocaleTestProvider>); });
  expect((await importDrawings([], null)).errors).toEqual(["No supported files found."]);
  act(() => { renderer!.root.findByType("button").props.onClick(); });
  expect((await importDrawings([], null)).errors).toEqual(["No se encontraron archivos compatibles."]);
});

it("localizes avatar and language labels but leaves user and editor language names unchanged", () => {
  act(() => {
    renderer = create(<LocaleTestProvider language="es-ES">
      <UserAvatar name="Ana López" />
      <LanguageSelector langCode="es-ES" onChange={() => {}} />
    </LocaleTestProvider>);
  });
  expect(renderer!.root.findByProps({ role: "img" }).props["aria-label"]).toBe("Foto de perfil de Ana López");
  expect(renderer!.root.findByType("select").props["aria-label"]).toBe("Idioma");
  expect(renderer!.root.findByType("option").children).toEqual(["Español"]);
});

it("localizes unsupported uploads without sending them to the API", async () => {
  const post = vi.spyOn(api, "post");
  let uploading: Promise<void>;
  const Upload = () => {
    const { uploadFiles } = useUpload();
    return <button onClick={() => { uploading = uploadFiles([new File([""], "foto.txt")], null); }}>Subir</button>;
  };
  act(() => { renderer = create(<LocaleTestProvider language="es-ES"><UploadProvider><Upload /><UploadStatus /></UploadProvider></LocaleTestProvider>); });
  await act(async () => { renderer!.root.findByType(Upload).findByType("button").props.onClick(); await uploading!; });
  expect(renderer!.root.findByProps({ title: "Tipo de archivo no compatible" }).children).toEqual(["Tipo de archivo no compatible"]);
  expect(post).not.toHaveBeenCalled();
});

it.each([
  ["roto.json", "{", "respaldo.zip:roto.json: JSON no válido: roto.json"],
  ["datos.txt", "", "respaldo.zip: El ZIP no contiene dibujos .excalidraw/.json."],
  ["excalidash.manifest.json", "{}", "respaldo.zip: Parece un respaldo de ExcaliDash (.excalidash). Usa \"Importar respaldo\" en lugar de la importación antigua."],
])("localizes the archive validation error for %s", async (entry, contents, expected) => {
  spanish();
  const zip = new JSZip();
  zip.file(entry, contents);
  const file = new File([await zip.generateAsync({ type: "uint8array" })], "respaldo.zip");
  expect((await importLegacyFiles([file], null)).errors).toEqual([expected]);
});

it("localizes invalid archives and default imported drawing names", async () => {
  spanish();
  expect((await importLegacyFiles([new File(["invalid"], "roto.zip")], null)).errors)
    .toEqual(["roto.zip: Archivo ZIP no válido"]);
  const post = vi.spyOn(api, "post").mockResolvedValue({ data: {} });
  const result = await importLegacyFiles([drawingFile("antiguo.json", { drawings: [{ elements: [], appState: {} }] })], null);
  expect(result).toEqual({ success: 1, failed: 0, errors: [] });
  expect(post).toHaveBeenCalledWith("/drawings", expect.objectContaining({ name: "Dibujo importado 1" }), expect.anything());
});
