import { useEffect, useRef } from "react";
import { useLocale } from "../../context/useLocale";
import type { RefObject } from "react";
import { toast } from "sonner";
import * as api from "../../api";

type UseLibraryImportFromUrlParams = {
  excalidrawAPIRef: RefObject<any>;
  isReady: boolean;
  user: unknown;
};

export const useLibraryImportFromUrl = ({
  excalidrawAPIRef,
  isReady,
  user,
}: UseLibraryImportFromUrlParams) => {
  const { t } = useLocale();
  // Read current messages without restarting an in-flight import on language changes.
  const tRef = useRef(t);
  tRef.current = t;
  useEffect(() => {
    const t = tRef.current;
    if (!isReady || !excalidrawAPIRef.current) return;
    const hash = window.location.hash;
    if (!hash.includes("addLibrary=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const libraryUrl = params.get("addLibrary");
    if (!libraryUrl) return;
    const importLibraryFromUrl = async () => {
      try {
        let parsedUrl: URL;
        try {
          parsedUrl = new URL(libraryUrl, window.location.href);
        } catch {
          throw new Error(t("editor.library.invalidUrl"));
        }
        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
          throw new Error(t("editor.library.protocol"));
        }
        const isLocalhost =
          parsedUrl.hostname === "localhost" ||
          parsedUrl.hostname === "127.0.0.1" ||
          parsedUrl.hostname === "::1";
        const isCrossOrigin = parsedUrl.origin !== window.location.origin;
        if (isCrossOrigin) {
          const ok = window.confirm(
            t("editor.library.externalConfirm", { origin: parsedUrl.origin }),
          );
          if (!ok) {
            toast.info(t("editor.library.canceled"), { id: "library-import" });
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search,
            );
            return;
          }
        }
        if (
          !import.meta.env.DEV &&
          parsedUrl.protocol === "http:" &&
          !isLocalhost
        ) {
          throw new Error(t("editor.library.insecure"));
        }
        toast.loading(t("editor.library.importing"), { id: "library-import" });
        const response = await fetch(parsedUrl.toString(), {
          credentials: "omit",
        });
        if (!response.ok) {
          throw new Error(t("editor.library.fetchFailed", { status: response.statusText }));
        }
        const blob = await response.blob();
        if (blob.size > 10 * 1024 * 1024) {
          throw new Error(t("editor.library.tooLarge"));
        }
        await excalidrawAPIRef.current.updateLibrary({
          libraryItems: blob,
          merge: true,
          defaultStatus: "published",
          openLibraryMenu: true,
        });
        const updatedItems =
          excalidrawAPIRef.current.getAppState().libraryItems || [];
        if (user) {
          await api.updateLibrary([...updatedItems]);
        }
        toast.success(t("editor.library.imported"), {
          id: "library-import",
        });
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      } catch (err) {
        console.error("[Editor] Failed to import library:", err);
        toast.error(t("editor.library.importFailed"), { id: "library-import" });
      }
    };
    importLibraryFromUrl();
  }, [excalidrawAPIRef, isReady, user]);
};
