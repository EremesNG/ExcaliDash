import type React from "react";
import { ConfirmModal } from "../../components/ConfirmModal";
import * as api from "../../api";
import { useLocale } from "../../context/useLocale";
import { formatDateTime, formatNumber } from "../../locales/format";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

type LegacyDbImportConfirmation = {
  isOpen: boolean;
  file: File | null;
  info: null | {
    drawings: number;
    collections: number;
    legacyLatestMigration: string | null;
    currentLatestMigration: string | null;
  };
};

type BackupImportConfirmation = {
  isOpen: boolean;
  file: File | null;
  info: null | {
    formatVersion: number;
    exportedAt: string;
    excalidashBackendVersion: string | null;
    collections: number;
    drawings: number;
  };
};

type DialogState = { isOpen: boolean; message: string };

type SuccessDialogState = { isOpen: boolean; message: React.ReactNode };

type AuthToggleConfirm = { isOpen: boolean; nextEnabled: boolean | null };

type SettingsConfirmModalsProps = {
  legacyDbImportConfirmation: LegacyDbImportConfirmation;
  setLegacyDbImportConfirmation: React.Dispatch<
    React.SetStateAction<LegacyDbImportConfirmation>
  >;
  importError: DialogState;
  setImportError: React.Dispatch<React.SetStateAction<DialogState>>;
  importSuccess: SuccessDialogState;
  setImportSuccess: React.Dispatch<React.SetStateAction<SuccessDialogState>>;
  authToggleConfirm: AuthToggleConfirm;
  setAuthToggleConfirm: React.Dispatch<React.SetStateAction<AuthToggleConfirm>>;
  authDisableFinalConfirmOpen: boolean;
  setAuthDisableFinalConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setAuthEnabled: (enabled: boolean) => Promise<void>;
  backupImportConfirmation: BackupImportConfirmation;
  setBackupImportConfirmation: React.Dispatch<
    React.SetStateAction<BackupImportConfirmation>
  >;
  backupImportSuccess: boolean;
  setBackupImportSuccess: React.Dispatch<React.SetStateAction<boolean>>;
  backupImportError: DialogState;
  setBackupImportError: React.Dispatch<React.SetStateAction<DialogState>>;
  setBackupImportLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

export const SettingsConfirmModals = ({
  legacyDbImportConfirmation,
  setLegacyDbImportConfirmation,
  importError,
  setImportError,
  importSuccess,
  setImportSuccess,
  authToggleConfirm,
  setAuthToggleConfirm,
  authDisableFinalConfirmOpen,
  setAuthDisableFinalConfirmOpen,
  setAuthEnabled,
  backupImportConfirmation,
  setBackupImportConfirmation,
  backupImportSuccess,
  setBackupImportSuccess,
  backupImportError,
  setBackupImportError,
  setBackupImportLoading,
}: SettingsConfirmModalsProps) => {
  const { t, plural, locale } = useLocale();
  return (
    <>
      <ConfirmModal
        isOpen={legacyDbImportConfirmation.isOpen}
        title={t("settings.legacy.confirmTitle")}
        message={
          <div className="space-y-2 text-left">
            <div>
              {t("settings.legacy.confirmDescription")}
            </div>
            {legacyDbImportConfirmation.info && (
              <div className="space-y-1 text-sm text-slate-700 dark:text-neutral-200">
                <div>{t("settings.legacy.drawings", { count: formatNumber(legacyDbImportConfirmation.info.drawings, locale) })}</div>
                <div>
                  {t("settings.legacy.collections", { count: formatNumber(legacyDbImportConfirmation.info.collections, locale) })}
                </div>
                <div>
                  {t("settings.legacy.migration", { migration: legacyDbImportConfirmation.info.legacyLatestMigration || t("settings.values.unknown") })}
                </div>
                <div>
                  {t("settings.legacy.currentMigration", { migration: legacyDbImportConfirmation.info.currentLatestMigration || t("settings.values.unknown") })}
                </div>
              </div>
            )}
          </div>
        }
        confirmText={t("settings.legacy.merge")}
        cancelText={t("settings.actions.cancel")}
        onConfirm={async () => {
          const file = legacyDbImportConfirmation.file;
          if (!file) return;
          setLegacyDbImportConfirmation({
            isOpen: false,
            file: null,
            info: null,
          });
          const formData = new FormData();
          formData.append("db", file);
          try {
            const response = await api.api.post<{
              collections: { created: number; updated: number };
              drawings: { created: number; updated: number };
            }>("/import/sqlite/legacy", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            setImportSuccess({
              isOpen: true,
              message: t("settings.legacy.successSummary", {
                collectionsCreated: formatNumber(response.data.collections.created, locale),
                collectionsUpdated: formatNumber(response.data.collections.updated, locale),
                drawingsCreated: formatNumber(response.data.drawings.created, locale),
                drawingsUpdated: formatNumber(response.data.drawings.updated, locale),
              }),
            });
          } catch (err: unknown) {
            setImportError({ isOpen: true, message: getApiErrorMessage(err, t("settings.errors.importLegacy")) });
          }
        }}
        onCancel={() =>
          setLegacyDbImportConfirmation({ isOpen: false, file: null, info: null })
        }
      />
      <ConfirmModal
        isOpen={importError.isOpen}
        title={t("settings.import.failed")}
        message={<div className="whitespace-pre-line">{importError.message}</div>}
        confirmText={t("settings.actions.ok")}
        showCancel={false}
        isDangerous={false}
        onConfirm={() => setImportError({ isOpen: false, message: "" })}
        onCancel={() => setImportError({ isOpen: false, message: "" })}
      />
      <ConfirmModal
        isOpen={importSuccess.isOpen}
        title={t("settings.import.success")}
        message={<div className="whitespace-pre-line">{importSuccess.message}</div>}
        confirmText={t("settings.actions.ok")}
        showCancel={false}
        isDangerous={false}
        variant="success"
        onConfirm={() => setImportSuccess({ isOpen: false, message: "" })}
        onCancel={() => setImportSuccess({ isOpen: false, message: "" })}
      />
      <ConfirmModal
        isOpen={authToggleConfirm.isOpen}
        title={
          authToggleConfirm.nextEnabled
            ? t("settings.auth.enableTitle")
            : t("settings.auth.disableTitle")
        }
        message={
          authToggleConfirm.nextEnabled ? (
            t("settings.auth.enableDescription")
          ) : (
            <div className="space-y-2 text-left">
              <div>
                {t("settings.auth.disableDescription")}
              </div>
              <div className="font-semibold text-rose-700 dark:text-rose-300">
                {t("settings.auth.recommendation")}
              </div>
            </div>
          )
        }
        confirmText={authToggleConfirm.nextEnabled ? t("settings.auth.enable") : t("settings.actions.continue")}
        cancelText={t("settings.actions.cancel")}
        isDangerous={!authToggleConfirm.nextEnabled}
        onConfirm={async () => {
          const nextEnabled = authToggleConfirm.nextEnabled;
          setAuthToggleConfirm({ isOpen: false, nextEnabled: null });
          if (typeof nextEnabled !== "boolean") return;
          if (!nextEnabled) {
            setAuthDisableFinalConfirmOpen(true);
            return;
          }
          await setAuthEnabled(nextEnabled);
        }}
        onCancel={() =>
          setAuthToggleConfirm({ isOpen: false, nextEnabled: null })
        }
      />
      <ConfirmModal
        isOpen={authDisableFinalConfirmOpen}
        title={t("settings.auth.finalTitle")}
        message={
          <div className="space-y-2 text-left">
            <div>
              {t("settings.auth.finalDescription")}
            </div>
            <div className="font-semibold text-rose-700 dark:text-rose-300">
              {t("settings.auth.privateWarning")}
            </div>
          </div>
        }
        confirmText={t("settings.auth.disableConfirm")}
        cancelText={t("settings.auth.keepEnabled")}
        isDangerous
        onConfirm={async () => {
          setAuthDisableFinalConfirmOpen(false);
          await setAuthEnabled(false);
        }}
        onCancel={() => setAuthDisableFinalConfirmOpen(false)}
      />
      <ConfirmModal
        isOpen={backupImportConfirmation.isOpen}
        title={t("settings.backup.confirmTitle")}
        message={
          backupImportConfirmation.info
            ? t("settings.backup.confirmSummary", {
                collections: plural("settings.backup.collections", backupImportConfirmation.info.collections),
                drawings: plural("settings.backup.drawings", backupImportConfirmation.info.drawings),
                version: backupImportConfirmation.info.formatVersion,
                date: formatDateTime(backupImportConfirmation.info.exportedAt, locale) || t("settings.backup.unknownDate"),
              })
            : t("settings.backup.confirmDescription")
        }
        confirmText={t("settings.actions.import")}
        cancelText={t("settings.actions.cancel")}
        isDangerous={false}
        onConfirm={async () => {
          const file = backupImportConfirmation.file;
          if (!file) return;
          setBackupImportConfirmation({
            ...backupImportConfirmation,
            isOpen: false,
          });
          setBackupImportLoading(true);
          try {
            const formData = new FormData();
            formData.append("archive", file);
            await api.api.post("/import/excalidash", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            setBackupImportConfirmation({
              isOpen: false,
              file: null,
              info: null,
            });
            setBackupImportSuccess(true);
          } catch (err: unknown) {
            console.error("Backup import failed:", err);
            setBackupImportError({ isOpen: true, message: getApiErrorMessage(err, t("settings.errors.importBackup")) });
            setBackupImportConfirmation({
              isOpen: false,
              file: null,
              info: null,
            });
          } finally {
            setBackupImportLoading(false);
          }
        }}
        onCancel={() =>
          setBackupImportConfirmation({ isOpen: false, file: null, info: null })
        }
      />
      <ConfirmModal
        isOpen={backupImportSuccess}
        title={t("settings.backup.successTitle")}
        message={t("settings.backup.successDescription")}
        confirmText={t("settings.actions.ok")}
        showCancel={false}
        isDangerous={false}
        variant="success"
        onConfirm={() => setBackupImportSuccess(false)}
        onCancel={() => setBackupImportSuccess(false)}
      />
      <ConfirmModal
        isOpen={backupImportError.isOpen}
        title={t("settings.backup.failedTitle")}
        message={backupImportError.message}
        confirmText={t("settings.actions.ok")}
        cancelText=""
        showCancel={false}
        isDangerous={false}
        onConfirm={() => setBackupImportError({ isOpen: false, message: "" })}
        onCancel={() => setBackupImportError({ isOpen: false, message: "" })}
      />
    </>
  );
};
