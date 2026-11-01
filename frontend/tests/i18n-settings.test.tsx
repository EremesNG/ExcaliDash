import React from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsMainGrid } from "../src/pages/settings/SettingsMainGrid";
import { AdvancedSettings } from "../src/pages/settings/AdvancedSettings";
import type { EditorStatus } from "../src/api/system";
import { SettingsConfirmModals } from "../src/pages/settings/SettingsConfirmModals";
import { Settings } from "../src/pages/Settings";
import { Profile } from "../src/pages/Profile";

const state = vi.hoisted(() => ({
  editor: vi.fn(), legacy: vi.fn(), get: vi.fn(), post: vi.fn(), put: vi.fn(), navigate: vi.fn(),
  listApiKeys: vi.fn(), authMode: "oidc_enforced",
  user: { id: "u1", name: "Ana", email: "ana@example.test", role: "USER" },
}));
vi.mock("../src/api", () => ({
  api: { get: state.get, post: state.post, put: state.put },
  getCollections: vi.fn().mockResolvedValue([]), getUpdateInfo: vi.fn().mockResolvedValue({ outboundEnabled: false }),
  API_KEY_SCOPES: ["drawings:read"], listApiKeys: state.listApiKeys,
  isAxiosError: (error: { isAxiosError?: boolean }) => error?.isAxiosError === true,
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => state.navigate }));
vi.mock("../src/context/AuthContext", () => ({ useAuth: () => ({
  user: state.user,
  authEnabled: true, authMode: state.authMode, updateUser: vi.fn(), logout: vi.fn(),
}) }));
vi.mock("../src/context/ThemeContext", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));
vi.mock("../src/context/PreferencesContext", () => ({ usePreference: (_key: string, fallback: unknown) => [fallback, vi.fn()] }));
vi.mock("../src/components/Layout", () => ({ Layout: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock("sonner", () => ({ Toaster: () => null }));
// The Node renderer has no portal target. Retain translated dialog content/actions at this seam.
vi.mock("../src/components/ConfirmModal", () => ({ ConfirmModal: ({ isOpen, title, message, confirmText, onConfirm }: {
  isOpen: boolean; title: string; message: React.ReactNode; confirmText: string; onConfirm: () => void;
}) => isOpen ? <div role="dialog"><h2>{title}</h2><div>{message}</div><button onClick={onConfirm}>{confirmText}</button></div> : null }));
vi.mock("../src/api/system", () => ({ getEditorStatus: state.editor }));
vi.mock("../src/utils/importUtils", () => ({
  importLegacyFiles: state.legacy, isExcalidashFile: (file: File) => file.name.endsWith(".excalidash"),
  EXCALIDASH_REQUIRED_MESSAGE: "Only .excalidash backup files are supported.",
}));
import { LocaleTestProvider } from "./helpers/locale";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let renderer: ReactTestRenderer | undefined;
const textOf = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(textOf).join("");
const mount = async (children: React.ReactNode, language = "es-ES") => {
  await act(async () => {
    renderer = create(<LocaleTestProvider language={language}>{children}</LocaleTestProvider>);
  });
  return renderer!;
};

const gridProps = {
  exportBackup: vi.fn(), theme: "light", toggleTheme: vi.fn(),
  imageCompression: true, toggleImageCompression: vi.fn(), imageCompressionThresholdMb: 0.5,
  onImageCompressionThresholdChange: vi.fn(), editorAutoHide: false,
  onEditorAutoHideChange: vi.fn(), compactSidebar: true, onCompactSidebarChange: vi.fn(),
  updateChannel: "stable" as const, updateInfo: null, updateLoading: false,
  updateError: null, onUpdateChannelChange: vi.fn(), onCheckForUpdates: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  state.authMode = "oidc_enforced";
  state.listApiKeys.mockReset().mockResolvedValue([]);
  state.editor.mockResolvedValue(editorStatus());
  state.get.mockReset(); state.post.mockReset(); state.put.mockReset();
});
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const advancedProps = {
  authEnabled: true, authMode: "oidc_enforced", authToggleLoading: false,
  backupImportLoading: false, legacyDbImportLoading: false, isManagedAuthMode: true,
  user: { role: "ADMIN" }, appVersion: "0.6.7", buildLabel: "ChatGPT Sites · personal",
  verifyBackupFile: vi.fn(), verifyLegacyDbFile: vi.fn(), confirmToggleAuthEnabled: vi.fn(),
  setImportError: vi.fn(), setImportSuccess: vi.fn(),
};
const editorStatus = (patch: Partial<EditorStatus> = {}): EditorStatus => ({
  pinned: { package: "@excalidraw/excalidraw", version: "0.18.0-4ce8305", commit: "4ce8305abcdef",
    shortCommit: "4ce8305", releasedAt: "2026-10-27T00:30:00.000Z" },
  upstream: { version: "0.18.0-a1b2c3d", shortCommit: "a1b2c3d", releasedAt: "2026-11-01T00:30:00.000Z" },
  status: "match", checkedAt: "2026-11-01T08:00:00Z", sourceUrl: "https://excalidraw.com/version.json",
  ...patch,
});
const openAdvanced = async () => {
  await mount(<AdvancedSettings {...advancedProps} />);
  await act(async () => renderer!.root.findByType("details").props.onToggle({ currentTarget: { open: true } }));
};

describe("Advanced Settings in Spanish", () => {
  it("translates rows while preserving managed authentication and the environment build label", async () => {
    await mount(<AdvancedSettings {...advancedProps} />);
    const text = textOf(renderer!.root);
    expect(text).toContain("Avanzado");
    expect(text).toContain("Importar copia de seguridad");
    expect(text).toContain("Gestionada por ChatGPT Sites");
    expect(text).toContain("ChatGPT Sites · personal");
    expect(text).not.toContain("Desactivar");
    expect(renderer!.root.findAllByType("button")).toHaveLength(2);
  });

  it.each([
    ["match", "Misma compilación que excalidraw.com", "27 oct 2026"],
    ["newer", "excalidraw.com usa una compilación más reciente", "1 nov 2026"],
    ["different", "excalidraw.com usa una compilación diferente", "1 nov 2026"],
    ["unavailable", "No se pudo comprobar excalidraw.com · versión fijada", ""],
  ] as const)("translates the %s editor status and UTC release date", async (status, message, date) => {
    state.editor.mockResolvedValue(editorStatus({ status, ...(status === "unavailable" ? { upstream: null } : {}) }));
    await openAdvanced();
    const region = renderer!.root.findByProps({ role: "status" });
    expect(textOf(region)).toContain(message);
    if (date) expect(textOf(region)).toContain(date);
    if (status === "newer") expect(textOf(region)).toContain("actualización disponible");
    if (status === "match") expect(renderer!.root.findByType("a").props["aria-label"]).toContain("se abre en una pestaña nueva");
  });

  it("translates loading and request failure separately", async () => {
    let reject: (error: Error) => void = () => {};
    state.editor.mockReturnValue(new Promise((_, rejectRequest) => { reject = rejectRequest; }));
    await openAdvanced();
    expect(textOf(renderer!.root)).toContain("Comprobando excalidraw.com…");
    await act(async () => reject(new Error("network")));
    expect(textOf(renderer!.root)).toContain("No se pudo comprobar excalidraw.com");
    expect(textOf(renderer!.root)).not.toContain("versión fijada");
  });

  it.each([[1, "Se ha importado 1 archivo."], [2, "Se han importado 2 archivos."]])("uses real file plurals for %s imports", async (count, expected) => {
    state.legacy.mockResolvedValue({ success: count, failed: 0, errors: [] });
    await mount(<AdvancedSettings {...advancedProps} />);
    await act(async () => renderer!.root.findByProps({ id: "settings-import-legacy" }).props.onChange({ target: { files: [{ name: "scene.excalidraw" }], value: "scene.excalidraw" } }));
    expect(advancedProps.setImportSuccess).toHaveBeenCalledWith({ isOpen: true, message: expected });
  });

  it("keeps import error summaries multiline with pluralized counts", async () => {
    state.legacy.mockResolvedValue({ success: 1, failed: 2, errors: ["scene.excalidraw: detalle"] });
    await mount(<AdvancedSettings {...advancedProps} />);
    await act(async () => renderer!.root.findByProps({ id: "settings-import-legacy" }).props.onChange({ target: { files: [{ name: "scene.excalidraw" }], value: "" } }));
    expect(advancedProps.setImportError).toHaveBeenCalledWith({ isOpen: true, message: "Importación completada con errores.\n1 archivo importado\n2 archivos fallidos\nErrores:\nscene.excalidraw: detalle" });
  });
});

const modalProps: React.ComponentProps<typeof SettingsConfirmModals> = {
  legacyDbImportConfirmation: { isOpen: false, file: null, info: null }, setLegacyDbImportConfirmation: vi.fn(),
  importError: { isOpen: false, message: "" }, setImportError: vi.fn(),
  importSuccess: { isOpen: false, message: "" }, setImportSuccess: vi.fn(),
  authToggleConfirm: { isOpen: false, nextEnabled: null }, setAuthToggleConfirm: vi.fn(),
  authDisableFinalConfirmOpen: false, setAuthDisableFinalConfirmOpen: vi.fn(), setAuthEnabled: vi.fn(),
  backupImportConfirmation: { isOpen: false, file: null, info: null }, setBackupImportConfirmation: vi.fn(),
  backupImportSuccess: false, setBackupImportSuccess: vi.fn(), backupImportError: { isOpen: false, message: "" },
  setBackupImportError: vi.fn(), setBackupImportLoading: vi.fn(),
};

describe("Settings dialogs and failures in Spanish", () => {
  it.each([
    ["es-ES", {}, "Fecha desconocida"],
    ["es-ES", { exportedAt: "not-a-date" }, "Fecha desconocida"],
    [undefined, {}, "Unknown date"],
    [undefined, { exportedAt: "not-a-date" }, "Unknown date"],
  ] as const)("shows a localized fallback in %s for backup date metadata %j", async (language, dateMetadata, expected) => {
    // Verification accepts metadata without exportedAt despite the declared response type.
    const info = { formatVersion: 1, excalidashBackendVersion: "0.6.7", collections: 1, drawings: 2,
      ...dateMetadata,
    } as NonNullable<typeof modalProps.backupImportConfirmation.info>;
    const modal = <SettingsConfirmModals {...modalProps} backupImportConfirmation={{ isOpen: true, file: null, info }} />;
    await act(async () => {
      renderer = create(language ? <LocaleTestProvider language={language}>{modal}</LocaleTestProvider> : modal);
    });
    expect(textOf(renderer!.root.findByProps({ role: "dialog" }))).toContain(expected);
  });

  it.each([[1, 2, "1 colección y 2 dibujos"], [2, 1, "2 colecciones y 1 dibujo"], [0, 0, "0 colecciones y 0 dibujos"]])(
    "pluralizes %s collections and %s drawings and formats the backup export date", async (collections, drawings, expected) => {
      vi.stubEnv("TZ", "UTC");
      await mount(<SettingsConfirmModals {...modalProps} backupImportConfirmation={{ isOpen: true, file: null,
        info: { formatVersion: 1, exportedAt: "2026-10-27T10:20:00Z", excalidashBackendVersion: "0.6.7", collections: Number(collections), drawings: Number(drawings) },
      }} />);
      const text = textOf(renderer!.root);
      expect(text).toContain("¿Importar copia de seguridad?");
      expect(text).toContain(expected);
      expect(text).toContain("27 oct 2026, 10:20");
      expect(text).not.toContain("Fecha desconocida");
      expect(text).not.toContain("collection(s)");
    },
  );

  it("translates a code from a blob-configured backup export failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.get.mockRejectedValue({ isAxiosError: true, response: { data: new Blob([JSON.stringify({ code: "BACKUP_IMAGE_MISSING", error: "Backup image missing" })], { type: "application/json" }) } });
    await mount(<Settings />);
    const exportButton = renderer!.root.findAllByType("button").find((node) => textOf(node) === "Exportar" || textOf(node) === "Export")!;
    await act(async () => exportButton.props.onClick());
    expect(textOf(renderer!.root)).toContain("Falta una imagen de la copia de seguridad");
    expect(textOf(renderer!.root)).not.toContain("Backup image missing");
  });

  it("localizes server-code failures during backup import", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.post.mockRejectedValue({ isAxiosError: true, response: { data: { code: "INVALID_ARCHIVE", error: "Invalid archive" } } });
    await mount(<SettingsConfirmModals {...modalProps} backupImportConfirmation={{ isOpen: true, file: new File(["data"], "backup.excalidash"), info: null }} />);
    await act(async () => renderer!.root.findByType("button").props.onClick());
    expect(modalProps.setBackupImportError).toHaveBeenCalledWith({ isOpen: true, message: "El archivo comprimido no es válido" });
  });
});

describe("Profile on Sites in Spanish", () => {
  it("translates visible profile labels and name validation without exposing local auth controls", async () => {
    await mount(<Profile />);
    expect(textOf(renderer!.root)).toContain("Perfil");
    expect(textOf(renderer!.root)).toContain("Correo electrónico");
    const input = renderer!.root.findByProps({ id: "name" });
    expect(input.props["aria-label"]).toBe("Nombre visible");
    expect(input.props.placeholder).toBe("Tu nombre");
    expect(textOf(renderer!.root)).not.toContain("Current password");
    expect(renderer!.root.findAllByType("button")).toHaveLength(1);
    await act(async () => input.props.onChange({ target: { value: " " } }));
    await act(async () => renderer!.root.findByType("button").props.onClick());
    expect(textOf(renderer!.root)).toContain("El nombre no puede estar vacío");
  });

  it("translates profile name success", async () => {
    state.put.mockResolvedValue({ data: { user: { name: "Ana nueva" } } });
    await mount(<Profile />);
    await act(async () => renderer!.root.findByProps({ id: "name" }).props.onChange({ target: { value: "Ana nueva" } }));
    await act(async () => renderer!.root.findByType("button").props.onClick());
    expect(textOf(renderer!.root)).toContain("Nombre actualizado");
  });
});

describe("Settings API key availability", () => {
  it("hides API key management on Sites without requesting API keys", async () => {
    await mount(<Settings />);
    expect(textOf(renderer!.root)).not.toContain("API Keys");
    expect(state.listApiKeys).not.toHaveBeenCalled();
  });

  it.each(["local", "hybrid"])("keeps API key management available in %s mode", async (authMode) => {
    state.authMode = authMode;
    await mount(<Settings />);
    expect(textOf(renderer!.root)).toContain("API Keys");
    expect(state.listApiKeys).toHaveBeenCalledOnce();
  });
});

describe("Settings in Spanish", () => {
  it("offers the app languages, stores es-ES, and translates visible and accessible labels", async () => {
    await mount(<SettingsMainGrid {...gridProps} />, "en");
    const select = renderer!.root.findByProps({ "aria-label": "Language" });
    expect(select.findAllByType("option").map(textOf)).toEqual(["English", "Español", "中文"]);
    await act(async () => select.props.onChange({ target: { value: "es-ES" } }));
    expect(renderer!.root.findByProps({ "aria-label": "Idioma" }).props.value).toBe("es-ES");
    expect(textOf(renderer!.root)).toContain("Apariencia");
    expect(textOf(renderer!.root)).toContain("Comprimir imágenes de más de 0,5 MB");
    expect(renderer!.root.findByProps({ "aria-label": "Activar el modo oscuro" })).toBeDefined();
  });

  it("keeps an existing editor-only language understandable", async () => {
    await mount(<SettingsMainGrid {...gridProps} />, "fr-FR");
    expect(renderer!.root.findByProps({ value: "fr-FR" }).props["aria-label"]).toBe("Language");
    expect(textOf(renderer!.root)).toContain("fr-FR (editor language)");
  });
});
