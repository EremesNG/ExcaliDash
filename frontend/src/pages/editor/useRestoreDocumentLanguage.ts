import { useEffect } from "react";
import { getCurrentLocale } from "../../i18n";

// Excalidraw owns <html lang> while mounted; app chrome uses the resolved locale.
export const useRestoreDocumentLanguage = () => {
  useEffect(() => () => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = getCurrentLocale();
    }
  }, []);
};
