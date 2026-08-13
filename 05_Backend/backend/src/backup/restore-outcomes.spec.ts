import {
  isSuccessfulRestore,
  restoreFailureUserMessage,
  RESTORE_OUTCOMES,
} from './restore-outcomes';

describe('restore outcomes', () => {
  it('does not treat a recovered original database as success', () => {
    expect(
      isSuccessfulRestore({
        success: false,
        outcome: RESTORE_OUTCOMES.originalRecovered,
        verified: false,
      }),
    ).toBe(false);
    expect(
      isSuccessfulRestore({
        success: true,
        outcome: RESTORE_OUTCOMES.originalRecovered,
        verified: true,
      }),
    ).toBe(false);
  });

  it('requires success, verification, and restore_succeeded', () => {
    expect(
      isSuccessfulRestore({
        success: true,
        outcome: RESTORE_OUTCOMES.succeeded,
        verified: true,
      }),
    ).toBe(true);
    expect(
      isSuccessfulRestore({
        success: true,
        verified: true,
      }),
    ).toBe(false);
  });

  it('reports recovered vs manual recovery clearly', () => {
    expect(
      restoreFailureUserMessage({ outcome: RESTORE_OUTCOMES.originalRecovered }),
    ).toContain('original database was recovered');
    expect(
      restoreFailureUserMessage({
        outcome: RESTORE_OUTCOMES.manualRecoveryRequired,
        safetySnapshotPath: 'C:\\DharaPhotographyERP\\RestoreSafety\\pre-restore.sql',
      }),
    ).toMatch(/Manual recovery is required/);
    expect(
      restoreFailureUserMessage({ outcome: RESTORE_OUTCOMES.databaseUnchanged }),
    ).toContain('was not changed');
  });
});
