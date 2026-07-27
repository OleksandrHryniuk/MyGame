<#
Generates native Android launcher icons from the banana artwork into the res/mipmap-*
folders (legacy square + round + adaptive foreground) for every density bucket.
Run, then rebuild the APK.
#>
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = $PSScriptRoot
$resDir = Join-Path $root 'android\app\src\main\res'
$bananaPath = Join-Path $root 'assets\banana_clear.png'
$sky = [System.Drawing.Color]::FromArgb(255, 0xCD, 0xC8, 0xFF)

# Legacy icon sizes (px) and adaptive-foreground sizes (108dp base)
$legacy = [ordered]@{ 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
$fg     = [ordered]@{ 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }

function New-Graphics($bmp) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    return $g
}

function Draw-Banana($g, $size, $fraction, $banana) {
    $targetH = [int]($size * $fraction)
    $scale = $targetH / $banana.Height
    $targetW = [int]($banana.Width * $scale)
    $x = [int](($size - $targetW) / 2)
    $y = [int](($size - $targetH) / 2)
    $g.DrawImage($banana, $x, $y, $targetW, $targetH)
}

$banana = [System.Drawing.Image]::FromFile($bananaPath)

foreach ($d in $legacy.Keys) {
    $dir = Join-Path $resDir "mipmap-$d"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $size = $legacy[$d]

    # Square legacy icon: sky background + banana
    $sq = New-Object System.Drawing.Bitmap($size, $size)
    $g = New-Graphics $sq
    $g.Clear($sky)
    Draw-Banana $g $size 0.62 $banana
    $g.Dispose()
    $sq.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $sq.Dispose()

    # Round legacy icon: sky circle + banana
    $rd = New-Object System.Drawing.Bitmap($size, $size)
    $g = New-Graphics $rd
    $g.Clear([System.Drawing.Color]::Transparent)
    $brush = New-Object System.Drawing.SolidBrush($sky)
    $g.FillEllipse($brush, 0, 0, $size - 1, $size - 1)
    $brush.Dispose()
    Draw-Banana $g $size 0.55 $banana
    $g.Dispose()
    $rd.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $rd.Dispose()

    # Adaptive foreground: transparent + banana centered inside the safe zone
    $fgSize = $fg[$d]
    $fgBmp = New-Object System.Drawing.Bitmap($fgSize, $fgSize)
    $g = New-Graphics $fgBmp
    $g.Clear([System.Drawing.Color]::Transparent)
    Draw-Banana $g $fgSize 0.50 $banana
    $g.Dispose()
    $fgBmp.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    Write-Host "  $d done ($size px / fg $fgSize px)" -ForegroundColor Green
}

$banana.Dispose()
Write-Host "Launcher icons generated." -ForegroundColor Green
