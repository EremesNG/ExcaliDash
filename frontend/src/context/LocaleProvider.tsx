import React, { useEffect, useMemo } from "react";
import { setCurrentLocale } from "../i18n";
import { createLocaleValue, LocaleContext } from "./localeContext";
import { usePreference } from "./PreferencesContext";

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const defaultLanguage =
    typeof navigator === "undefined" ? "en" : navigator.language;
  const [language, setLanguage] = usePreference("language", defaultLanguage);
  const value = useMemo(
    () => createLocaleValue(language, setLanguage),
    [language, setLanguage],
  );

  useEffect(() => {
    setCurrentLocale(value.locale);
    if (typeof document !== "undefined") {
      document.documentElement.lang = value.locale;
    }
  }, [value.locale]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};
