Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceLogoPath = Join-Path $projectRoot "src\app\logo-source.png"
if (-not (Test-Path $sourceLogoPath)) {
    $sourceLogoPath = Join-Path $projectRoot "src\app\icon.png"
}
$resDir = Join-Path $projectRoot "android\app\src\main\res"
$publicDir = Join-Path $projectRoot "public"
$publicIconsDir = Join-Path $projectRoot "public\icons"
$srcAppDir = Join-Path $projectRoot "src\app"

Write-Host "Source Logo: $sourceLogoPath"
Write-Host "Target Res:  $resDir"

if (-not (Test-Path $sourceLogoPath)) {
    Write-Error "Source icon not found at $sourceLogoPath"
    exit 1
}

$sourceImg = [System.Drawing.Bitmap]::FromFile($sourceLogoPath)
$whiteBg = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")

# Helper function to resize and center image on background (or transparent)
function Create-Resized-Image {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$targetWidth,
        [int]$targetHeight,
        [System.Drawing.Color]$background,
        [double]$scaleFactor = 0.78,
        [bool]$isRound = $false
    )

    $destBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($background -ne [System.Drawing.Color]::Transparent) {
        $brush = New-Object System.Drawing.SolidBrush($background)
        $g.FillRectangle($brush, 0, 0, $targetWidth, $targetHeight)
        $brush.Dispose()
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Calculate max dimension according to aspect ratio
    $maxW = [int]($targetWidth * $scaleFactor)
    $maxH = [int]($targetHeight * $scaleFactor)

    $ratioW = $maxW / $source.Width
    $ratioH = $maxH / $source.Height
    $ratio = [Math]::Min($ratioW, $ratioH)

    $finalW = [int]($source.Width * $ratio)
    $finalH = [int]($source.Height * $ratio)

    $destX = [int](($targetWidth - $finalW) / 2)
    $destY = [int](($targetHeight - $finalH) / 2)

    $g.DrawImage($source, $destX, $destY, $finalW, $finalH)

    # Optional round mask
    if ($isRound) {
        $roundBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $rg = [System.Drawing.Graphics]::FromImage($roundBmp)
        $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $rg.Clear([System.Drawing.Color]::Transparent)

        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $targetWidth, $targetHeight)
        $rg.SetClip($path)
        $rg.DrawImage($destBmp, 0, 0)

        $path.Dispose()
        $rg.Dispose()
        $g.Dispose()
        $destBmp.Dispose()
        return $roundBmp
    }

    $g.Dispose()
    return $destBmp
}

# Helper to create pure white silhouette for Android notification icons
function Create-White-Silhouette {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$targetWidth,
        [int]$targetHeight,
        [double]$scaleFactor = 0.8
    )

    $tempBmp = Create-Resized-Image -source $source -targetWidth $targetWidth -targetHeight $targetHeight -background ([System.Drawing.Color]::Transparent) -scaleFactor $scaleFactor
    $destBmp = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

    for ($x = 0; $x -lt $targetWidth; $x++) {
        for ($y = 0; $y -lt $targetHeight; $y++) {
            $p = $tempBmp.GetPixel($x, $y)
            if ($p.A -gt 15) {
                $whitePixel = [System.Drawing.Color]::FromArgb($p.A, 255, 255, 255)
                $destBmp.SetPixel($x, $y, $whitePixel)
            } else {
                $destBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            }
        }
    }
    $tempBmp.Dispose()
    return $destBmp
}

# Helper to save ICO file
function Save-Ico-File {
    param(
        [System.Drawing.Bitmap]$bmp,
        [string]$outPath
    )
    $hIcon = $bmp.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    $fs = New-Object System.IO.FileStream($outPath, [System.IO.FileMode]::Create)
    $icon.Save($fs)
    $fs.Close()
    $icon.Dispose()
}

Write-Host "--- 1. GENERATING WEB FAVICONS & PWA ICONS (WHITE BG) ---"
if (-not (Test-Path $publicIconsDir)) {
    New-Item -ItemType Directory -Path $publicIconsDir -Force | Out-Null
}

# Web favicon ICO
$favBmp = Create-Resized-Image -source $sourceImg -targetWidth 48 -targetHeight 48 -background $whiteBg -scaleFactor 0.82
Save-Ico-File -bmp $favBmp -outPath (Join-Path $publicDir "favicon.ico")
Save-Ico-File -bmp $favBmp -outPath (Join-Path $srcAppDir "favicon.ico")
$favBmp.Dispose()
Write-Host "Created public/favicon.ico and src/app/favicon.ico (White BG)"

# Web icon PNG (Next.js icon)
$iconPng = Create-Resized-Image -source $sourceImg -targetWidth 512 -targetHeight 512 -background $whiteBg -scaleFactor 0.78
$iconPng.Save((Join-Path $srcAppDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$iconPng.Save((Join-Path $publicIconsDir "icon-512.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$iconPng.Dispose()
Write-Host "Created src/app/icon.png and public/icons/icon-512.png (White BG)"

# PWA icon-192
$icon192 = Create-Resized-Image -source $sourceImg -targetWidth 192 -targetHeight 192 -background $whiteBg -scaleFactor 0.78
$icon192.Save((Join-Path $publicIconsDir "icon-192.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$icon192.Dispose()
Write-Host "Created public/icons/icon-192.png (White BG)"

# PWA icon-maskable (Safe zone scale 0.65)
$iconMaskable = Create-Resized-Image -source $sourceImg -targetWidth 512 -targetHeight 512 -background $whiteBg -scaleFactor 0.65
$iconMaskable.Save((Join-Path $publicIconsDir "icon-maskable.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$iconMaskable.Dispose()
Write-Host "Created public/icons/icon-maskable.png (White BG)"


Write-Host "--- 2. GENERATING ANDROID ADAPTIVE FOREGROUNDS ---"
$foregroundDensities = @{
    "mipmap-mdpi"    = 108
    "mipmap-hdpi"    = 162
    "mipmap-xhdpi"   = 216
    "mipmap-xxhdpi"  = 324
    "mipmap-xxxhdpi" = 432
}

foreach ($density in $foregroundDensities.Keys) {
    $size = $foregroundDensities[$density]
    $outPath = Join-Path $resDir "$density\ic_launcher_foreground.png"
    $img = Create-Resized-Image -source $sourceImg -targetWidth $size -targetHeight $size -background ([System.Drawing.Color]::Transparent) -scaleFactor 0.65
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host "Created $outPath ($size x $size)"
}


Write-Host "--- 3. GENERATING ANDROID LAUNCHER ICONS (WHITE BG) ---"
$legacyDensities = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($density in $legacyDensities.Keys) {
    $size = $legacyDensities[$density]
    
    # Square Icon (White BG)
    $outPath = Join-Path $resDir "$density\ic_launcher.png"
    $img = Create-Resized-Image -source $sourceImg -targetWidth $size -targetHeight $size -background $whiteBg -scaleFactor 0.82
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    
    # Round Icon (White Round BG)
    $outPathRound = Join-Path $resDir "$density\ic_launcher_round.png"
    $imgRound = Create-Resized-Image -source $sourceImg -targetWidth $size -targetHeight $size -background $whiteBg -scaleFactor 0.82 -isRound $true
    $imgRound.Save($outPathRound, [System.Drawing.Imaging.ImageFormat]::Png)
    $imgRound.Dispose()

    Write-Host "Created $density\ic_launcher and ic_launcher_round (White BG, $size x $size)"
}

# Update drawable/ic_launcher.png & drawable-v24/ic_launcher.png
$img192 = Create-Resized-Image -source $sourceImg -targetWidth 192 -targetHeight 192 -background $whiteBg -scaleFactor 0.82
$img192.Save((Join-Path $resDir "drawable\ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$img192.Save((Join-Path $resDir "drawable-v24\ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$img192.Dispose()
Write-Host "Created drawable/ic_launcher.png (White BG)"


Write-Host "--- 4. GENERATING ANDROID NOTIFICATION ICONS ---"
# Pure white silhouette for status bar notifications
$notifImg = Create-White-Silhouette -source $sourceImg -targetWidth 96 -targetHeight 96 -scaleFactor 0.85
$notifImg.Save((Join-Path $resDir "drawable\ic_stat_name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$notifImg.Save((Join-Path $resDir "drawable-v24\ic_stat_name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$notifImg.Dispose()
Write-Host "Created drawable/ic_stat_name.png (White notification silhouette)"


Write-Host "--- 5. GENERATING LEGACY SPLASH SCREENS (WHITE BG) ---"
$portSplashes = @{
    "drawable"               = @{ W = 720; H = 1280 }
    "drawable-port-mdpi"     = @{ W = 320; H = 480 }
    "drawable-port-hdpi"     = @{ W = 480; H = 800 }
    "drawable-port-xhdpi"    = @{ W = 720; H = 1280 }
    "drawable-port-xxhdpi"   = @{ W = 1080; H = 1920 }
    "drawable-port-xxxhdpi"  = @{ W = 1440; H = 2560 }
}

foreach ($folder in $portSplashes.Keys) {
    $w = $portSplashes[$folder].W
    $h = $portSplashes[$folder].H
    $outPath = Join-Path $resDir "$folder\splash.png"
    $img = Create-Resized-Image -source $sourceImg -targetWidth $w -targetHeight $h -background $whiteBg -scaleFactor 0.45
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
}

$landSplashes = @{
    "drawable-land-mdpi"     = @{ W = 480; H = 320 }
    "drawable-land-hdpi"     = @{ W = 800; H = 480 }
    "drawable-land-xhdpi"    = @{ W = 1280; H = 720 }
    "drawable-land-xxhdpi"   = @{ W = 1920; H = 1080 }
    "drawable-land-xxxhdpi"  = @{ W = 2560; H = 1440 }
}

foreach ($folder in $landSplashes.Keys) {
    $w = $landSplashes[$folder].W
    $h = $landSplashes[$folder].H
    $outPath = Join-Path $resDir "$folder\splash.png"
    $img = Create-Resized-Image -source $sourceImg -targetWidth $w -targetHeight $h -background $whiteBg -scaleFactor 0.35
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
}

$sourceImg.Dispose()
Write-Host "=== SUCCESS! All Web and Android Assets generated with clean White Background! ==="
