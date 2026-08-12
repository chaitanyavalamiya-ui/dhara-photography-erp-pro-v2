#Requires -Version 5.1
<#
.SYNOPSIS
  Restore a local Dhara Photography ERP backup (Windows).

.DESCRIPTION
  Restores a backup created by backup-db.ps1 (.zip) or a legacy .sql dump.
  Select a file from this PC or a pendrive when -BackupFile is omitted.

  Requires explicit confirmation — will NOT silently overwrite database or uploads.

  Requires: psql (PostgreSQL client tools) on PATH.

  NEVER commit backup files or real credentials to version control.
#>
param(
    [string]$BackupFile,
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\.env")
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

function Select-BackupFile {
    $defaultDir = Join-Path $env:LOCALAPPDATA "DharaPhotographyERP\Backups"
    if (-not (Test-Path $defaultDir)) {
        $defaultDir = [Environment]::GetFolderPath("MyDocuments")
    }

    Add-Type -AssemblyName System.Windows.Forms | Out-Null
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Filter = "Dhara ERP backup (*.zip)|*.zip|SQL database (*.sql)|*.sql|All files (*.*)|*.*"
    $dialog.Title = "Select Dhara ERP backup (PC or pendrive)"
    $dialog.InitialDirectory = $defaultDir
    $dialog.Multiselect = $false

    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
        return $null
    }

    return $dialog.FileName
}

function Resolve-RestorePaths {
    param([string]$SourceFile)

    $extension = [System.IO.Path]::GetExtension($SourceFile).ToLowerInvariant()

    if ($extension -eq ".sql") {
        return @{
            SqlFile = $SourceFile
            UploadsDir = $null
            TempDir = $null
        }
    }

    if ($extension -ne ".zip") {
        throw "Unsupported backup file type: $extension (expected .zip or .sql)"
    }

    $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) "dhara_erp_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Expand-Archive -Path $SourceFile -DestinationPath $tempDir -Force

    $sqlFile = Join-Path $tempDir "database.sql"
    if (-not (Test-Path $sqlFile)) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        throw "Backup ZIP does not contain database.sql"
    }

    $uploadsDir = Join-Path $tempDir "uploads"
    if (-not (Test-Path $uploadsDir)) {
        $uploadsDir = $null
    }

    return @{
        SqlFile = $sqlFile
        UploadsDir = $uploadsDir
        TempDir = $tempDir
    }
}

function Assert-PostgresTool {
    param([string]$ToolName)

    $tool = Get-Command $ToolName -ErrorAction SilentlyContinue
    if (-not $tool) {
        throw "ERROR: '$ToolName' was not found on PATH. Install PostgreSQL client tools and ensure $ToolName is available."
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$tempDir = $null

try {
    if (-not $BackupFile) {
        $BackupFile = Select-BackupFile
        if (-not $BackupFile) {
            Write-Host "Restore cancelled - no backup file selected." -ForegroundColor Yellow
            exit 1
        }
    }

    if (-not (Test-Path $BackupFile)) {
        throw "Backup file not found: $BackupFile"
    }

    $databaseUrl = Load-EnvValue -Path $EnvFile -Name "DATABASE_URL"
    $uploadDirSetting = Load-EnvValue -Path $EnvFile -Name "UPLOAD_DIR" -Default "uploads"

    if ($uploadDirSetting -match '^[A-Za-z]:\\' -or $uploadDirSetting.StartsWith("\\")) {
        $uploadsTarget = Expand-EnvPath -Path $uploadDirSetting
    } else {
        $uploadsTarget = Join-Path $repoRoot "05_Backend\backend\$uploadDirSetting"
    }
    $uploadsTarget = [System.IO.Path]::GetFullPath($uploadsTarget)

    $dbName = "UNKNOWN"
    if ($databaseUrl -match '/([^/?]+)(\?|$)') {
        $dbName = $Matches[1]
    }

    $restorePaths = Resolve-RestorePaths -SourceFile $BackupFile
    $tempDir = $restorePaths.TempDir

    Write-Host ""
    Write-Host "WARNING: This will overwrite local ERP data."
    Write-Host "  Database : $dbName"
    Write-Host "  Backup   : $BackupFile"
    if ($restorePaths.UploadsDir) {
        Write-Host "  Uploads  : $uploadsTarget"
    } else {
        Write-Host "  Uploads  : (not included in this backup - database only)"
    }
    Write-Host ""
    Write-Host "Type the database name exactly to confirm restore: $dbName"
    $confirmation = Read-Host "Confirmation"

    if ($confirmation -ne $dbName) {
        Write-Host "Restore cancelled - confirmation did not match." -ForegroundColor Yellow
        exit 1
    }

    Assert-PostgresTool -ToolName "psql"

    Write-Host "Restoring database..."
    & psql $databaseUrl --file="$($restorePaths.SqlFile)" --single-transaction --set ON_ERROR_STOP=on
    if ($LASTEXITCODE -ne 0) {
        throw "psql restore failed with exit code $LASTEXITCODE"
    }

    if ($restorePaths.UploadsDir) {
        Write-Host "Restoring gallery uploads to: $uploadsTarget"
        if (Test-Path $uploadsTarget) {
            Remove-Item -Path $uploadsTarget -Recurse -Force
        }
        $parentDir = Split-Path $uploadsTarget -Parent
        if (-not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }
        Copy-Item -Path $restorePaths.UploadsDir -Destination $uploadsTarget -Recurse -Force
    }

    Write-Host ""
    Write-Host "Restore completed successfully." -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "ERROR: Restore failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
finally {
    if ($tempDir -and (Test-Path $tempDir)) {
        Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
