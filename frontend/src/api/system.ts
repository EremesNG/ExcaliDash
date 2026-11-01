import { api } from "./client";

export type UpdateChannel = "stable" | "prerelease";

export type UpdateInfo = {
  currentVersion: string | null;
  channel: UpdateChannel;
  outboundEnabled: boolean;
  latestVersion: string | null;
  latestUrl: string | null;
  publishedAt: string | null;
  isUpdateAvailable: boolean | null;
  error?: string;
};

export type EditorStatus = {
  pinned: {
    package: string;
    version: string;
    commit: string;
    shortCommit: string;
    releasedAt: string;
  };
  upstream: { version: string; shortCommit: string; releasedAt: string } | null;
  status: "match" | "newer" | "different" | "unavailable";
  checkedAt: string;
  sourceUrl: "https://excalidraw.com/version.json";
};

export const getUpdateInfo = async (
  channel: UpdateChannel,
): Promise<UpdateInfo> => {
  const response = await api.get<UpdateInfo>("/system/update", {
    params: { channel },
  });
  return response.data;
};

export const getEditorStatus = async (): Promise<EditorStatus> => {
  const response = await api.get<EditorStatus>("/system/editor");
  return response.data;
};
