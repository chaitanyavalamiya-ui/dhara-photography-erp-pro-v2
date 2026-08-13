#Requires -Version 5.1
param(
    [string]$EnvFile = (Join-Path $PSScriptRoot "..\..\.env"),
    [switch]$JsonOutput
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "backup-common.ps1")

try {
    $repoRoot = Get-DharaRepoRoot -ScriptsDir $PSScriptRoot
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
        if ($JsonOutput) { Write-DharaJson @{ success = $true; backupFile = $null } }
        else { Write-Host "No file selected." }
        exit 0
    }

    if ($JsonOutput) {
        Write-DharaJson @{ success = $true; backupFile = $dialog.FileName }
    } else {
        Write-Host $dialog.FileName
    }
}
catch {
    if ($JsonOutput) {
        Write-DharaJson @{ success = $false; message = $_.Exception.Message }
        exit 1
    }
    throw
}
