#Requires -Version 5.1
<#
.SYNOPSIS
  Create a timestamped local backup for Dhara Photography ERP (Windows).

.DESCRIPTION
  Backs up PostgreSQL and gallery uploads into a Zip64 ZIP with manifest.json
  and SHA-256 checksums. Stored outside the git repository by default:
  %LOCALAPPDATA%\DharaPhotographyERP\Backups

  Requires: pg_dump on PATH, a local PostgreSQL\bin install, or the Docker
  container dhara-erp-postgres.
  Never writes .env, JWT secrets, or passwords into the backup.
#>
param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\.env"),
    [string]$BackupDir,
    [switch]$JsonOutput
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "backup-common.ps1")

$stagingDir = $null

try {
    $repoRoot = Get-DharaRepoRoot -ScriptsDir $PSScriptRoot
    $databaseUrl = Read-DharaEnvValue -Path $EnvFile -Name "DATABASE_URL"
    $db = ConvertFrom-DatabaseUrl -DatabaseUrl $databaseUrl
    $uploadsPath = Resolve-DharaUploadsPath -EnvFile $EnvFile -RepoRoot $repoRoot
    $backupRoot = Resolve-DharaBackupRoot -EnvFile $EnvFile -RepoRoot $repoRoot -Override $BackupDir

    if (-not (Test-Path $backupRoot)) {
        New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "dhara_erp_$timestamp"
    $stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) "dhara_erp_backup_$timestamp"
    $stagingSql = Join-Path $stagingDir "database.sql"
    $stagingUploads = Join-Path $stagingDir "uploads"
    $backupZip = Join-Path $backupRoot "$backupName.zip"

    New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

    if (-not $JsonOutput) {
        Write-Host "Dhara Photography ERP - local backup"
        Write-Host "Backup destination: $backupZip"
        Write-Host ""
        Write-Host "Dumping PostgreSQL database..."
    }

    Invoke-PgDumpSafe -Db $db -OutputFile $stagingSql

    if (Test-Path $uploadsPath) {
        if (-not $JsonOutput) { Write-Host "Including gallery uploads from: $uploadsPath" }
        Copy-Item -Path $uploadsPath -Destination $stagingUploads -Recurse -Force
    } else {
        if (-not $JsonOutput) { Write-Host "No uploads folder found - creating empty uploads directory." }
        New-Item -ItemType Directory -Path $stagingUploads -Force | Out-Null
    }

    $uploadFileCount = @(Get-UploadFileList -UploadsPath $stagingUploads).Count
    $checksumsFile = Join-Path $stagingDir "checksums.sha256"
    Write-DharaChecksums -StagingDir $stagingDir -ChecksumsFile $checksumsFile
    New-DharaManifest -StagingDir $stagingDir -DatabaseName $db.Database -UploadFileCount $uploadFileCount -ChecksumsFile $checksumsFile | Out-Null

    if (-not $JsonOutput) { Write-Host "Creating Zip64 archive..." }
    New-Zip64Archive -SourceDir $stagingDir -ZipPath $backupZip

    $zipSize = (Get-Item $backupZip).Length
    $result = @{
        success = $true
        backupFile = $backupZip
        sizeBytes = $zipSize
        createdAt = [DateTime]::UtcNow.ToString("o")
        uploadFileCount = $uploadFileCount
        databaseName = $db.Database
        backupFormatVersion = $script:DharaBackupFormatVersion
        integrity = "SHA-256"
    }

    if ($JsonOutput) {
        Write-DharaJson $result
    } else {
        Write-Host ""
        Write-Host "Backup completed successfully." -ForegroundColor Green
        Write-Host "File: $backupZip"
        Write-Host "Size: $([math]::Round($zipSize / 1MB, 2)) MB"
        Write-Host "Photos/files: $uploadFileCount"
        Write-Host ""
        Write-Host "Copy this file to your pendrive for off-PC safekeeping."
    }
}
catch {
    if ($JsonOutput) {
        Write-DharaJson @{ success = $false; message = $_.Exception.Message }
        exit 1
    }
    Write-Host ""
    Write-Host "ERROR: Backup failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    if ($stagingDir -and (Test-Path $stagingDir)) {
        Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
