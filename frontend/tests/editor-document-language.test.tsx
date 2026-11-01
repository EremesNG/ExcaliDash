import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRestoreDocumentLanguage } from "../src/pages/editor/useRestoreDocumentLanguage";
import { useLocale } from "../src/context/useLocale";
import { LocaleTestProvider } from "./helpers/locale";

const EditorLanguage = () => {
  useRestoreDocumentLanguage();
  return null;
};

let renderer: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.stubGlobal("document", { documentElement: { lang: "es" } });
});
afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});

describe("editor document language ownership", () => {
  it.each([
    ["es-ES", "es"],
    ["fr-FR", "en"],
  ])("restores the resolved app locale after leaving the %s editor", (language, locale) => {
    act(() => {
      renderer = create(<LocaleTestProvider language={language}><EditorLanguage /></LocaleTestProvider>);
    });
    // Excalidraw owns its language tag while the editor is mounted.
    document.documentElement.lang = language;
    expect(document.documentElement.lang).toBe(language);

    act(() => {
      renderer!.update(<LocaleTestProvider language={language}>{null}</LocaleTestProvider>);
    });
    expect(document.documentElement.lang).toBe(locale);
  });

  it("restores the current app locale, not the locale from editor mount", () => {
    const ChangeLanguage = () => {
      const { setLanguage } = useLocale();
      return <button onClick={() => setLanguage("en")}>English</button>;
    };
    act(() => {
      renderer = create(<LocaleTestProvider language="es-ES"><EditorLanguage /><ChangeLanguage /></LocaleTestProvider>);
    });
    document.documentElement.lang = "es-ES";
    act(() => renderer!.root.findByType("button").props.onClick());
    expect(document.documentElement.lang).toBe("es-ES");

    act(() => {
      renderer!.update(<LocaleTestProvider language="es-ES">{null}</LocaleTestProvider>);
    });
    expect(document.documentElement.lang).toBe("en");
  });

  it("can unmount without browser globals", () => {
    vi.stubGlobal("document", undefined);
    act(() => {
      renderer = create(<LocaleTestProvider language="es-ES"><EditorLanguage /></LocaleTestProvider>);
    });
    expect(() => act(() => {
      renderer!.update(<LocaleTestProvider language="es-ES">{null}</LocaleTestProvider>);
    })).not.toThrow();
  });
});
