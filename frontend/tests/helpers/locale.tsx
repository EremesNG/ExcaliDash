import React, { useEffect, useMemo, useState } from "react";
import { createLocaleValue, LocaleContext } from "../../src/context/localeContext";
import { getCurrentLocale, setCurrentLocale } from "../../src/i18n";

// Use inside act(() => create(<LocaleTestProvider language="es-ES">…</LocaleTestProvider>)).
// No Auth/Preferences providers or browser globals needed; unmount restores utilities.
export const LocaleTestProvider = ({
  language: initialLanguage,
  children,
}: {
  language: string;
  children: React.ReactNode;
}) => {
  const [language, setLanguage] = useState(initialLanguage);
  const value = useMemo(
    () => createLocaleValue(language, setLanguage),
    [language],
  );

  useEffect(() => {
    const previous = getCurrentLocale();
    setCurrentLocale(value.locale);
    return () => setCurrentLocale(previous);
  }, [value.locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};
