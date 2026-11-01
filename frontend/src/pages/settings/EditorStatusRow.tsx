import { useEffect, useState, type ReactNode } from "react";
import { PencilRuler } from "lucide-react";
import { getEditorStatus, type EditorStatus } from "../../api/system";
import { SettingsRow } from "./SettingsRow";

type EditorCheck =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; editor: EditorStatus };

const dateSuffix = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return ` · ${formatted}`;
};

const CommitLink = ({ sha, label }: { sha: string; label: string }) => (
  <a
    href={`https://github.com/excalidraw/excalidraw/commit/${encodeURIComponent(sha)}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Commit ${label} on GitHub (opens in a new tab)`}
    className="font-bold text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
  >
    {label}
  </a>
);

const describeCheck = (check: EditorCheck): ReactNode => {
  if (check.state === "loading") return "Checking excalidraw.com…";
  if (check.state === "failed") return "Couldn't check excalidraw.com";

  const { pinned, upstream, status } = check.editor;
  const pinnedLink = (
    <CommitLink sha={pinned.commit} label={pinned.shortCommit} />
  );
  if (!upstream || status === "unavailable") {
    return <>Couldn't check excalidraw.com · pinned release {pinnedLink}</>;
  }
  if (status === "match") {
    return (
      <>
        Same build as excalidraw.com · release {pinnedLink}
        {dateSuffix(pinned.releasedAt)}
      </>
    );
  }
  const upstreamBuild = (
    <>
      (<CommitLink sha={upstream.shortCommit} label={upstream.shortCommit} />
      {dateSuffix(upstream.releasedAt)})
    </>
  );
  if (status === "newer") {
    return (
      <>
        excalidraw.com runs a newer build {upstreamBuild} ·{" "}
        <span className="font-bold text-amber-700 dark:text-amber-400">
          update available
        </span>
      </>
    );
  }
  return <>excalidraw.com runs a different build {upstreamBuild}</>;
};

export const EditorStatusRow = ({ active }: { active: boolean }) => {
  const [check, setCheck] = useState<EditorCheck>({ state: "loading" });

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    getEditorStatus().then(
      (editor) => {
        if (!cancelled) setCheck({ state: "ready", editor });
      },
      () => {
        if (!cancelled) setCheck({ state: "failed" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active]);

  return (
    <SettingsRow
      icon={<PencilRuler size={20} />}
      tileClassName="border-black bg-indigo-300 text-black dark:border-neutral-700 dark:bg-indigo-400 dark:text-black"
      title="Excalidraw editor"
      description={<span role="status">{describeCheck(check)}</span>}
    >
      <span className="rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-black dark:border-neutral-600 dark:text-neutral-200">
        {import.meta.env.VITE_EXCALIDRAW_VERSION || "Unknown version"}
      </span>
    </SettingsRow>
  );
};
