import React from "react";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorStatus } from "../src/api/system";
import { AdvancedSettings } from "../src/pages/settings/AdvancedSettings";
import { SettingsRow } from "../src/pages/settings/SettingsRow";
import viteConfig from "../vite.config";
import frontendPackage from "../package.json";
import { setCurrentLocale } from "../src/i18n";

const state = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { get: state.get } }));
vi.mock("../src/utils/importUtils", () => ({ importLegacyFiles: vi.fn() }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const BUILT_VERSION = "0.18.0-4ce8305";
const PINNED_COMMIT = "4ce8305a1b2c3d4e5f60718293a4b5c6d7e8f901";

const pinned = {
  package: "@excalidraw/excalidraw",
  version: BUILT_VERSION,
  commit: PINNED_COMMIT,
  shortCommit: "4ce8305",
  releasedAt: "2026-10-27T10:20:30.000Z",
};
const editorStatus = (
  patch: Partial<EditorStatus> = {},
): { data: EditorStatus } => ({
  data: {
    pinned,
    upstream: {
      version: "0.18.0-4ce8305",
      shortCommit: "4ce8305",
      releasedAt: pinned.releasedAt,
    },
    status: "match",
    checkedAt: "2026-10-31T08:00:00.000Z",
    sourceUrl: "https://excalidraw.com/version.json",
    ...patch,
  },
});

const baseProps = {
  authEnabled: true as boolean | null,
  authMode: "oidc_enforced" as string | null | undefined,
  authToggleLoading: false,
  backupImportLoading: false,
  legacyDbImportLoading: false,
  isManagedAuthMode: true,
  user: { role: "ADMIN" } as { role?: string } | null,
  appVersion: "0.6.7",
  buildLabel: "ChatGPT Sites · personal" as string | undefined,
  verifyBackupFile: vi.fn(),
  verifyLegacyDbFile: vi.fn(),
  confirmToggleAuthEnabled: vi.fn(),
  setImportError: vi.fn(),
  setImportSuccess: vi.fn(),
};

let renderer: ReactTestRenderer | undefined;

const mount = async (props: Partial<typeof baseProps> = {}) => {
  await act(async () => {
    renderer = create(<AdvancedSettings {...baseProps} {...props} />);
  });
  return renderer!;
};

const toggle = async (open: boolean) => {
  const details = renderer!.root.findByType("details");
  await act(async () => {
    details.props.onToggle({ currentTarget: { open } });
  });
};

const textOf = (node: ReactTestInstance | string): string =>
  typeof node === "string" ? node : node.children.map(textOf).join("");

const row = (title: string) =>
  renderer!.root.findAll(
    (node) => node.type === SettingsRow && node.props.title === title,
  )[0];

const editorRow = () => row("Excalidraw editor");
const buttonsIn = (node: ReactTestInstance) => node.findAllByType("button");

const openWith = async (
  response: { data: EditorStatus } | Error,
  props: Partial<typeof baseProps> = {},
) => {
  if (response instanceof Error) state.get.mockRejectedValue(response);
  else state.get.mockResolvedValue(response);
  await mount(props);
  await toggle(true);
};

beforeEach(() => {
  state.get.mockReset();
  vi.stubEnv("VITE_EXCALIDRAW_VERSION", BUILT_VERSION);
});

afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllEnvs();
  setCurrentLocale("en");
});

describe("Advanced settings — Excalidraw editor row", () => {
  it("does not request the editor status until the panel is opened, then only once", async () => {
    state.get.mockResolvedValue(editorStatus());
    await mount();
    expect(state.get).not.toHaveBeenCalled();

    await toggle(true);
    expect(state.get).toHaveBeenCalledTimes(1);
    expect(state.get).toHaveBeenCalledWith("/system/editor");

    await toggle(false);
    await toggle(true);
    expect(state.get).toHaveBeenCalledTimes(1);
  });

  it("keeps provider-less English text and UTC dates when utility callers use Spanish", async () => {
    setCurrentLocale("es");
    await openWith(editorStatus({
      pinned: { ...pinned, releasedAt: "2026-10-27T00:30:00.000Z" },
    }));
    expect(textOf(editorRow())).toContain("Same build as excalidraw.com");
    expect(textOf(editorRow())).toContain("Oct 27, 2026");
  });

  it("is placed right after the Version row", async () => {
    await openWith(editorStatus());
    const titles = renderer!.root
      .findAllByType(SettingsRow)
      .map((node) => node.props.title);
    expect(titles.indexOf("Excalidraw editor")).toBe(
      titles.indexOf("Version") + 1,
    );
  });

  it("shows a checking message while the request is pending", async () => {
    state.get.mockReturnValue(new Promise(() => {}));
    await mount();
    await toggle(true);
    expect(textOf(editorRow())).toContain("Checking excalidraw.com…");
  });

  it("shows the editor version that was built into the bundle in the badge", async () => {
    vi.stubEnv("VITE_EXCALIDRAW_VERSION", "0.18.0-abcdef0");
    await openWith(editorStatus());
    const badges = editorRow()
      .findAllByType("span")
      .filter((node) => textOf(node) === "0.18.0-abcdef0");
    expect(badges).toHaveLength(1);
  });

  it("describes a match with the pinned release and date", async () => {
    await openWith(editorStatus({ status: "match" }));
    const text = textOf(editorRow());
    expect(text).toContain("Same build as excalidraw.com");
    expect(text).toContain("release 4ce8305");
    expect(text).toContain("Oct 27, 2026");
    expect(text).not.toContain("update available");
  });

  it("flags a newer upstream build in text", async () => {
    await openWith(
      editorStatus({
        status: "newer",
        upstream: {
          version: "0.18.0-a1b2c3d",
          shortCommit: "a1b2c3d",
          releasedAt: "2026-11-01T00:30:00.000Z",
        },
      }),
    );
    const text = textOf(editorRow());
    expect(text).toContain("excalidraw.com runs a newer build");
    expect(text).toContain("a1b2c3d");
    expect(text).toContain("Nov 1, 2026");
    expect(text).toContain("update available");
  });

  it("describes a different upstream build without claiming an update", async () => {
    await openWith(
      editorStatus({
        status: "different",
        upstream: {
          version: "0.18.0-a1b2c3d",
          shortCommit: "a1b2c3d",
          releasedAt: "2026-10-26T12:00:00.000Z",
        },
      }),
    );
    const text = textOf(editorRow());
    expect(text).toContain("excalidraw.com runs a different build");
    expect(text).toContain("a1b2c3d");
    expect(text).toContain("Oct 26, 2026");
    expect(text).not.toContain("update available");
  });

  it("explains when excalidraw.com could not be checked and keeps the pinned release", async () => {
    await openWith(editorStatus({ status: "unavailable", upstream: null }));
    const text = textOf(editorRow());
    expect(text).toContain("Couldn't check excalidraw.com");
    expect(text).toContain("pinned release 4ce8305");
  });

  it("degrades to a plain message when the request itself fails", async () => {
    await openWith(new Error("Network Error"));
    const text = textOf(editorRow());
    expect(text).toContain("Couldn't check excalidraw.com");
    expect(text).not.toContain("pinned release");
    expect(text).toContain(BUILT_VERSION);
  });

  it("announces the status politely and links commits to GitHub in a safe new tab", async () => {
    await openWith(editorStatus());
    const region = editorRow().findByProps({ role: "status" });
    expect(textOf(region)).toContain("Same build as excalidraw.com");

    const link = editorRow().findByType("a");
    expect(link.props.href).toBe(
      `https://github.com/excalidraw/excalidraw/commit/${PINNED_COMMIT}`,
    );
    expect(link.props.target).toBe("_blank");
    expect(link.props.rel).toBe("noopener noreferrer");
    expect(link.props["aria-label"]).toBe("Commit 4ce8305 on GitHub (opens in a new tab)");
    expect(textOf(link)).toBe("4ce8305");
  });

  it("links the upstream commit by its short hash", async () => {
    await openWith(
      editorStatus({
        status: "newer",
        upstream: {
          version: "0.18.0-a1b2c3d",
          shortCommit: "a1b2c3d",
          releasedAt: "2026-11-01T00:30:00.000Z",
        },
      }),
    );
    const hrefs = editorRow()
      .findAllByType("a")
      .map((node) => node.props.href);
    expect(hrefs).toEqual([
      "https://github.com/excalidraw/excalidraw/commit/a1b2c3d",
    ]);
  });
});

describe("Advanced settings — build constant", () => {
  it("injects the installed editor version, which is the pinned dependency", () => {
    const config = (
      viteConfig as (env: { command: string; mode: string }) => {
        define: Record<string, string>;
      }
    )({ command: "build", mode: "production" });
    expect(config.define["import.meta.env.VITE_EXCALIDRAW_VERSION"]).toBe(
      JSON.stringify(frontendPackage.dependencies["@excalidraw/excalidraw"]),
    );
  });
});

describe("Advanced settings — authentication row", () => {
  it("describes Sites-managed authentication without a disable control", async () => {
    await mount();
    const auth = row("Authentication");
    expect(auth).toBeDefined();
    const text = textOf(auth);
    expect(text).toContain("Managed by ChatGPT Sites");
    expect(text).not.toContain("AUTH_MODE");
    expect(buttonsIn(auth)).toHaveLength(0);
    expect(textOf(renderer!.root)).not.toContain("Disable");
  });

  it("keeps the Disable button for local authentication", async () => {
    await mount({
      authMode: "local",
      isManagedAuthMode: false,
      authEnabled: true,
    });
    const auth = row("Authentication on");
    expect(textOf(auth)).toContain("Multi-user login enabled");
    const [button] = buttonsIn(auth);
    expect(textOf(button)).toBe("Disable");
    expect(button.props.disabled).toBe(false);
  });

  it("keeps the Enable button when local authentication is off", async () => {
    await mount({
      authMode: "local",
      isManagedAuthMode: false,
      authEnabled: false,
    });
    const auth = row("Authentication off");
    expect(textOf(auth)).toContain("Single-user mode");
    expect(textOf(buttonsIn(auth)[0])).toBe("Enable");
  });
});

describe("Advanced settings — version row", () => {
  it("still shows the Sites edition label and application version", async () => {
    await mount();
    const text = textOf(row("Version"));
    expect(text).toContain("ChatGPT Sites · personal");
    expect(text).toContain("0.6.7");
  });
});
