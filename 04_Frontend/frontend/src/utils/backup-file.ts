export function backupFileNameFromPath(backupFile: string): string {
  const trimmed = backupFile.trim();
  const parts = trimmed.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || 'dhara-erp-backup.zip';
}

export function triggerBackupFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
