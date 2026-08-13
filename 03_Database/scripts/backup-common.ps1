#Requires -Version 5.1
# Shared local backup/restore helpers for Dhara Photography ERP (Windows, offline).
# Dot-source from backup-db.ps1 and restore-db.ps1. Never log secrets.

$script:DharaBackupFormatVersion = "1.0"
$script:DharaApplicationName = "Dhara Photography ERP Pro"
$script:DharaRestoreConfirmPhrase = "REPLACE"

function Get-DharaRepoRoot {
    param([string]$ScriptsDir)
    return (Resolve-Path (Join-Path $ScriptsDir "..\..")).Path
}

function Get-DharaDataRoot {
    $fromEnv = [Environment]::GetEnvironmentVariable("DHARA_DATA_ROOT")
    if (-not [string]::IsNullOrWhiteSpace($fromEnv)) {
        return [Environment]::ExpandEnvironmentVariables($fromEnv)
    }
    return Join-Path $env:LOCALAPPDATA "DharaPhotographyERP"
}

function Expand-DharaEnvPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $Path }
    return [Environment]::ExpandEnvironmentVariables($Path)
}

function Read-DharaEnvValue {
    param(
        [string]$Path,
        [string]$Name,
        [string]$Default = $null
    )

    $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if ($processValue) { return $processValue }

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

function Get-DharaPathsConfigFile {
    return Join-Path (Get-DharaDataRoot) "Config\paths.json"
}

function Read-DharaPathsConfig {
    $configFile = Get-DharaPathsConfigFile
    if (-not (Test-Path $configFile)) {
        return $null
    }
    try {
        return Get-Content $configFile -Raw | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Save-DharaPathsConfig {
    param([string]$BackupDir)

    $configDir = Split-Path (Get-DharaPathsConfigFile) -Parent
    if (-not (Test-Path $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }
    $payload = @{ backupDir = $BackupDir } | ConvertTo-Json
    Set-Content -Path (Get-DharaPathsConfigFile) -Value $payload -Encoding UTF8
}

function Assert-BackupDirOutsideRepo {
    param(
        [string]$BackupRoot,
        [string]$RepoRoot
    )

    $fullBackup = [System.IO.Path]::GetFullPath($BackupRoot)
    $fullRepo = [System.IO.Path]::GetFullPath($RepoRoot)
    if ($fullBackup.StartsWith($fullRepo, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "ERROR: Backup folder must be outside the application/repository directory. Current path: $fullBackup"
    }
}

function Resolve-DharaBackupRoot {
    param(
        [string]$EnvFile,
        [string]$RepoRoot,
        [string]$Override
    )

    $configured = $Override
    if (-not $configured) {
        $configured = [Environment]::GetEnvironmentVariable("BACKUP_DIR")
    }
    if (-not $configured) {
        $paths = Read-DharaPathsConfig
        if ($paths -and $paths.backupDir) { $configured = [string]$paths.backupDir }
    }
    if (-not $configured) {
        $configured = Read-DharaEnvValue -Path $EnvFile -Name "BACKUP_DIR" -Default (Join-Path (Get-DharaDataRoot) "Backups")
    }

    $backupRoot = Expand-DharaEnvPath -Path $configured
    if (-not [System.IO.Path]::IsPathRooted($backupRoot)) {
        $backupRoot = Join-Path $RepoRoot $backupRoot
    }
    $backupRoot = [System.IO.Path]::GetFullPath($backupRoot)
    Assert-BackupDirOutsideRepo -BackupRoot $backupRoot -RepoRoot $RepoRoot
    return $backupRoot
}

function Resolve-DharaUploadsPath {
    param(
        [string]$EnvFile,
        [string]$RepoRoot
    )

    $uploadDirSetting = Read-DharaEnvValue -Path $EnvFile -Name "UPLOAD_DIR" -Default "uploads"
    if ($uploadDirSetting -match '^[A-Za-z]:\\' -or $uploadDirSetting.StartsWith("\\")) {
        return [System.IO.Path]::GetFullPath((Expand-DharaEnvPath -Path $uploadDirSetting))
    }

    $dataRootUploads = Join-Path (Get-DharaDataRoot) "Uploads"
    $nodeEnv = Read-DharaEnvValue -Path $EnvFile -Name "NODE_ENV" -Default "development"
    if ($nodeEnv -eq "production") {
        return [System.IO.Path]::GetFullPath($dataRootUploads)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $RepoRoot "05_Backend\backend\$uploadDirSetting"))
}

function ConvertFrom-DatabaseUrl {
    param([string]$DatabaseUrl)

    if ($DatabaseUrl -notmatch '^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):(\d+)/([^/?]+)') {
        throw "DATABASE_URL is not a supported PostgreSQL URL."
    }

    return @{
        User = [Uri]::UnescapeDataString($Matches[2])
        Password = [Uri]::UnescapeDataString($Matches[3])
        Host = $Matches[4]
        Port = $Matches[5]
        Database = ($Matches[6] -split '\?')[0]
    }
}

function Assert-PostgresTool {
    param([string]$ToolName)
    $tool = Get-Command $ToolName -ErrorAction SilentlyContinue
    if (-not $tool) {
        throw "ERROR: '$ToolName' was not found on PATH. Install PostgreSQL client tools and ensure $ToolName is available."
    }
}

function Invoke-PgDumpSafe {
    param(
        [hashtable]$Db,
        [string]$OutputFile
    )

    Assert-PostgresTool -ToolName "pg_dump"
    $previous = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $Db.Password
        & pg_dump -h $Db.Host -p $Db.Port -U $Db.User -d $Db.Database --no-owner --no-acl --file="$OutputFile"
        if ($LASTEXITCODE -ne 0) {
            throw "pg_dump failed with exit code $LASTEXITCODE"
        }
    } finally {
        if ($null -eq $previous) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        else { $env:PGPASSWORD = $previous }
    }
}

function Invoke-PsqlFileSafe {
    param(
        [hashtable]$Db,
        [string]$DatabaseName,
        [string]$SqlFile
    )

    Assert-PostgresTool -ToolName "psql"
    $previous = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $Db.Password
        & psql -h $Db.Host -p $Db.Port -U $Db.User -d $DatabaseName --file="$SqlFile" --single-transaction --set ON_ERROR_STOP=on
        if ($LASTEXITCODE -ne 0) {
            throw "psql restore failed with exit code $LASTEXITCODE"
        }
    } finally {
        if ($null -eq $previous) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        else { $env:PGPASSWORD = $previous }
    }
}

function Invoke-PsqlCommandSafe {
    param(
        [hashtable]$Db,
        [string]$DatabaseName,
        [string]$Command
    )

    Assert-PostgresTool -ToolName "psql"
    $previous = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = $Db.Password
        $output = & psql -h $Db.Host -p $Db.Port -U $Db.User -d $DatabaseName -v ON_ERROR_STOP=1 -t -A -c $Command
        if ($LASTEXITCODE -ne 0) {
            throw "psql command failed with exit code $LASTEXITCODE"
        }
        return $output
    } finally {
        if ($null -eq $previous) { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
        else { $env:PGPASSWORD = $previous }
    }
}

function Reset-DharaDatabase {
    param(
        [hashtable]$Db,
        [string]$InitSchemasFile
    )

    $dbName = $Db.Database
    if ($dbName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
        throw "Database name is not a safe identifier."
    }
    Invoke-PsqlCommandSafe -Db $Db -DatabaseName "postgres" -Command "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbName' AND pid <> pg_backend_pid();" | Out-Null
    Invoke-PsqlCommandSafe -Db $Db -DatabaseName "postgres" -Command "DROP DATABASE IF EXISTS $dbName WITH (FORCE);" | Out-Null
    Invoke-PsqlCommandSafe -Db $Db -DatabaseName "postgres" -Command "CREATE DATABASE $dbName;" | Out-Null

    if ($InitSchemasFile -and (Test-Path $InitSchemasFile)) {
        Invoke-PsqlFileSafe -Db $Db -DatabaseName $dbName -SqlFile $InitSchemasFile
    }
}

function Test-DharaDatabaseExists {
    param([hashtable]$Db)

    $dbName = $Db.Database
    if ($dbName -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
        throw "Database name is not a safe identifier."
    }
    $count = Invoke-PsqlCommandSafe -Db $Db -DatabaseName "postgres" -Command "SELECT COUNT(*) FROM pg_database WHERE datname = '$dbName';"
    return ([int]$count -gt 0)
}

function Get-DharaRestoreSafetyDir {
    $dir = Join-Path (Get-DharaDataRoot) "RestoreSafety"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    return $dir
}

function New-DharaDatabaseSafetySnapshot {
    param([hashtable]$Db)

    if (-not (Test-DharaDatabaseExists -Db $Db)) {
        return $null
    }

    $snapshotPath = Join-Path (Get-DharaRestoreSafetyDir) ("pre-restore_{0}_{1}.sql" -f $Db.Database, (Get-Date -Format "yyyyMMdd_HHmmss"))
    Invoke-PgDumpSafe -Db $Db -OutputFile $snapshotPath
    if (-not (Test-Path $snapshotPath) -or (Get-Item $snapshotPath).Length -lt 1) {
        throw "Pre-restore safety snapshot was not created."
    }
    return $snapshotPath
}

function Restore-DharaDatabaseFromSqlDump {
    param(
        [hashtable]$Db,
        [string]$SqlFile
    )

    if (-not $SqlFile -or -not (Test-Path $SqlFile)) {
        throw "Safety snapshot file is missing."
    }
    if ((Get-Item $SqlFile).Length -lt 1) {
        throw "Safety snapshot file is empty."
    }

    Reset-DharaDatabase -Db $Db -InitSchemasFile $null
    Invoke-PsqlFileSafe -Db $Db -DatabaseName $Db.Database -SqlFile $SqlFile
    if (-not (Test-DharaDatabaseExists -Db $Db)) {
        throw "Safety snapshot was applied, but the database is missing."
    }
}

function Remove-DharaSafetySnapshot {
    param([string]$SnapshotPath)
    if ($SnapshotPath -and (Test-Path $SnapshotPath)) {
        Remove-Item -Path $SnapshotPath -Force -ErrorAction SilentlyContinue
    }
}

function Get-Sha256Hex {
    param([string]$FilePath)
    return (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-UploadFileList {
    param([string]$UploadsPath)
    if (-not (Test-Path $UploadsPath)) { return @() }
    return @(Get-ChildItem -Path $UploadsPath -Recurse -File | Sort-Object FullName)
}

function Write-DharaChecksums {
    param(
        [string]$StagingDir,
        [string]$ChecksumsFile
    )

    $lines = New-Object System.Collections.Generic.List[string]
    $databaseSql = Join-Path $StagingDir "database.sql"
    $lines.Add("$(Get-Sha256Hex $databaseSql)  database.sql")

    $uploadsDir = Join-Path $StagingDir "uploads"
    foreach ($file in (Get-UploadFileList -UploadsPath $uploadsDir)) {
        $relative = $file.FullName.Substring($StagingDir.Length).TrimStart('\', '/').Replace('\', '/')
        $lines.Add("$(Get-Sha256Hex $file.FullName)  $relative")
    }

    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($ChecksumsFile, $lines, $utf8)
}

function Test-DharaChecksums {
    param(
        [string]$StagingDir,
        [string]$ChecksumsFile
    )

    if (-not (Test-Path $ChecksumsFile)) {
        throw "Backup is missing checksums.sha256"
    }

    foreach ($line in Get-Content $ChecksumsFile) {
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        if ($line -notmatch '^([a-fA-F0-9]{64})\s{2}(.+)$') {
            throw "Checksum file is invalid."
        }
        $expected = $Matches[1].ToLowerInvariant()
        $relative = $Matches[2].Trim().Replace('/', '\')
        $full = Join-Path $StagingDir $relative
        if (-not (Test-Path $full)) {
            throw "Backup file listed in checksums is missing: $relative"
        }
        $actual = Get-Sha256Hex $full
        if ($actual -ne $expected) {
            throw "Checksum mismatch for $relative"
        }
    }
}

function New-DharaManifest {
    param(
        [string]$StagingDir,
        [string]$DatabaseName,
        [int]$UploadFileCount,
        [string]$ChecksumsFile
    )

    $manifest = [ordered]@{
        applicationName = $script:DharaApplicationName
        backupFormatVersion = $script:DharaBackupFormatVersion
        createdAt = [DateTime]::UtcNow.ToString("o")
        databaseName = $DatabaseName
        schemas = @("master", "transaction", "audit", "system")
        uploadFileCount = $UploadFileCount
        checksumAlgorithm = "SHA-256"
        checksumsFile = "checksums.sha256"
        checksumsSha256 = (Get-Sha256Hex $ChecksumsFile)
    }

    $manifestPath = Join-Path $StagingDir "manifest.json"
    $json = $manifest | ConvertTo-Json -Depth 6
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($manifestPath, $json, $utf8)
    return $manifestPath
}

function Test-DharaBackupPayload {
    param([string]$StagingDir)

    $databaseSql = Join-Path $StagingDir "database.sql"
    $manifestPath = Join-Path $StagingDir "manifest.json"
    $checksumsFile = Join-Path $StagingDir "checksums.sha256"
    $uploadsDir = Join-Path $StagingDir "uploads"

    if (-not (Test-Path $databaseSql)) { throw "Backup is missing database.sql" }
    if (-not (Test-Path $manifestPath)) { throw "Backup is missing manifest.json" }
    if (-not (Test-Path $checksumsFile)) { throw "Backup is missing checksums.sha256" }
    if (-not (Test-Path $uploadsDir)) { throw "Backup is missing uploads/ folder" }

    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    if ($manifest.applicationName -ne $script:DharaApplicationName) {
        throw "Backup manifest application name is invalid."
    }
    if (-not $manifest.backupFormatVersion) {
        throw "Backup manifest is missing backupFormatVersion."
    }
    if (-not $manifest.databaseName) {
        throw "Backup manifest is missing database name."
    }

    $actualChecksumsHash = Get-Sha256Hex $checksumsFile
    if ($manifest.checksumsSha256.ToLowerInvariant() -ne $actualChecksumsHash) {
        throw "checksums.sha256 integrity check failed."
    }

    Test-DharaChecksums -StagingDir $StagingDir -ChecksumsFile $checksumsFile

    $actualUploadCount = @(Get-UploadFileList -UploadsPath $uploadsDir).Count
    if ([int]$manifest.uploadFileCount -ne $actualUploadCount) {
        throw "Upload file count does not match the manifest."
    }

    return @{
        Manifest = $manifest
        UploadFileCount = $actualUploadCount
        DatabaseSql = $databaseSql
        UploadsDir = $uploadsDir
    }
}

# Zip64: .NET Framework 4.5+ ZipFile writes ZIP64 extra fields automatically when an
# archive exceeds 4 GB or 65,535 entries. That is the large-gallery path (not the
# built-in archive cmdlet, which is limited around 2 GB).
function New-Zip64Archive {
    param(
        [string]$SourceDir,
        [string]$ZipPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $SourceDir,
        $ZipPath,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false
    )
}

function Expand-Zip64Archive {
    param(
        [string]$ZipPath,
        [string]$Destination
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
    [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $Destination)
}

function Switch-DharaUploads {
    param(
        [string]$BackupUploads,
        [string]$UploadsTarget
    )

    $incoming = "$UploadsTarget.incoming"
    $previous = "$UploadsTarget.previous"

    try {
        if (Test-Path $incoming) { Remove-Item $incoming -Recurse -Force }
        Copy-Item -Path $BackupUploads -Destination $incoming -Recurse -Force

        if (Test-Path $previous) { Remove-Item $previous -Recurse -Force }
        if (Test-Path $UploadsTarget) {
            Rename-Item -Path $UploadsTarget -NewName (Split-Path $previous -Leaf)
        }
        Rename-Item -Path $incoming -NewName (Split-Path $UploadsTarget -Leaf)
        return @{ PreviousPath = $previous; Swapped = $true }
    } catch {
        if (-not (Test-Path $UploadsTarget) -and (Test-Path $previous)) {
            Rename-Item -Path $previous -NewName (Split-Path $UploadsTarget -Leaf) -ErrorAction SilentlyContinue
        }
        if (Test-Path $incoming) { Remove-Item $incoming -Recurse -Force -ErrorAction SilentlyContinue }
        throw
    }
}

function Complete-DharaUploadsSwap {
    param([string]$PreviousPath)
    if ($PreviousPath -and (Test-Path $PreviousPath)) {
        Remove-Item $PreviousPath -Recurse -Force
    }
}

function Undo-DharaUploadsSwap {
    param(
        [string]$UploadsTarget,
        [string]$PreviousPath
    )

    $failedIncoming = "$UploadsTarget.failed"
    if (Test-Path $UploadsTarget) {
        if (Test-Path $failedIncoming) { Remove-Item $failedIncoming -Recurse -Force -ErrorAction SilentlyContinue }
        Rename-Item -Path $UploadsTarget -NewName (Split-Path $failedIncoming -Leaf) -ErrorAction SilentlyContinue
    }
    if ($PreviousPath -and (Test-Path $PreviousPath)) {
        Rename-Item -Path $PreviousPath -NewName (Split-Path $UploadsTarget -Leaf) -ErrorAction SilentlyContinue
    }
}

function Test-DharaRestoredDatabase {
    param([hashtable]$Db)

    $schemaCount = Invoke-PsqlCommandSafe -Db $Db -DatabaseName $Db.Database -Command "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name IN ('master','transaction','audit','system');"
    if ([int]$schemaCount -lt 4) {
        throw "Restored database is missing required schemas."
    }
    $tableCount = Invoke-PsqlCommandSafe -Db $Db -DatabaseName $Db.Database -Command "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema IN ('master','transaction','audit','system') AND table_type = 'BASE TABLE';"
    if ([int]$tableCount -lt 10) {
        throw "Restored database does not contain expected tables."
    }
}

function Write-DharaJson {
    param($Object)
    $Object | ConvertTo-Json -Depth 8 -Compress:$false
}
