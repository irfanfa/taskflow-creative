Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceLogoPath = Join-Path $projectRoot "src\app\icon.png"
$resDir = Join-Path $projectRoot "android\app\src\main\res"

Write-Host "Source Logo: $sourceLogoPath"
Write-Host "Target Res:  $resDir"

if (-not (Test-Path $sourceLogoPath)) {
    Write-Error "Source icon.png not found at $sourceLogoPath"
    exit 1
}

$sourceImg = [System.Drawing.Bitmap]::FromFile($sourceLogoPath)
$srcWidth = $sourceImg.Width
$srcHeight = $sourceImg.Height
$bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0f172a")

# Helper function to resize and center image on background (or transparent)
function Create-Resized-Image {
    param(
        [System.Drawing.Bitmap]$source,
        [int]$targetWidth,
        [int]$targetHeight,
        [System.Drawing.Color]$background,
        [double]$scaleFactor = 0.75,
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

# 1. GENERATE ADAPTIVE ICON FOREGROUNDS (Transparent BG, Logo in safe area)
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

# 2. GENERATE LEGACY / SQUARE ICONS
$legacyDensities = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($density in $legacyDensities.Keys) {
    $size = $legacyDensities[$density]
    
    # Square
    $outPath = Join-Path $resDir "$density\ic_launcher.png"
    $img = Create-Resized-Image -source $sourceImg -targetWidth $size -targetHeight $size -background $bgColor -scaleFactor 0.85
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    
    # Round
    $outPathRound = Join-Path $resDir "$density\ic_launcher_round.png"
    $imgRound = Create-Resized-Image -source $sourceImg -targetWidth $size -targetHeight $size -background $bgColor -scaleFactor 0.85 -isRound $true
    $imgRound.Save($outPathRound, [System.Drawing.Imaging.ImageFormat]::Png)
    $imgRound.Dispose()

    Write-Host "Created $density\ic_launcher and ic_launcher_round ($size x $size)"
}

# Also update drawable/ic_launcher.png & drawable-v24
$img192 = Create-Resized-Image -source $sourceImg -targetWidth 192 -targetHeight 192 -background $bgColor -scaleFactor 0.85
$img192.Save((Join-Path $resDir "drawable\ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$img192.Save((Join-Path $resDir "drawable-v24\ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$img192.Dispose()

# 3. GENERATE SPLASH SCREENS (PORTRAIT)
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
    # Logo takes about 45% of screen width in splash screen for elegant look
    $scale = 0.45
    $img = Create-Resized-Image -source $sourceImg -targetWidth $w -targetHeight $h -background $bgColor -scaleFactor $scale
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host "Created $folder\splash.png ($w x $h)"
}

# 4. GENERATE SPLASH SCREENS (LANDSCAPE)
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
    $scale = 0.35
    $img = Create-Resized-Image -source $sourceImg -targetWidth $w -targetHeight $h -background $bgColor -scaleFactor $scale
    $img.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Host "Created $folder\splash.png ($w x $h)"
}

# 5. Clean up
$sourceImg.Dispose()
Write-Host "SUCCESS! All Android launcher icons and splash screens updated with website favicon/logo."
