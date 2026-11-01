import { useEffect, useState, type ReactNode } from "react";
import { PencilRuler } from "lucide-react";
import { getEditorStatus, type EditorStatus } from "../../api/system";
import { useLocale } from "../../context/useLocale";
import { formatDate } from "../../locales/format";
import type { Locale } from "../../i18n";
import { SettingsRow } from "./SettingsRow";

type EditorCheck =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "ready"; editor: EditorStatus };

const dateSuffix = (iso: string, locale: Locale) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = formatDate(date, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return ` · ${formatted}`;
};

const CommitLink = ({ sha, label }: { sha: string; label: string }) => {
  const { t } = useLocale();
  return (
    <a
      href={`https://github.com/excalidraw/excalidraw/commit/${encodeURIComponent(sha)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("settings.editor.commitLink", { commit: label })}
      className="font-bold text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
    >
      {label}
    </a>
  );
};

const CheckDescription = ({ check }: { check: EditorCheck }): ReactNode => {
  const { t, locale } = useLocale();
  if (check.state === "loading") return t("settings.editor.checking");
  if (check.state === "failed") return t("settings.editor.failed");

  const { pinned, upstream, status } = check.editor;
  const pinnedLink = <CommitLink sha={pinned.commit} label={pinned.shortCommit} />;
  if (!upstream || status === "unavailable") {
    return <>{t("settings.editor.unavailable")} {pinnedLink}</>;
  }
  if (status === "match") {
    return (
      <>
        {t("settings.editor.match")} {pinnedLink}
        {dateSuffix(pinned.releasedAt, locale)}
      </>
    );
  }
  const upstreamBuild = (
    <>
      (<CommitLink sha={upstream.shortCommit} label={upstream.shortCommit} />
      {dateSuffix(upstream.releasedAt, locale)})
    </>
  );
  if (status === "newer") {
    return (
      <>
        {t("settings.editor.newer")} {upstreamBuild} ·{" "}
        <span className="font-bold text-amber-700 dark:text-amber-400">
          {t("settings.editor.update")}
        </span>
      </>
    );
  }
  return <>{t("settings.editor.different")} {upstreamBuild}</>;
};

export const EditorStatusRow = ({ active }: { active: boolean }) => {
  const { t } = useLocale();
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
      title={t("settings.editor.title")}
      description={<span role="status"><CheckDescription check={check} /></span>}
    >
      <span className="rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-black dark:border-neutral-600 dark:text-neutral-200">
        {import.meta.env.VITE_EXCALIDRAW_VERSION || t("settings.version.unknown")}
      </span>
    </SettingsRow>
  );
};
