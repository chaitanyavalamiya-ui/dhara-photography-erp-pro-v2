import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupRestorePanel } from './BackupRestorePanel';
import { backupService } from '@/services/settings-service';
import { useAuthStore } from '@/stores/auth-store';

vi.mock('@/services/settings-service', async () => {
  const actual = await vi.importActual<typeof import('@/services/settings-service')>(
    '@/services/settings-service',
  );
  return {
    ...actual,
    backupService: {
      getLocation: vi.fn(),
      setLocation: vi.fn(),
      listHistory: vi.fn(),
      createBackup: vi.fn(),
      downloadBackup: vi.fn(),
      uploadBackup: vi.fn(),
      browseBackup: vi.fn(),
      previewRestore: vi.fn(),
      restoreBackup: vi.fn(),
    },
  };
});

function renderPanel(onFeedback = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onFeedback,
    ...render(
      <QueryClientProvider client={client}>
        <BackupRestorePanel onFeedback={onFeedback} />
      </QueryClientProvider>,
    ),
  };
}

describe('BackupRestorePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'company-1',
        permissions: ['settings.read', 'settings.update', 'roles.manage'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    vi.mocked(backupService.getLocation).mockResolvedValue({
      backupDir: 'C:\\Users\\Studio\\AppData\\Local\\DharaPhotographyERP\\Backups',
      defaultBackupDir: 'C:\\Users\\Studio\\AppData\\Local\\DharaPhotographyERP\\Backups',
    });
    vi.mocked(backupService.listHistory).mockResolvedValue([
      {
        fileName: 'dhara_erp_20260101_010101.zip',
        path: 'C:\\Backups\\dhara_erp_20260101_010101.zip',
        sizeBytes: 2048,
        modifiedAt: '2026-01-01T01:01:01.000Z',
        status: 'available',
      },
    ]);
  });

  it('shows backup history without a delete action', async () => {
    renderPanel();
    expect(await screen.findByText('dhara_erp_20260101_010101.zip')).toBeInTheDocument();
    expect(
      screen.getByText(/Older backups are kept until you delete them yourself/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('hides restore controls from non-owners', async () => {
    useAuthStore.setState({
      user: {
        id: 'admin-1',
        fullName: 'Admin',
        email: 'admin@example.com',
        companyId: 'company-1',
        permissions: ['settings.read', 'settings.update'],
      },
      accessToken: 'token',
      refreshToken: 'refresh',
      isAuthenticated: true,
    });
    renderPanel();
    expect(await screen.findByText('dhara_erp_20260101_010101.zip')).toBeInTheDocument();
    expect(screen.getByText('Only the studio owner can restore a backup.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Backup ZIP path')).not.toBeInTheDocument();
  });

  it('requires REPLACE before restore is enabled', async () => {
    vi.mocked(backupService.previewRestore).mockResolvedValue({
      success: true,
      createdAt: '2026-01-01T01:01:01.000Z',
      applicationName: 'Dhara Photography ERP Pro',
      backupFormatVersion: '1.0',
      databaseName: 'dhara_erp',
      uploadFileCount: 2,
      sizeBytes: 4096,
      integrity: 'passed',
    });

    renderPanel();
    fireEvent.change(await screen.findByPlaceholderText('Backup ZIP path'), {
      target: { value: 'E:\\pendrive\\dhara_erp.zip' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check Backup' }));

    expect(
      await screen.findByText(
        'This will replace the current Dhara Photography ERP data and photos with this backup.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Replace ERP data' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Type REPLACE to confirm'), {
      target: { value: 'REPLACE' },
    });
    expect(screen.getByRole('button', { name: 'Replace ERP data' })).toBeEnabled();
  });

  it('invokes backup then downloads the created ZIP', async () => {
    vi.mocked(backupService.createBackup).mockResolvedValue({
      success: true,
      backupFile: 'C:\\Backups\\dhara_erp_20260101_010101.zip',
      sizeBytes: 2048,
    });
    vi.mocked(backupService.downloadBackup).mockResolvedValue(undefined);

    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Backup Now' }));

    await waitFor(() => expect(backupService.createBackup).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(backupService.downloadBackup).toHaveBeenCalledWith(
        'C:\\Backups\\dhara_erp_20260101_010101.zip',
      ),
    );
  });

  it('reports success when the ZIP is saved even if browser download fails', async () => {
    vi.mocked(backupService.createBackup).mockResolvedValue({
      success: true,
      backupFile:
        'C:\\Users\\SANJAYSINH\\AppData\\Local\\DharaPhotographyERP\\Backups\\dhara_erp_20260824_194443.zip',
      sizeBytes: 293625904,
    });
    vi.mocked(backupService.downloadBackup).mockRejectedValue(
      new Error('An unexpected error occurred.'),
    );
    const { onFeedback } = renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Backup Now' }));

    await waitFor(() =>
      expect(onFeedback).toHaveBeenCalledWith({
        type: 'success',
        message: expect.stringContaining('dhara_erp_20260824_194443.zip'),
      }),
    );
  });

  it('shows a visible error when backup fails and does not download', async () => {
    vi.mocked(backupService.createBackup).mockRejectedValue(new Error('Backup script failed.'));
    const { onFeedback } = renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'Backup Now' }));

    await waitFor(() =>
      expect(onFeedback).toHaveBeenCalledWith({
        type: 'error',
        message: 'Backup script failed.',
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Backup script failed.');
    expect(backupService.downloadBackup).not.toHaveBeenCalled();
  });

  it('opens the file picker when Browse PC / Pendrive is clicked', async () => {
    renderPanel();
    const input = await screen.findByTestId('backup-restore-file-input');
    const clickSpy = vi.spyOn(input, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Browse PC / Pendrive' }));

    expect(clickSpy).toHaveBeenCalled();
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  it('uploads a selected ZIP and enters preview without restoring', async () => {
    vi.mocked(backupService.uploadBackup).mockResolvedValue({
      path: 'C:\\Backups\\uploaded_studio.zip',
      fileName: 'uploaded_studio.zip',
    });
    vi.mocked(backupService.previewRestore).mockResolvedValue({
      success: true,
      createdAt: '2026-01-01T01:01:01.000Z',
      applicationName: 'Dhara Photography ERP Pro',
      backupFormatVersion: '1.0',
      databaseName: 'dhara_erp',
      uploadFileCount: 2,
      sizeBytes: 4096,
      integrity: 'passed',
    });

    renderPanel();
    const input = await screen.findByTestId('backup-restore-file-input');
    const file = new File(['zip-bytes'], 'studio.zip', { type: 'application/zip' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(backupService.uploadBackup).toHaveBeenCalledTimes(1));
    expect(vi.mocked(backupService.uploadBackup).mock.calls[0][0]).toBe(file);
    await waitFor(() => expect(backupService.previewRestore).toHaveBeenCalled());
    expect(vi.mocked(backupService.previewRestore).mock.calls[0][0]).toBe(
      'C:\\Backups\\uploaded_studio.zip',
    );
    expect(
      await screen.findByText(
        'This will replace the current Dhara Photography ERP data and photos with this backup.',
      ),
    ).toBeInTheDocument();
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  it('does not restore when the file picker is cancelled', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Browse PC / Pendrive' }));
    const input = screen.getByTestId('backup-restore-file-input');
    fireEvent.change(input, { target: { files: [] } });

    expect(backupService.uploadBackup).not.toHaveBeenCalled();
    expect(backupService.restoreBackup).not.toHaveBeenCalled();
  });

  it('requires confirmation before calling the restore API', async () => {
    vi.mocked(backupService.previewRestore).mockResolvedValue({
      success: true,
      createdAt: '2026-01-01T01:01:01.000Z',
      applicationName: 'Dhara Photography ERP Pro',
      backupFormatVersion: '1.0',
      databaseName: 'dhara_erp',
      uploadFileCount: 2,
      sizeBytes: 4096,
      integrity: 'passed',
    });
    vi.mocked(backupService.restoreBackup).mockResolvedValue({ success: true });

    renderPanel();
    fireEvent.change(await screen.findByPlaceholderText('Backup ZIP path'), {
      target: { value: 'C:\\Backups\\dhara_erp.zip' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check Backup' }));
    await screen.findByRole('button', { name: 'Replace ERP data' });

    fireEvent.click(screen.getByRole('button', { name: 'Replace ERP data' }));
    expect(backupService.restoreBackup).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Type REPLACE to confirm'), {
      target: { value: 'REPLACE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Replace ERP data' }));

    await waitFor(() =>
      expect(backupService.restoreBackup).toHaveBeenCalledWith(
        'C:\\Backups\\dhara_erp.zip',
        'REPLACE',
      ),
    );
  });
});
