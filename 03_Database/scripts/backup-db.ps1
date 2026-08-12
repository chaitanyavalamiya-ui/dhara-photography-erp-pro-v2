#Requires -Version 5.1
<#
.SYNOPSIS
  Create a timestamped local backup for Dhara Photography ERP (Windows).

.DESCRIPTION
  Backs up the PostgreSQL database and gallery uploads into a single ZIP file
  stored outside the git repository (default: %LOCALAPPDATA%\DharaPhotographyERP\Backups).

  The ZIP is easy to copy to a pendrive for monthly off-site backup.

  Requires: pg_dump (PostgreSQL client tools) on PATH.

  NEVER commit backup files or real credentials to version control.
#>
param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\.env"),
    [string]$BackupDir
)

$ErrorActionPreference = "Stop"

function Load-EnvValue {
    param(
        [string]$Path,
        [string]$Name,
        [string]$Default = $null
    )

    if ($Name -eq "DATABASE_URL" -and $env:DATABASE_URL) {
        return $env:DATABASE_URL
    }
    if ($Name -eq "BACKUP_DIR" -and $env:BACKUP_DIR) {
        return $env:BACKUP_DIR
    }
    if ($Name -eq "UPLOAD_DIR" -and $env:UPLOAD_DIR) {
        return $env:UPLOAD_DIR
    }

    if (-not (Test-Path $Path)) {
        if ($null -ne $Default) { return $Default }
        throw "Env file was not found: $Path"
    }

    foreach ($line in Get-Content $Path) {
        if ($line -match '^\s*#' -or [string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -match "^\s*$([regex]::Escape($Name))\s*=\s*(.+)\s*$") {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }

    if ($null -ne $Default) { return $Default }
    throw "$Name not found in $Path"
}

function Expand-EnvPath {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $Path
    }

    return [Environment]::ExpandEnvironmentVariables($Path)
}

function Assert-PostgresTool {
    param([string]$ToolName)

    $tool = Get-Command $ToolName -ErrorAction SilentlyContinue
    if (-not $tool) {
        throw "ERROR: '$ToolName' was not found on PATH. Install PostgreSQL client tools and ensure $ToolName is available."
    }
}

try {
    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
    $databaseUrl = Load-EnvValue -Path $EnvFile -Name "DATABASE_URL"
    $uploadDirSetting = Load-EnvValue -Path $EnvFile -Name "UPLOAD_DIR" -Default "uploads"
    $backupDirSetting = if ($BackupDir) { $BackupDir } else { Load-EnvValue -Path $EnvFile -Name "BACKUP_DIR" -Default (Join-Path $env:LOCALAPPDATA "DharaPhotographyERP\Backups") }

    $backupRoot = Expand-EnvPath -Path $backupDirSetting
    if (-not [System.IO.Path]::IsPathRooted($backupRoot)) {
        $backupRoot = Join-Path $repoRoot $backupRoot
    }
    $backupRoot = [System.IO.Path]::GetFullPath($backupRoot)

    if ($uploadDirSetting -match '^[A-Za-z]:\\' -or $uploadDirSetting.StartsWith("\\")) {
        $uploadsPath = Expand-EnvPath -Path $uploadDirSetting
    } else {
        $uploadsPath = Join-Path $repoRoot "05_Backend\backend\$uploadDirSetting"
    }
    $uploadsPath = [System.IO.Path]::GetFullPath($uploadsPath)

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupName = "dhara_erp_$timestamp"
    $stagingDir = Join-Path ([System.IO.Path]::GetTempPath()) "dhara_erp_backup_$timestamp"
    $stagingSql = Join-Path $stagingDir "database.sql"
    $stagingUploads = Join-Path $stagingDir "uploads"
    $backupZip = Join-Path $backupRoot "$backupName.zip"

    if ($backupRoot.StartsWith($repoRoot.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "ERROR: Backup folder must be outside the project directory. Current path: $backupRoot"
    }

    if (-not (Test-Path $backupRoot)) {
        New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    }

    New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

    Write-Host "Dhara Photography ERP - local backup"
    Write-Host "Repository: $repoRoot"
    Write-Host "Backup destination: $backupZip"
    Write-Host ""

    Assert-PostgresTool -ToolName "pg_dump"

    Write-Host "Dumping PostgreSQL database..."
    & pg_dump $databaseUrl --no-owner --no-acl --file="$stagingSql"
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    if (Test-Path $uploadsPath) {
        Write-Host "Including gallery uploads from: $uploadsPath"
        Copy-Item -Path $uploadsPath -Destination $stagingUploads -Recurse -Force
    } else {
        Write-Host "No uploads folder found at $uploadsPath - database-only backup."
        New-Item -ItemType Directory -Path $stagingUploads -Force | Out-Null
    }

    Write-Host "Creating ZIP archive..."
    if (Test-Path $backupZip) {
        Remove-Item -Path $backupZip -Force
    }
    Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $backupZip -CompressionLevel Optimal

    Remove-Item -Path $stagingDir -Recurse -Force

    $zipSizeMb = [math]::Round((Get-Item $backupZip).Length / 1MB, 2)
    Write-Host ""
    Write-Host "Backup completed successfully." -ForegroundColor Green
    Write-Host "File: $backupZip"
    Write-Host "Size: $zipSizeMb MB"
    Write-Host ""
    Write-Host "Copy this file to your pendrive for off-PC safekeeping."
}
catch {
    Write-Host ""
    Write-Host "ERROR: Backup failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
