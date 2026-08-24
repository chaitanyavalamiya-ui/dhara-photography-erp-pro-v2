#Requires -Version 5.1
<#
.SYNOPSIS
  Restore a local Dhara Photography ERP backup (Windows).

.DESCRIPTION
  Validates a backup ZIP (manifest + SHA-256) before touching current data.
  Takes a pg_dump safety snapshot of the current database, then replaces the
  database (drop/create) and swaps uploads via staging folders. If the new
  restore fails after the drop, the safety snapshot is loaded automatically.

  Requires: psql on PATH, a local PostgreSQL\bin install, or the Docker
  container dhara-erp-postgres.
#>
param(
    [string]$BackupFile,
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\.env"),
    [switch]$ValidateOnly,
    [switch]$JsonOutput,
    [string]$ConfirmPhrase,
    [switch]$SkipPrompt
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "backup-common.ps1")

$tempDir = $null
$uploadsSwap = $null
$databaseReplaced = $false
$databaseReplaceStarted = $false
$uploadsTarget = $null
$safetySnapshotPath = $null
$db = $null

try {
    $repoRoot = Get-DharaRepoRoot -ScriptsDir $PSScriptRoot

    if (-not $BackupFile) {
        if ($JsonOutput -or $SkipPrompt) {
            throw "BackupFile is required when running without the file picker."
        }
        $defaultDir = Resolve-DharaBackupRoot -EnvFile $EnvFile -RepoRoot $repoRoot -Override $null
        if (-not (Test-Path $defaultDir)) {
            $defaultDir = [Environment]::GetFolderPath("MyDocuments")
        }
        Add-Type -AssemblyName System.Windows.Forms | Out-Null
        $dialog = New-Object System.Windows.Forms.OpenFileDialog
        $dialog.Filter = "Dhara ERP backup (*.zip)|*.zip|All files (*.*)|*.*"
        $dialog.Title = "Select Dhara ERP backup (PC or pendrive)"
        $dialog.InitialDirectory = $defaultDir
        $dialog.Multiselect = $false
        if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
            Write-Host "Restore cancelled - no backup file selected." -ForegroundColor Yellow
            exit 1
        }
        $BackupFile = $dialog.FileName
    }

    if (-not (Test-Path $BackupFile)) {
        throw "Backup file not found: $BackupFile"
    }
    if ([System.IO.Path]::GetExtension($BackupFile).ToLowerInvariant() -ne ".zip") {
        throw "Unsupported backup file type. A Dhara ERP .zip backup is required."
    }

    $databaseUrl = Read-DharaEnvValue -Path $EnvFile -Name "DATABASE_URL"
    $db = ConvertFrom-DatabaseUrl -DatabaseUrl $databaseUrl
    $uploadsTarget = Resolve-DharaUploadsPath -EnvFile $EnvFile -RepoRoot $repoRoot
    $initSchemas = Join-Path $PSScriptRoot "init-schemas.sql"

    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "dhara_erp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Expand-Zip64Archive -ZipPath $BackupFile -Destination $tempDir

    $validated = Test-DharaBackupPayload -StagingDir $tempDir
    $manifest = $validated.Manifest
    $backupSize = (Get-Item $BackupFile).Length

    $preview = @{
        success = $true
        valid = $true
        backupFile = $BackupFile
        createdAt = [string]$manifest.createdAt
        applicationName = [string]$manifest.applicationName
        backupFormatVersion = [string]$manifest.backupFormatVersion
        databaseName = [string]$manifest.databaseName
        uploadFileCount = [int]$validated.UploadFileCount
        sizeBytes = $backupSize
        integrity = "passed"
        warning = "This will replace the current Dhara Photography ERP data and photos with this backup."
        confirmPhrase = $script:DharaRestoreConfirmPhrase
    }

    if ($ValidateOnly) {
        if ($JsonOutput) { Write-DharaJson $preview }
        else {
            Write-Host "Backup is valid."
            Write-Host "Created : $($preview.createdAt)"
            Write-Host "Database: $($preview.databaseName)"
            Write-Host "Files   : $($preview.uploadFileCount)"
            Write-Host "Size    : $([math]::Round($backupSize / 1MB, 2)) MB"
        }
        exit 0
    }

    if (-not $JsonOutput) {
        Write-Host ""
        Write-Host "Backup date        : $($preview.createdAt)"
        Write-Host "Application        : $($preview.applicationName) (format $($preview.backupFormatVersion))"
        Write-Host "Database in backup : $($preview.databaseName)"
        Write-Host "Upload files       : $($preview.uploadFileCount)"
        Write-Host "Backup size        : $([math]::Round($backupSize / 1MB, 2)) MB"
        Write-Host "Integrity          : passed"
        Write-Host ""
        Write-Host "This will replace the current Dhara Photography ERP data and photos with this backup." -ForegroundColor Yellow
        Write-Host "Target database    : $($db.Database)"
        Write-Host ""
    }

    if (-not $SkipPrompt) {
        Write-Host "Type $($db.Database) to continue:"
        $dbConfirm = Read-Host "Database name"
        if ($dbConfirm -ne $db.Database) {
            throw "Restore cancelled - database name confirmation did not match."
        }
        Write-Host "Type $($script:DharaRestoreConfirmPhrase) to confirm replacement:"
        $phraseConfirm = Read-Host "Confirmation"
        if ($phraseConfirm -ne $script:DharaRestoreConfirmPhrase) {
            throw "Restore cancelled - confirmation phrase did not match."
        }
    } elseif ($ConfirmPhrase -ne $script:DharaRestoreConfirmPhrase) {
        throw "Restore cancelled - confirmation phrase did not match."
    }

    if (-not $JsonOutput) { Write-Host "Creating a pre-restore safety snapshot of the current database..." }
    $safetySnapshotPath = New-DharaDatabaseSafetySnapshot -Db $db
    if (-not $JsonOutput -and $safetySnapshotPath) {
        Write-Host "Safety snapshot created."
    }

    if (-not $JsonOutput) { Write-Host "Replacing database..." }
    $databaseReplaceStarted = $true
    Reset-DharaDatabase -Db $db -InitSchemasFile $initSchemas
    $databaseReplaced = $true
    Invoke-PsqlFileSafe -Db $db -DatabaseName $db.Database -SqlFile $validated.DatabaseSql

    if (-not $JsonOutput) { Write-Host "Restoring gallery uploads..." }
    $uploadsSwap = Switch-DharaUploads -BackupUploads $validated.UploadsDir -UploadsTarget $uploadsTarget

    Test-DharaRestoredDatabase -Db $db
    $restoredUploadCount = @(Get-UploadFileList -UploadsPath $uploadsTarget).Count
    if ($restoredUploadCount -ne [int]$validated.UploadFileCount) {
        throw "Restored upload file count ($restoredUploadCount) does not match backup ($($validated.UploadFileCount))."
    }

    Complete-DharaUploadsSwap -PreviousPath $uploadsSwap.PreviousPath
    Remove-DharaSafetySnapshot -SnapshotPath $safetySnapshotPath

    $successMessage = "Restore succeeded. ERP data and photos were replaced from the selected backup."
    $result = @{
        success = $true
        outcome = "restore_succeeded"
        message = $successMessage
        backupFile = $BackupFile
        databaseName = $db.Database
        uploadFileCount = $restoredUploadCount
        verified = $true
        originalDatabaseRecovered = $false
    }

    if ($JsonOutput) {
        Write-DharaJson $result
    } else {
        Write-Host ""
        Write-Host $successMessage -ForegroundColor Green
    }
}
catch {
    $restoreError = $_.Exception.Message
    if ($uploadsSwap -and $uploadsSwap.PreviousPath) {
        try {
            Undo-DharaUploadsSwap -UploadsTarget $uploadsTarget -PreviousPath $uploadsSwap.PreviousPath
        } catch {
            $restoreError = "$restoreError Uploads rollback also failed: $($_.Exception.Message)"
        }
    }

    $outcome = "restore_failed_database_unchanged"
    $recovered = $false
    $message = "Restore failed. The current database was not changed. $restoreError"

    if (($databaseReplaced -or $databaseReplaceStarted) -and $db) {
        $outcome = "restore_failed_manual_recovery_required"
        $message = "Restore failed and automatic recovery of the original database did not succeed. Manual recovery is required."
        if ($safetySnapshotPath) {
            $message = "$message Safety snapshot file: $safetySnapshotPath."
        } else {
            $message = "$message No safety snapshot was available."
        }
        $message = "$message Reason: $restoreError"

        if ($safetySnapshotPath -and (Test-Path $safetySnapshotPath)) {
            try {
                if (-not $JsonOutput) { Write-Host "Restore failed. Recovering the original database from the safety snapshot..." -ForegroundColor Yellow }
                Restore-DharaDatabaseFromSqlDump -Db $db -SqlFile $safetySnapshotPath
                $recovered = $true
                $outcome = "restore_failed_original_recovered"
                $message = "Restore failed, but the original database was recovered from a pre-restore safety snapshot. Reason: $restoreError"
            } catch {
                $outcome = "restore_failed_manual_recovery_required"
                $message = "Restore failed and automatic recovery of the original database did not succeed. Manual recovery is required. Safety snapshot file: $safetySnapshotPath. Reason: $restoreError Recovery error: $($_.Exception.Message)"
            }
        }
    }

    $failure = @{
        success = $false
        outcome = $outcome
        message = $message
        originalDatabaseRecovered = $recovered
        databaseReplaced = [bool]($databaseReplaced -or $databaseReplaceStarted)
        safetySnapshotPath = $safetySnapshotPath
        verified = $false
    }

    if ($JsonOutput) {
        Write-DharaJson $failure
        exit 1
    }
    Write-Host ""
    Write-Host $message -ForegroundColor Red
    exit 1
}
finally {
    if ($tempDir -and (Test-Path $tempDir)) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
