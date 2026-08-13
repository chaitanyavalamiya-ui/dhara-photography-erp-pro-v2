import { fireEvent, render, screen } from '@testing-library/react';
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
      browseBackup: vi.fn(),
      previewRestore: vi.fn(),
      restoreBackup: vi.fn(),
    },
  };
});

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BackupRestorePanel onFeedback={vi.fn()} />
    </QueryClientProvider>,
  );
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
        permissions: ['settings.read', 'settings.update'],
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
});
