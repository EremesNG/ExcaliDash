import { createContext } from "react";
import {
  plural,
  resolveLocale,
  translate,
  type Locale,
  type PluralKey,
  type TranslationKey,
  type TranslationVars,
} from "../i18n";

export type LocaleContextValue = {
  locale: Locale;
  language: string;
  setLanguage: (language: string) => void;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  plural: (key: PluralKey, count: number, vars?: TranslationVars) => string;
};

export const createLocaleValue = (
  language: string,
  setLanguage: (language: string) => void,
): LocaleContextValue => {
  const locale = resolveLocale(language);
  return {
    locale,
    language,
    setLanguage,
    t: (key, vars) => translate(key, vars, locale),
    plural: (key, count, vars) => plural(key, count, vars, locale),
  };
};

// Provider-less rendering deliberately stays English, independent of utilities.
export const LocaleContext = createContext<LocaleContextValue>(
  createLocaleValue("en", () => {}),
);
