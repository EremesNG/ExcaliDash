import * as common from "./locales/common";
import * as dashboard from "./locales/dashboard";
import * as editor from "./locales/editor";
import * as settings from "./locales/settings";
import * as importExport from "./locales/importExport";
import * as errors from "./locales/errors";

// Modules export flat en/es/zhCN maps. New keys use area.feature.label;
// legacy sidebar.* keys stay in dashboard. English defines the key schema.
const en = {
  ...common.en,
  ...dashboard.en,
  ...editor.en,
  ...settings.en,
  ...importExport.en,
  ...errors.en,
};

export type Locale = "en" | "es" | "zh-CN";
export type TranslationKey = keyof typeof en;
export type TranslationVars = Record<string, string | number>;
type PluralBase<K> = K extends `${infer Base}.one`
  ? `${Base}.other` extends TranslationKey
    ? Base
    : never
  : never;
export type PluralKey = PluralBase<TranslationKey>;

const messages: Record<Locale, Partial<Record<TranslationKey, string>>> = {
  en,
  es: {
    ...common.es,
    ...dashboard.es,
    ...editor.es,
    ...settings.es,
    ...importExport.es,
    ...errors.es,
  } satisfies Record<TranslationKey, string>,
  "zh-CN": {
    ...common.zhCN,
    ...dashboard.zhCN,
    ...editor.zhCN,
    ...settings.zhCN,
    ...importExport.zhCN,
    ...errors.zhCN,
  },
};

export const resolveLocale = (value: string | null | undefined): Locale => {
  const language = value?.toLowerCase();
  if (language?.startsWith("es")) return "es";
  return language?.startsWith("zh") ? "zh-CN" : "en";
};

export const APP_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es-ES", label: "Español" },
  { code: "zh-CN", label: "中文" },
] as const;

let currentLocale: Locale = "en";
export const getCurrentLocale = (): Locale => currentLocale;
// Written by LocaleProvider (and isolated test fixtures), not preference storage.
export const setCurrentLocale = (locale: Locale): void => {
  currentLocale = locale;
};

export const hasTranslation = (key: string): key is TranslationKey =>
  Object.hasOwn(en, key);

const lookup = (locale: Locale, key: TranslationKey): string =>
  messages[locale][key] ?? en[key] ?? key;

const interpolate = (message: string, vars: TranslationVars = {}): string =>
  message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(vars, name) ? String(vars[name]) : placeholder,
  );

// The locale-first overload preserves the original public API.
export function translate(locale: Locale, key: TranslationKey): string;
export function translate(
  key: TranslationKey,
  vars?: TranslationVars,
  locale?: Locale,
): string;
export function translate(
  keyOrLocale: TranslationKey | Locale,
  varsOrKey?: TranslationVars | TranslationKey,
  locale: Locale = getCurrentLocale(),
): string {
  if (typeof varsOrKey === "string") {
    return lookup(keyOrLocale as Locale, varsOrKey);
  }
  return interpolate(lookup(locale, keyOrLocale as TranslationKey), varsOrKey);
}

// Define <key>.one and <key>.other in en/es. Other Intl categories use .other
// unless that category has its own key. count is always available as {count}.
export const plural = (
  key: PluralKey,
  count: number,
  vars?: TranslationVars,
  locale: Locale = getCurrentLocale(),
): string => {
  const category = new Intl.PluralRules(locale).select(count);
  const candidate = `${key}.${category}`;
  const variant: TranslationKey = hasTranslation(candidate)
    ? candidate
    : `${key}.other`;
  return translate(variant, { ...vars, count }, locale);
};
