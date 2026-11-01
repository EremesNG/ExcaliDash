import React, { useLayoutEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditorSceneApi } from "../src/pages/editor/useEditorSceneApi";

const ref = <T,>(current: T) => ({ current });
let renderer: ReactTestRenderer | undefined;
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  vi.unstubAllGlobals();
});

const mountSceneApi = async () => {
  vi.stubGlobal("window", {});
  const files: Record<string, any> = {};
  const editor = {
    getFiles: () => files,
    addFiles: vi.fn((input: any[]) => {
      input.forEach((file) => {
        files[file.id] = file;
      });
    }),
  };
  const params = {
    canEdit: true,
    drawingId: "drawing",
    excalidrawAPIRef: ref<any>(null),
    isSyncing: ref(false),
    socketRef: ref({ emit: vi.fn() }),
    socketMeRef: ref({ id: "me" }),
    lastSyncedFilesRef: ref({}),
    latestFilesRef: ref({}),
    latestElementsRef: ref([{ id: "image", type: "image", fileId: "photo" }]),
    latestAppStateRef: ref({ viewBackgroundColor: "#ffffff" }),
    debouncedSaveRef: ref(vi.fn()),
    hasSceneChangesSinceLoadRef: ref(false),
    uploadedRefs: ref({}),
    scanFileUploads: vi.fn(),
    setIsReady: vi.fn(),
  };
  let sceneApi!: ReturnType<typeof useEditorSceneApi>;
  function Harness() {
    const nextSceneApi = useEditorSceneApi(params);
    useLayoutEffect(() => {
      sceneApi = nextSceneApi;
    });
    return null;
  }
  await act(async () => {
    renderer = create(<Harness />);
  });
  return { sceneApi, params, editor };
};

describe("editor API registration", () => {
  it("clears the live API and readiness when the editor unregisters on unmount", async () => {
    const { sceneApi, params, editor } = await mountSceneApi();
    sceneApi.setExcalidrawAPI(editor);
    expect(params.excalidrawAPIRef.current).toBe(editor);
    expect(params.setIsReady).toHaveBeenLastCalledWith(true);
    sceneApi.setExcalidrawAPI(null);
    expect(params.excalidrawAPIRef.current).toBeNull();
    expect(params.setIsReady).toHaveBeenLastCalledWith(false);
    expect(params.scanFileUploads).not.toHaveBeenCalled();
    expect(params.debouncedSaveRef.current).not.toHaveBeenCalled();
  });

  it("keeps image insertion broadcasting and saving the file after API re-registration", async () => {
    const { sceneApi, params, editor } = await mountSceneApi();
    sceneApi.setExcalidrawAPI(editor);
    sceneApi.setExcalidrawAPI(null);
    sceneApi.setExcalidrawAPI(editor);
    const photo = { id: "photo", dataURL: "data:image/png;base64,aW1hZ2U=" };
    editor.addFiles([photo]);
    expect(params.socketRef.current.emit).toHaveBeenCalledExactlyOnceWith(
      "element-update",
      {
        drawingId: "drawing",
        elements: [],
        files: { photo },
        userId: "me",
      },
    );
    expect(params.debouncedSaveRef.current).toHaveBeenCalledExactlyOnceWith(
      "drawing",
      params.latestElementsRef.current,
      params.latestAppStateRef.current,
      { photo },
    );
    expect(params.scanFileUploads).toHaveBeenCalledOnce();
  });
});
