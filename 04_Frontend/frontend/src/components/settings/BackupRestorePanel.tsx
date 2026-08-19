import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HardDrive } from 'lucide-react';
import { backupService, BackupHistoryItem, BackupRunResult } from '@/services/settings-service';
import { useAuthStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

function formatBytes(sizeBytes?: number): string {
  if (!sizeBytes || sizeBytes <= 0) return '0 MB';
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatWhen(value?: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN');
}

interface BackupRestorePanelProps {
  onFeedback: (feedback: { type: 'success' | 'error'; message: string } | null) => void;
}

export function BackupRestorePanel({ onFeedback }: BackupRestorePanelProps) {
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((s) => s.hasPermission('settings.update'));
  const canRestore = useAuthStore((s) => s.hasPermission('roles.manage'));
  const [locationDraft, setLocationDraft] = useState('');
  const [restorePath, setRestorePath] = useState('');
  const [preview, setPreview] = useState<BackupRunResult | null>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const locationQuery = useQuery({
    queryKey: ['settings', 'backup', 'location'],
    queryFn: backupService.getLocation,
  });

  const historyQuery = useQuery({
    queryKey: ['settings', 'backup', 'history'],
    queryFn: backupService.listHistory,
  });

  const createMutation = useMutation({
    mutationFn: backupService.createBackup,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'backup', 'history'] });
      onFeedback({
        type: 'success',
        message: `Backup saved to ${result.backupFile ?? 'the backup folder'} (${formatBytes(result.sizeBytes)}).`,
      });
    },
    onError: (error: unknown) => {
      onFeedback({ type: 'error', message: getApiErrorMessage(error, 'Backup failed.') });
    },
  });

  const locationMutation = useMutation({
    mutationFn: backupService.setLocation,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'backup'] });
      setLocationDraft(result.backupDir);
      onFeedback({ type: 'success', message: `Backup location updated to ${result.backupDir}.` });
    },
    onError: (error: unknown) => {
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Could not change backup location.'),
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: backupService.previewRestore,
    onSuccess: (result) => {
      setPreview(result);
      setConfirmPhrase('');
      onFeedback(null);
    },
    onError: (error: unknown) => {
      setPreview(null);
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Backup validation failed. Current data was not changed.'),
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: ({ backupFile, phrase }: { backupFile: string; phrase: string }) =>
      backupService.restoreBackup(backupFile, phrase),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'backup', 'history'] });
      setPreview(null);
      setConfirmPhrase('');
      onFeedback({
        type: 'success',
        message:
          result.message ||
          'Restore succeeded. ERP data and photos were replaced from the selected backup.',
      });
    },
    onError: (error: unknown) => {
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Restore failed. The current database may need manual recovery.'),
      });
    },
  });

  const browseMutation = useMutation({
    mutationFn: backupService.browseBackup,
    onSuccess: (result) => {
      if (result.path) {
        setRestorePath(result.path);
        previewMutation.mutate(result.path);
      }
    },
    onError: (error: unknown) => {
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Could not open the backup file picker.'),
      });
    },
  });

  const currentLocation = locationDraft || locationQuery.data?.backupDir || '';

  return (
    <div className="space-y-6">
      <div className="card border-gold/20">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15">
            <HardDrive className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-gold">Backup Now</h3>
            <p className="text-sm text-gray-500">
              Save the database and photos to this PC. Copy the ZIP to a pendrive for safekeeping.
            </p>
          </div>
        </div>
        {canUpdate ? (
          <>
            <button
              type="button"
              className="btn-primary"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating backup...' : 'Backup Now'}
            </button>
            {createMutation.isPending && (
              <p className="mt-3 text-sm text-gray-400">Backing up database and photos. Please wait...</p>
            )}
            {createMutation.data?.backupFile && (
              <p className="mt-3 text-sm text-gray-300">
                Last backup: <span className="font-mono text-xs">{createMutation.data.backupFile}</span>{' '}
                ({formatBytes(createMutation.data.sizeBytes)})
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">You need settings update permission to create backups.</p>
        )}
      </div>

      <div className="card border-gold/20">
        <h3 className="font-display text-lg font-semibold text-gold">Restore Backup</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose a backup from this PC or a pendrive. The file is checked before any data is replaced.
        </p>
        {canRestore ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="input-field flex-1"
                placeholder="Backup ZIP path"
                value={restorePath}
                onChange={(event) => setRestorePath(event.target.value)}
              />
              <button
                type="button"
                className="btn-secondary"
                disabled={browseMutation.isPending}
                onClick={() => browseMutation.mutate()}
              >
                Browse PC / Pendrive
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={!restorePath.trim() || previewMutation.isPending}
                onClick={() => previewMutation.mutate(restorePath.trim())}
              >
                {previewMutation.isPending ? 'Checking...' : 'Check Backup'}
              </button>
            </div>
            {preview && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <p className="font-medium text-amber-300">
                  This will replace the current Dhara Photography ERP data and photos with this backup.
                </p>
                <ul className="mt-3 space-y-1 text-gray-300">
                  <li>Date: {formatWhen(preview.createdAt)}</li>
                  <li>
                    Application: {preview.applicationName} (format {preview.backupFormatVersion})
                  </li>
                  <li>Database: {preview.databaseName}</li>
                  <li>Photos/files: {preview.uploadFileCount ?? 0}</li>
                  <li>Size: {formatBytes(preview.sizeBytes)}</li>
                  <li>Integrity: {preview.integrity ?? 'passed'}</li>
                </ul>
                <label className="mt-4 block text-sm text-gray-300">
                  Type REPLACE to confirm
                  <input
                    className="input-field mt-1"
                    value={confirmPhrase}
                    onChange={(event) => setConfirmPhrase(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="btn-primary mt-3"
                  disabled={restoreMutation.isPending || confirmPhrase !== 'REPLACE'}
                  onClick={() =>
                    restoreMutation.mutate({
                      backupFile: restorePath.trim(),
                      phrase: confirmPhrase,
                    })
                  }
                >
                  {restoreMutation.isPending ? 'Restoring...' : 'Replace ERP data'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Only the studio owner can restore a backup.</p>
        )}
      </div>

      <div className="card border-gold/20">
        <h3 className="font-display text-lg font-semibold text-gold">Backup History</h3>
        <p className="mt-1 text-sm text-gray-500">
          Older backups are kept until you delete them yourself. Nothing is removed automatically.
        </p>
        {historyQuery.isLoading ? (
          <p className="mt-4 text-sm text-gray-500">Loading backup history...</p>
        ) : (historyQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No backups found in the backup folder yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-3 py-3 font-medium">File</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Size</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  {canRestore && <th className="px-3 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(historyQuery.data ?? []).map((item: BackupHistoryItem) => (
                  <tr key={item.path} className="border-b border-surface-border/70">
                    <td className="px-3 py-3 text-gray-200">{item.fileName}</td>
                    <td className="px-3 py-3 text-gray-400">{formatWhen(item.modifiedAt)}</td>
                    <td className="px-3 py-3 text-gray-300">{formatBytes(item.sizeBytes)}</td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs text-green-400">
                        {item.status}
                      </span>
                    </td>
                    {canRestore && (
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          className="rounded-lg border border-surface-border px-2.5 py-1.5 text-xs text-gray-300 hover:text-gold"
                          onClick={() => {
                            setRestorePath(item.path);
                            previewMutation.mutate(item.path);
                          }}
                        >
                          Restore this backup
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card border-gold/20">
        <h3 className="font-display text-lg font-semibold text-gold">Backup Location</h3>
        <p className="mt-1 text-sm text-gray-500">
          Backups stay on this PC. Copy a ZIP to a pendrive for off-site safety. The folder cannot be
          inside the application directory.
        </p>
        <p className={cn('mt-3 font-mono text-xs text-gray-400')}>
          Current: {locationQuery.data?.backupDir ?? 'Loading...'}
        </p>
        {canUpdate && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="input-field flex-1"
              placeholder={locationQuery.data?.defaultBackupDir}
              value={currentLocation}
              onChange={(event) => setLocationDraft(event.target.value)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={locationMutation.isPending || !currentLocation.trim()}
              onClick={() => locationMutation.mutate(currentLocation.trim())}
            >
              {locationMutation.isPending ? 'Saving...' : 'Save location'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
