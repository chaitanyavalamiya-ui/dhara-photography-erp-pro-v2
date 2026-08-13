export const RESTORE_OUTCOMES = {
  succeeded: 'restore_succeeded',
  originalRecovered: 'restore_failed_original_recovered',
  manualRecoveryRequired: 'restore_failed_manual_recovery_required',
  databaseUnchanged: 'restore_failed_database_unchanged',
} as const;

export type RestoreOutcome = (typeof RESTORE_OUTCOMES)[keyof typeof RESTORE_OUTCOMES];

export function isSuccessfulRestore(result: {
  success?: boolean;
  outcome?: string;
  verified?: boolean;
}): boolean {
  return result.success === true && result.verified === true && result.outcome === RESTORE_OUTCOMES.succeeded;
}

export function restoreFailureUserMessage(result: {
  outcome?: string;
  message?: string;
  safetySnapshotPath?: string;
}): string {
  if (result.message) {
    return result.message;
  }
  if (result.outcome === RESTORE_OUTCOMES.originalRecovered) {
    return 'Restore failed, but the original database was recovered from a pre-restore safety snapshot.';
  }
  if (result.outcome === RESTORE_OUTCOMES.manualRecoveryRequired) {
    const snapshot = result.safetySnapshotPath
      ? ` Safety snapshot file: ${result.safetySnapshotPath}.`
      : '';
    return `Restore failed and automatic recovery of the original database did not succeed. Manual recovery is required.${snapshot}`;
  }
  return 'Restore failed. The current database was not changed.';
}
