import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HardDrive } from 'lucide-react';
import { backupService, BackupHistoryItem, BackupRunResult } from '@/services/settings-service';
import { useAuthStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import { settingsBoxTone } from '@/components/settings/settings-visual';

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
      <section className={cn('dhara-set-panel', settingsBoxTone(0))}>
        <div className="mb-4 flex items-start gap-3">
          <span className="dhara-set-icon">
            <HardDrive />
          </span>
          <div>
            <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
              Backup Now
            </h3>
            <p className="dhara-set-note" style={{ marginTop: '0.35rem' }}>
              Save the database and photos to this PC. Copy the ZIP to a pendrive for safekeeping.
            </p>
          </div>
        </div>
        {canUpdate ? (
          <>
            <button
              type="button"
              className="dhara-set-btn is-gold"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Creating backup...' : 'Backup Now'}
            </button>
            {createMutation.isPending && (
              <p className="dhara-set-note">Backing up database and photos. Please wait...</p>
            )}
            {createMutation.data?.backupFile && (
              <p className="dhara-set-note">
                Last backup: <span className="font-mono">{createMutation.data.backupFile}</span>{' '}
                ({formatBytes(createMutation.data.sizeBytes)})
              </p>
            )}
          </>
        ) : (
          <p className="dhara-set-note">You need settings update permission to create backups.</p>
        )}
      </section>

      <section className={cn('dhara-set-panel', settingsBoxTone(1))}>
        <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
          Restore Backup
        </h3>
        <p className="dhara-set-note" style={{ marginTop: '0.35rem' }}>
          Choose a backup from this PC or a pendrive. The file is checked before any data is replaced.
        </p>
        {canRestore ? (
          <div className="mt-4 space-y-3">
            <div className="dhara-set-toolbar-row">
              <input
                className="dhara-set-input"
                style={{ flex: '1 1 16rem' }}
                placeholder="Backup ZIP path"
                value={restorePath}
                onChange={(event) => setRestorePath(event.target.value)}
              />
              <button
                type="button"
                className="dhara-set-btn"
                disabled={browseMutation.isPending}
                onClick={() => browseMutation.mutate()}
              >
                Browse PC / Pendrive
              </button>
              <button
                type="button"
                className="dhara-set-btn"
                disabled={!restorePath.trim() || previewMutation.isPending}
                onClick={() => previewMutation.mutate(restorePath.trim())}
              >
                {previewMutation.isPending ? 'Checking...' : 'Check Backup'}
              </button>
            </div>
            {preview && (
              <div className="dhara-set-fact">
                <p className="dhara-set-note" style={{ marginTop: 0 }}>
                  This will replace the current Dhara Photography ERP data and photos with this backup.
                </p>
                <ul className="dhara-set-note" style={{ marginTop: '0.7rem' }}>
                  <li>Date: {formatWhen(preview.createdAt)}</li>
                  <li>
                    Application: {preview.applicationName} (format {preview.backupFormatVersion})
                  </li>
                  <li>Database: {preview.databaseName}</li>
                  <li>Photos/files: {preview.uploadFileCount ?? 0}</li>
                  <li>Size: {formatBytes(preview.sizeBytes)}</li>
                  <li>Integrity: {preview.integrity ?? 'passed'}</li>
                </ul>
                <label className="mt-4 block">
                  Type REPLACE to confirm
                  <input
                    className="dhara-set-input mt-1"
                    value={confirmPhrase}
                    onChange={(event) => setConfirmPhrase(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="dhara-set-btn is-gold mt-3"
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
          <p className="dhara-set-note">Only the studio owner can restore a backup.</p>
        )}
      </section>

      <section className={cn('dhara-set-panel', settingsBoxTone(2))}>
        <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
          Backup History
        </h3>
        <p className="dhara-set-note" style={{ marginTop: '0.35rem' }}>
          Older backups are kept until you delete them yourself. Nothing is removed automatically.
        </p>
        {historyQuery.isLoading ? (
          <p className="dhara-set-note">Loading backup history...</p>
        ) : (historyQuery.data?.length ?? 0) === 0 ? (
          <p className="dhara-set-note">No backups found in the backup folder yet.</p>
        ) : (
          <div className="dhara-set-table-wrap" style={{ marginTop: '1rem' }}>
            <table className="dhara-set-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th>Status</th>
                  {canRestore && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {(historyQuery.data ?? []).map((item: BackupHistoryItem) => (
                  <tr key={item.path}>
                    <td>{item.fileName}</td>
                    <td>{formatWhen(item.modifiedAt)}</td>
                    <td>{formatBytes(item.sizeBytes)}</td>
                    <td>
                      <span className="dhara-set-pill is-green">{item.status}</span>
                    </td>
                    {canRestore && (
                      <td>
                        <button
                          type="button"
                          className="dhara-set-btn"
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
      </section>

      <section className={cn('dhara-set-panel', settingsBoxTone(3))}>
        <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
          Backup Location
        </h3>
        <p className="dhara-set-note" style={{ marginTop: '0.35rem' }}>
          Backups stay on this PC. Copy a ZIP to a pendrive for off-site safety. The folder cannot be
          inside the application directory.
        </p>
        <p className={cn('dhara-set-note font-mono')}>
          Current: {locationQuery.data?.backupDir ?? 'Loading...'}
        </p>
        {canUpdate && (
          <div className="dhara-set-toolbar-row" style={{ marginTop: '1rem' }}>
            <input
              className="dhara-set-input"
              style={{ flex: '1 1 16rem' }}
              placeholder={locationQuery.data?.defaultBackupDir}
              value={currentLocation}
              onChange={(event) => setLocationDraft(event.target.value)}
            />
            <button
              type="button"
              className="dhara-set-btn is-gold"
              disabled={locationMutation.isPending || !currentLocation.trim()}
              onClick={() => locationMutation.mutate(currentLocation.trim())}
            >
              {locationMutation.isPending ? 'Saving...' : 'Save location'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
