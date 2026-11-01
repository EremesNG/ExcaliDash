import { enUS } from "date-fns/locale/en-US";
import { es } from "date-fns/locale/es";
import { zhCN } from "date-fns/locale/zh-CN";
import { getCurrentLocale, type Locale } from "../i18n";

// Date/time helpers return an empty string for missing or invalid dates.
type DateInput = Date | number | string | null | undefined;
const toDate = (value: DateInput): Date | null => {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

const dateTimeOptions: Intl.DateTimeFormatOptions = {
  ...dateOptions,
  hour: "2-digit",
  minute: "2-digit",
};

// Explicit options replace the defaults, just like Intl (including dateStyle).
export const formatDate = (
  value: DateInput,
  locale: Locale = getCurrentLocale(),
  options: Intl.DateTimeFormatOptions = dateOptions,
): string => {
  const date = toDate(value);
  return date ? new Intl.DateTimeFormat(locale, options).format(date) : "";
};

export const formatDateTime = (
  value: DateInput,
  locale: Locale = getCurrentLocale(),
  options: Intl.DateTimeFormatOptions = dateTimeOptions,
): string => formatDate(value, locale, options);

const relativeUnits: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

// Past/future timestamps; now can be supplied for deterministic tests.
export const formatRelativeTime = (
  value: DateInput,
  locale: Locale = getCurrentLocale(),
  now: DateInput = Date.now(),
): string => {
  const date = toDate(value);
  const reference = toDate(now);
  if (!date || !reference) return "";
  const seconds = Math.round((date.getTime() - reference.getTime()) / 1000);
  const [unit, size] =
    relativeUnits.find(([, size]) => Math.abs(seconds) >= size) ?? ["second", 1];
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    Math.round(seconds / size),
    unit,
  );
};

export const formatNumber = (
  value: number,
  locale: Locale = getCurrentLocale(),
  options?: Intl.NumberFormatOptions,
): string => new Intl.NumberFormat(locale, options).format(value);

// Input is a ratio: 0.5 -> 50%, not 0.5%.
export const formatPercentage = (
  value: number,
  locale: Locale = getCurrentLocale(),
  options?: Intl.NumberFormatOptions,
): string => formatNumber(value, locale, {
  maximumFractionDigits: 0,
  ...options,
  style: "percent",
});

// Binary sizes (1024 bytes/KB), capped at MB; at most one decimal digit.
export const formatBytes = (
  bytes: number,
  locale: Locale = getCurrentLocale(),
): string => {
  const size = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  const unit = size >= 1024 ** 2 ? 2 : size >= 1024 ? 1 : 0;
  const amount = formatNumber(size / 1024 ** unit, locale, { maximumFractionDigits: 1 });
  return `${amount} ${["B", "KB", "MB"][unit]}`;
};

const dateFnsLocales = { en: enUS, es, "zh-CN": zhCN };
export const getDateFnsLocale = (locale: Locale = getCurrentLocale()) =>
  dateFnsLocales[locale];
