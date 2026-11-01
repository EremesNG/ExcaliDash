import { isAxiosError } from "../api/client";
import { hasTranslation, translate } from "../i18n";

const getPayloadMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const payload = data as { code?: unknown; message?: unknown; error?: unknown };
  if (typeof payload.code === "string") {
    const key = `errors.${payload.code}`;
    if (hasTranslation(key)) return translate(key);
  }
  if (typeof payload.message === "string" && payload.message) return payload.message;
  if (typeof payload.error === "string" && payload.error) return payload.error;
  return undefined;
};

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (isAxiosError(error)) {
    return getPayloadMessage(error.response?.data) ?? fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

// responseType: "blob" also turns JSON error responses into Blobs. Decode them
// without mutating the Axios error; malformed/non-JSON bodies use the fallback.
export const getApiErrorMessageAsync = async (
  error: unknown,
  fallback: string,
): Promise<string> => {
  if (
    isAxiosError(error) &&
    typeof Blob !== "undefined" &&
    error.response?.data instanceof Blob
  ) {
    try {
      const payload: unknown = JSON.parse(await error.response.data.text());
      return getPayloadMessage(payload) ?? fallback;
    } catch {
      return fallback;
    }
  }
  return getApiErrorMessage(error, fallback);
};
