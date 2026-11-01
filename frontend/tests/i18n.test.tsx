import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, axios } from "../src/api/client";
import { AuthProvider } from "../src/context/AuthContext";
import { PreferencesProvider } from "../src/context/PreferencesContext";
import { LocaleProvider } from "../src/context/LocaleProvider";
import { useLocale } from "../src/context/useLocale";
import { LocaleTestProvider } from "./helpers/locale";
import { getApiErrorMessage, getApiErrorMessageAsync } from "../src/utils/getApiErrorMessage";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  getDateFnsLocale,
} from "../src/locales/format";
import {
  APP_LANGUAGES,
  getCurrentLocale,
  plural,
  resolveLocale,
  setCurrentLocale,
  translate,
} from "../src/i18n";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let renderer: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  setCurrentLocale("en");
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const LocaleProbe = () => {
  const { locale, t, plural, setLanguage } = useLocale();
  return <button onClick={() => setLanguage("es-ES")}>
    {locale}|{t("sidebar.library")}|{plural("common.items", 2)}
  </button>;
};

const mountProvider = async () => {
  await act(async () => {
    renderer = create(
      <MemoryRouter>
        <AuthProvider>
          <PreferencesProvider>
            <LocaleProvider><LocaleProbe /></LocaleProvider>
          </PreferencesProvider>
        </AuthProvider>
      </MemoryRouter>,
    );
  });
};

describe("locale provider", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubGlobal("document", { documentElement: { lang: "en" } });
    vi.stubGlobal("window", { location: { pathname: "/", search: "" } });
    vi.stubGlobal("navigator", { language: "es-MX" });
    vi.spyOn(axios, "get").mockResolvedValue({ data: { authEnabled: false } });
    vi.spyOn(api, "get").mockResolvedValue({ data: { preferences: {} } });
    vi.spyOn(api, "put").mockResolvedValue({ data: { preferences: {} } });
  });

  it("uses English without a provider even when the utility locale is Spanish", () => {
    setCurrentLocale("es");
    act(() => { renderer = create(<LocaleProbe />); });
    expect(renderer!.root.findByType("button").children.join("")).toBe("en|Library|2 items");
  });

  it("follows the browser on first visit and sets html lang and utility translations", async () => {
    await mountProvider();
    expect(renderer!.root.findByType("button").children.join("")).toBe("es|Biblioteca|2 elementos");
    expect(document.documentElement.lang).toBe("es");
    expect(getCurrentLocale()).toBe("es");
    expect(translate("sidebar.library")).toBe("Biblioteca");
  });

  it("keeps stored preferences ahead of the browser and follows language changes", async () => {
    localStorage.setItem("excalidash-preferences", JSON.stringify({ language: "zh-CN" }));
    await mountProvider();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(getCurrentLocale()).toBe("zh-CN");
    await act(async () => { renderer!.root.findByType("button").props.onClick(); });
    expect(document.documentElement.lang).toBe("es");
    expect(getCurrentLocale()).toBe("es");
    expect(translate("sidebar.library")).toBe("Biblioteca");
    expect(JSON.parse(localStorage.getItem("excalidash-preferences")!).language).toBe("es-ES");
  });

  it("lets the stored server preference override the browser", async () => {
    vi.spyOn(api, "get").mockResolvedValue({ data: { preferences: { language: "en" } } });
    await mountProvider();
    expect(document.documentElement.lang).toBe("en");
    expect(getCurrentLocale()).toBe("en");
    expect(renderer!.root.findByType("button").children.join("")).toBe("en|Library|2 items");
  });

  it("defaults to English and remains safe without browser globals", async () => {
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("document", undefined);
    vi.spyOn(api, "get").mockResolvedValue({ data: { preferences: { language: "en" } } });
    await mountProvider();
    expect(getCurrentLocale()).toBe("en");
  });

  it("exports preference codes that the editor accepts", () => {
    expect(APP_LANGUAGES).toEqual([
      { code: "en", label: "English" },
      { code: "es-ES", label: "Español" },
      { code: "zh-CN", label: "中文" },
    ]);
  });
});

it("renders a chosen locale in the Node test fixture without a navigator", () => {
  vi.stubGlobal("navigator", undefined);
  act(() => {
    renderer = create(<LocaleTestProvider language="es-ES"><LocaleProbe /></LocaleTestProvider>);
  });
  expect(renderer!.root.findByType("button").children.join("")).toBe("es|Biblioteca|2 elementos");
  expect(getCurrentLocale()).toBe("es");
  act(() => renderer!.unmount());
  renderer = undefined;
  expect(getCurrentLocale()).toBe("en");
});

describe("API error localization", () => {
  const apiError = (data?: unknown) => ({ isAxiosError: true, response: { data } });

  beforeEach(() => setCurrentLocale("es"));

  it("translates known codes in the current locale", () => {
    expect(getApiErrorMessage(apiError({ code: "DRAWING_NOT_FOUND", error: "Drawing not found" }), "Fallback"))
      .toBe("No se ha encontrado el dibujo");
    expect(getApiErrorMessage(apiError({ code: "ARCHIVE_UPLOAD_TOO_LARGE", error: "Archive too large (20 MB maximum)" }), "Fallback"))
      .toBe("El archivo supera el tamaño máximo de 20 MB");
  });

  it.each([
    [{ code: "FUTURE_CODE", error: "Future server error" }, "Future server error"],
    [{ message: "Server message" }, "Server message"],
    [{ error: "Server error" }, "Server error"],
    [undefined, "Fallback"],
    [null, "Fallback"],
    [{ code: 42, error: {} }, "Fallback"],
    [{ error: "", message: "" }, "Fallback"],
  ])("keeps server text or the supplied fallback for %j", (data, expected) => {
    expect(getApiErrorMessage(apiError(data), "Fallback")).toBe(expected);
  });

  it("keeps native Error messages, but does not leak generic Axios messages", () => {
    expect(getApiErrorMessage(new Error("Local error"), "Fallback")).toBe("Local error");
    expect(getApiErrorMessage({ isAxiosError: true, message: "Request failed with status code 500" }, "Fallback"))
      .toBe("Fallback");
    expect(getApiErrorMessage({}, "Fallback")).toBe("Fallback");
  });

  it("decodes Blob JSON errors without mutating the response", async () => {
    const body = new Blob([JSON.stringify({ code: "DRAWING_NOT_FOUND", error: "Drawing not found" })], { type: "application/json" });
    const error = apiError(body);
    expect(await getApiErrorMessageAsync(error, "Fallback")).toBe("No se ha encontrado el dibujo");
    expect(error.response.data).toBe(body);
    expect(await getApiErrorMessageAsync(apiError(new Blob(['{"error":"Server text"}'])), "Fallback")).toBe("Server text");
    expect(await getApiErrorMessageAsync(apiError(new Blob(["Not JSON"])), "Fallback")).toBe("Fallback");
    expect(await getApiErrorMessageAsync(apiError({ code: "DRAWING_NOT_FOUND" }), "Fallback")).toBe("No se ha encontrado el dibujo");
  });

  // Frozen API contract: keep this list independent of the dictionary so omissions fail.
  it.each([
    "INVALID_NAME", "REQUEST_TOO_LARGE", "INVALID_JSON", "INTERNAL_ERROR", "AUTH_REQUIRED",
    "CSRF_ORIGIN_REJECTED", "DRAWING_NOT_FOUND", "INVALID_COLLECTION", "COLLECTION_NOT_FOUND",
    "SCENE_UNAVAILABLE", "INVALID_FILES", "INVALID_FILE_ID", "INVALID_FILE", "INVALID_IMAGE",
    "IMAGE_TOO_LARGE", "UNTRUSTED_IMAGE_REFERENCE", "IMAGE_MISSING", "INVALID_ELEMENTS",
    "INVALID_APP_STATE", "VERSION_CONFLICT", "AUTH_MANAGED_BY_SITES", "METHOD_NOT_ALLOWED",
    "INVALID_LIBRARY", "SITE_PRIVATE", "FILE_NOT_FOUND", "BACKUP_IMAGE_MISSING", "ARCHIVE_REQUIRED",
    "ARCHIVE_UPLOAD_TOO_LARGE", "INVALID_ARCHIVE", "ARCHIVE_TOO_MANY_ENTRIES", "UNSAFE_ARCHIVE_PATH",
    "ARCHIVE_EXPANDED_TOO_LARGE", "MANIFEST_MISSING", "INVALID_MANIFEST", "ARCHIVE_CONTENT_TOO_LARGE",
    "DUPLICATE_MANIFEST_IDS", "UNSAFE_DRAWING_PATH", "DRAWING_MISSING_FROM_ARCHIVE", "DRAWING_TOO_LARGE",
    "INVALID_DRAWING_JSON", "INVALID_DRAWING", "INVALID_SESSION", "INVALID_EVENT", "EVENT_TOO_LARGE",
    "INVALID_IMAGE_TYPE", "SNAPSHOT_NOT_FOUND", "IMAGE_UNAVAILABLE", "FEATURE_UNAVAILABLE", "ENDPOINT_NOT_FOUND",
  ])("translates frozen contract code %s", (code) => {
    const message = getApiErrorMessage(apiError({ code, error: "UNTRANSLATED" }), "Fallback");
    expect(message).not.toBe("UNTRANSLATED");
    expect(message).not.toBe("Fallback");
    expect(message.length).toBeGreaterThan(0);
  });
});

describe("locale-aware formatting", () => {
  const date = new Date("2026-10-27T10:20:30.000Z");

  it("formats Spanish dates and date-times using Intl options", () => {
    const options = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } as const;
    expect(formatDate(date, "es", options)).toBe(new Intl.DateTimeFormat("es", options).format(date));
    expect(formatDate(date, "es", options)).toContain("oct");
    const dateTimeOptions = { ...options, hour: "2-digit", minute: "2-digit" } as const;
    expect(formatDateTime(date.toISOString(), "es", dateTimeOptions)).toBe(
      new Intl.DateTimeFormat("es", dateTimeOptions).format(date),
    );
  });

  it("accepts Intl date/time styles without conflicting with component defaults", () => {
    const options = { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" } as const;
    expect(formatDateTime(date, "es", options)).toBe(new Intl.DateTimeFormat("es", options).format(date));
    expect(formatDate(date, "es", { dateStyle: "short" })).toBe(
      new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(date),
    );
  });

  it("chooses sensible relative units with automatic yesterday/tomorrow labels", () => {
    expect(formatRelativeTime(date.getTime() - 5 * 60_000, "es", date)).toBe("hace 5 minutos");
    expect(formatRelativeTime(date.getTime() - 86_400_000, "es", date)).toBe(
      new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(-1, "day"),
    );
    expect(formatRelativeTime(date.getTime() + 2 * 3_600_000, "en", date)).toBe("in 2 hours");
    expect(formatRelativeTime(date, "en", date)).toBe("now");
  });

  describe.each([
    ["formatDate", formatDate],
    ["formatDateTime", formatDateTime],
    ["formatRelativeTime", formatRelativeTime],
  ] as const)("%s", (_name, format) => {
    it.each([undefined, null, "", "not-a-date", NaN, Infinity, new Date(NaN)])(
      "returns an empty string without throwing for %s",
      (value) => {
        expect(format(value, "es")).toBe("");
      },
    );
  });

  it("keeps the zero timestamp valid rather than treating it as missing", () => {
    const options = { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } as const;
    expect(formatDate(0, "es", options)).toBe("1 ene 1970");
    expect(formatDateTime(0, "es", { ...options, hour: "2-digit", minute: "2-digit" })).toBe("1 ene 1970, 00:00");
    expect(formatRelativeTime(0, "en", 0)).toBe("now");
  });

  it("formats numbers, ratio percentages and binary bytes with locale separators", () => {
    expect(formatNumber(12345.6, "es")).toBe(new Intl.NumberFormat("es").format(12345.6));
    expect(formatPercentage(0.425, "es", { maximumFractionDigits: 1 })).toBe(
      new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: 1 }).format(0.425),
    );
    expect(formatBytes(1.5 * 1024 ** 2, "es")).toBe("1,5 MB");
    expect(formatBytes(1.5 * 1024 ** 2, "en")).toBe("1.5 MB");
    expect(formatBytes(1024, "es")).toBe("1 KB");
    expect(formatBytes(0, "es")).toBe("0 B");
    setCurrentLocale("es");
    expect(formatBytes(1.5 * 1024 ** 2)).toBe("1,5 MB");
  });

  it("maps all app locales to the installed date-fns locale", () => {
    expect(getDateFnsLocale("es").code).toBe("es");
    expect(getDateFnsLocale("en").code).toBe("en-US");
    expect(getDateFnsLocale("zh-CN").code).toBe("zh-CN");
  });
});

describe("messages", () => {
  it("interpolates values and falls back to English for missing Chinese keys", () => {
    expect(translate("common.items.other", { count: 3 }, "es")).toBe("3 elementos");
    expect(translate("common.items.other", { count: 3 }, "zh-CN")).toBe("3 items");
    expect(translate("common.items.other", {}, "en")).toBe("{count} items");
    expect(translate("common.items.other", { count: 0 }, "en")).toBe("0 items");
    expect(translate("common.items.other", { count: "$&" }, "en")).toBe("$& items");
  });

  it.each([
    ["en", 1, "1 item"],
    ["en", 2, "2 items"],
    ["es", 1, "1 elemento"],
    ["es", 2, "2 elementos"],
    ["es", 0, "0 elementos"],
    ["es", 1_000_000, "1000000 elementos"],
    ["zh-CN", 1, "1 items"],
  ] as const)("pluralizes in %s for %s", (locale, count, expected) => {
    expect(plural("common.items", count, undefined, locale)).toBe(expected);
  });
});

describe("locale resolution", () => {
  it.each([
    ["es-ES", "es"],
    ["es-MX", "es"],
    ["ES", "es"],
    ["zh-TW", "zh-CN"],
    ["fr", "en"],
    [undefined, "en"],
  ])("resolves %s to %s", (language, locale) => {
    expect(resolveLocale(language)).toBe(locale);
  });

  it("keeps the existing translation API and adds Spanish", () => {
    expect(translate("en", "sidebar.library")).toBe("Library");
    expect(translate(resolveLocale("es-ES"), "sidebar.library")).toBe("Biblioteca");
    expect(translate("zh-CN", "settings.language")).toBe("语言");
  });
});
