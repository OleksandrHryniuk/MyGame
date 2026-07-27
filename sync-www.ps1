<#
Copies the web game files into ./www, which is Capacitor's webDir (the folder that
gets bundled into the native Android app). Run this whenever the game source changes,
before `npx cap sync android`.
#>
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$www = Join-Path $root 'www'

New-Item -ItemType Directory -Force -Path $www | Out-Null

# Individual files copied into www root
$files = @('index.html', 'mygame.js', 'phaser.js', 'manifest.json', 'sw.js')
foreach ($f in $files) {
    Copy-Item -Path (Join-Path $root $f) -Destination $www -Force
}

# Folders mirrored into www (robocopy /MIR keeps them in sync, /NJH /NJS quiet headers)
$folders = @('assets', 'icons')
foreach ($d in $folders) {
    $src = Join-Path $root $d
    $dst = Join-Path $www $d
    robocopy $src $dst /MIR /NJH /NJS /NDL /NP | Out-Null
}

Write-Host "www/ updated." -ForegroundColor Green
Get-ChildItem $www | Select-Object Name
