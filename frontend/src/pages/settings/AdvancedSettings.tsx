import { useState } from "react";
import type React from "react";
import {
  ArchiveRestore,
  ChevronRight,
  Info,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { EditorStatusRow } from "./EditorStatusRow";
import { SettingsRow, settingsButtonClass } from "./SettingsRow";
import { importLegacyFiles } from "../../utils/importUtils";
import { useLocale } from "../../context/useLocale";

type DialogState = { isOpen: boolean; message: string };
type SuccessDialogState = { isOpen: boolean; message: React.ReactNode };

type AdvancedSettingsProps = {
  authEnabled: boolean | null;
  authMode: string | null | undefined;
  authToggleLoading: boolean;
  backupImportLoading: boolean;
  legacyDbImportLoading: boolean;
  isManagedAuthMode: boolean;
  user: { role?: string } | null | undefined;
  appVersion: string;
  buildLabel: string | undefined;
  verifyBackupFile: (file: File) => Promise<void>;
  verifyLegacyDbFile: (file: File) => Promise<void>;
  confirmToggleAuthEnabled: () => void;
  setImportError: React.Dispatch<React.SetStateAction<DialogState>>;
  setImportSuccess: React.Dispatch<React.SetStateAction<SuccessDialogState>>;
};

type AdvancedPanelProps = AdvancedSettingsProps & {
  onToggle: React.ReactEventHandler<HTMLDetailsElement>;
  editorRow: React.ReactNode;
};

const AdvancedPanel = ({
  authEnabled,
  authToggleLoading,
  backupImportLoading,
  legacyDbImportLoading,
  isManagedAuthMode,
  user,
  appVersion,
  buildLabel,
  verifyBackupFile,
  verifyLegacyDbFile,
  confirmToggleAuthEnabled,
  setImportError,
  setImportSuccess,
  onToggle,
  editorRow,
}: AdvancedPanelProps) => {
  const { t, plural } = useLocale();
  return (
    <details
      onToggle={onToggle}
      className="group mt-10 overflow-hidden rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
    >
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-neutral-200 sm:px-5 sm:text-base">
        <ChevronRight
          size={16}
          className="transition-transform group-open:rotate-90"
        />
        {t("settings.advanced.title")}
      </summary>
      <div className="divide-y divide-slate-100 border-t-2 border-slate-100 dark:divide-neutral-800 dark:border-neutral-800">
        <SettingsRow
          icon={<Upload size={20} />}
          tileClassName="border-black bg-blue-400 text-black dark:border-neutral-700 dark:bg-blue-400 dark:text-black"
          title={t("settings.backup.importTitle")}
          description={t("settings.backup.description")}
        >
          <input
            type="file"
            accept=".excalidash"
            className="hidden"
            id="settings-import-backup"
            onChange={async (e) => {
              const file = (e.target.files || [])[0];
              if (!file) return;
              await verifyBackupFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() =>
              document.getElementById("settings-import-backup")?.click()
            }
            disabled={backupImportLoading}
            className={settingsButtonClass}
          >
            {backupImportLoading ? t("settings.files.verifying") : t("settings.files.chooseOne")}
          </button>
        </SettingsRow>

        <SettingsRow
          icon={<ArchiveRestore size={20} />}
          tileClassName="border-black bg-amber-300 text-black dark:border-neutral-700 dark:bg-amber-400 dark:text-black"
          title={t("settings.legacy.title")}
          description={t("settings.legacy.description")}
        >
          <input
            type="file"
            multiple
            accept=".json,.excalidraw,.zip"
            className="hidden"
            id="settings-import-legacy"
            onChange={async (event) => {
              const files = Array.from(event.target.files || []);
              if (files.length === 0) return;
              const databaseFile = files.find(
                (file) =>
                  file.name.endsWith(".sqlite") || file.name.endsWith(".db"),
              );
              if (databaseFile) {
                if (files.length > 1) {
                  setImportError({
                    isOpen: true,
                    message:
                      t("settings.legacy.separate"),
                  });
                } else {
                  await verifyLegacyDbFile(databaseFile);
                }
                event.target.value = "";
                return;
              }
              const result = await importLegacyFiles(files, null, () => {});
              if (result.failed > 0) {
                setImportError({
                  isOpen: true,
                  message: t("settings.legacy.errors", {
                    success: plural("settings.legacy.succeeded", result.success),
                    failed: plural("settings.legacy.failed", result.failed),
                    errors: result.errors.join("\n"),
                  }),
                });
              } else {
                setImportSuccess({
                  isOpen: true,
                  message: plural("settings.legacy.imported", result.success),
                });
              }
              event.target.value = "";
            }}
          />
          <button
            onClick={() =>
              document.getElementById("settings-import-legacy")?.click()
            }
            disabled={legacyDbImportLoading}
            className={settingsButtonClass}
          >
            {legacyDbImportLoading ? t("settings.files.verifying") : t("settings.files.chooseMany")}
          </button>
        </SettingsRow>

        <SettingsRow
          icon={<ShieldCheck size={20} />}
          tileClassName="border-black bg-slate-300 text-black dark:border-neutral-700 dark:bg-neutral-700 dark:text-white"
          title={
            isManagedAuthMode
              ? t("settings.auth.title")
              : authEnabled
                ? t("settings.auth.on")
                : t("settings.auth.off")
          }
          description={
            isManagedAuthMode
              ? t("settings.auth.managed")
              : authEnabled
                ? user?.role === "ADMIN"
                  ? t("settings.auth.multiUser")
                  : t("settings.auth.adminOnly")
                : t("settings.auth.singleUser")
          }
        >
          {isManagedAuthMode ? null : (
            <button
              onClick={confirmToggleAuthEnabled}
              disabled={
                authEnabled === null ||
                authToggleLoading ||
                (authEnabled === true && user?.role !== "ADMIN")
              }
              className={settingsButtonClass}
            >
              {authToggleLoading
                ? authEnabled
                  ? t("settings.auth.disabling")
                  : t("settings.auth.enabling")
                : authEnabled
                  ? t("settings.auth.disable")
                  : t("settings.auth.enable")}
            </button>
          )}
        </SettingsRow>

        <SettingsRow
          icon={<Info size={20} />}
          tileClassName="border-black bg-gray-300 text-black dark:border-neutral-700 dark:bg-neutral-700 dark:text-white"
          title={t("settings.version.title")}
          description={
            buildLabel ? (
              <span className="font-bold text-red-500 dark:text-red-400">
                {buildLabel}
              </span>
            ) : undefined
          }
        >
          <span className="rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-black dark:border-neutral-600 dark:text-neutral-200">
            {appVersion}
          </span>
        </SettingsRow>

        {editorRow}
      </div>
    </details>
  );
};

export const AdvancedSettings = (props: AdvancedSettingsProps) => {
  // The editor status is requested only once the panel has been opened.
  const [opened, setOpened] = useState(false);
  return (
    <AdvancedPanel
      {...props}
      onToggle={(event) => {
        if (event.currentTarget.open) setOpened(true);
      }}
      editorRow={<EditorStatusRow active={opened} />}
    />
  );
};
