# Generates public/og.png (1200x630) and public/icons/icon-{512,192,180}.png
# using .NET System.Drawing (present on Windows PowerShell 5.1+).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'public'
$iconsDir = Join-Path $outDir 'icons'
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

$red  = [System.Drawing.Color]::FromArgb(238, 21, 21)
$blue = [System.Drawing.Color]::FromArgb(59, 91, 219)
$ink  = [System.Drawing.Color]::FromArgb(20, 22, 31)
$dim  = [System.Drawing.Color]::FromArgb(75, 79, 94)
$bgc  = [System.Drawing.Color]::FromArgb(250, 250, 250)
$grid = [System.Drawing.Color]::FromArgb(9, 20, 22, 31)

function Draw-Pokeball($g, [int]$cx, [int]$cy, [int]$r) {
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $redB  = New-Object System.Drawing.SolidBrush($red)
    $blueB = New-Object System.Drawing.SolidBrush($blue)
    $inkB  = New-Object System.Drawing.SolidBrush($ink)
    $inkPen = New-Object System.Drawing.Pen($ink, [Math]::Max(2, [int]($r * 0.09)))
    $bluePen = New-Object System.Drawing.Pen($blue, [Math]::Max(2, [int]($r * 0.10)))

    # scan ticks
    $t1 = [int]($r * 1.10); $t2 = [int]($r * 1.24)
    foreach ($a in 0, 90, 180, 270) {
        $rad = $a * [Math]::PI / 180
        $x1 = $cx + [Math]::Cos($rad) * $t1; $y1 = $cy + [Math]::Sin($rad) * $t1
        $x2 = $cx + [Math]::Cos($rad) * $t2; $y2 = $cy + [Math]::Sin($rad) * $t2
        $g.DrawLine($bluePen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
    }

    $bb = New-Object System.Drawing.Rectangle(($cx - $r), ($cy - $r), (2 * $r), (2 * $r))
    $g.FillEllipse($white, $bb)
    $g.FillPie($redB, $bb, 180, 180)
    $bandH = [int]($r * 0.16)
    $g.FillRectangle($inkB, ($cx - $r), ($cy - $bandH / 2), (2 * $r), $bandH)
    $ringR = [int]($r * 0.34)
    $ring = New-Object System.Drawing.Rectangle(($cx - $ringR), ($cy - $ringR), (2 * $ringR), (2 * $ringR))
    $g.FillEllipse($white, $ring)
    $g.DrawEllipse($inkPen, $ring)
    $coreR = [int]($r * 0.15)
    $core = New-Object System.Drawing.Rectangle(($cx - $coreR), ($cy - $coreR), (2 * $coreR), (2 * $coreR))
    $g.FillEllipse($blueB, $core)
    $g.DrawEllipse($inkPen, $bb)
}

# ---------- OG image 1200x630 ----------
$bmp = New-Object System.Drawing.Bitmap(1200, 630)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear($bgc)

$gridPen = New-Object System.Drawing.Pen($grid, 1)
for ($x = 0; $x -le 1200; $x += 36) { $g.DrawLine($gridPen, $x, 0, $x, 630) }
for ($y = 0; $y -le 630; $y += 36) { $g.DrawLine($gridPen, 0, $y, 1200, $y) }

$g.FillRectangle((New-Object System.Drawing.SolidBrush($red)), 0, 0, 740, 8)
$g.FillRectangle((New-Object System.Drawing.SolidBrush($ink)), 740, 0, 160, 8)
$g.FillRectangle((New-Object System.Drawing.SolidBrush($blue)), 900, 0, 300, 8)

Draw-Pokeball $g 235 340 150

$sans = 'Segoe UI'
$mono = 'Consolas'
$fBrand = New-Object System.Drawing.Font($sans, 108, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fSub  = New-Object System.Drawing.Font($sans, 36, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fMono = New-Object System.Drawing.Font($mono, 24, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$fMonoS= New-Object System.Drawing.Font($mono, 20, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$inkBrush = New-Object System.Drawing.SolidBrush($ink)
$redBrush = New-Object System.Drawing.SolidBrush($red)
$dimBrush = New-Object System.Drawing.SolidBrush($dim)
$blueBrush = New-Object System.Drawing.SolidBrush($blue)

# wordmark: IV (ink) X (red) ray (ink)
$x0 = 470; $y0 = 200
$w1 = $g.MeasureString('IV', $fBrand).Width
$w2 = $g.MeasureString('X', $fBrand).Width
$g.DrawString('IV', $fBrand, $inkBrush, $x0, $y0)
$g.DrawString('X', $fBrand, $redBrush, ($x0 + $w1), $y0)
$g.DrawString('ray', $fBrand, $inkBrush, ($x0 + $w1 + $w2), $y0)
$g.DrawString('Pokémon IV & Stat Calculators', $fSub, $dimBrush, 474, 340)
$g.DrawString('ivforge.top', $fMono, $blueBrush, 474, 420)
$g.DrawString('GEN 3-9 · 1,025 SPECIES · IV / STAT / JUDGE / HIDDEN POWER', $fMonoS, $dimBrush, 474, 460)

# footer strip
$g.FillRectangle((New-Object System.Drawing.SolidBrush($ink)), 0, 570, 1200, 60)
$g.DrawString('// EXACT IV MATH · RUNS IN YOUR BROWSER · NOT AFFILIATED WITH NINTENDO / GAME FREAK / TPC', $fMonoS, (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 157, 189))), 474, 586)

$ogPath = Join-Path $outDir 'og.png'
$bmp.Save($ogPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()

# ---------- icons ----------
foreach ($size in 512, 192, 180) {
    $b = New-Object System.Drawing.Bitmap($size, $size)
    $gg = [System.Drawing.Graphics]::FromImage($b)
    $gg.Clear([System.Drawing.Color]::Transparent)
    Draw-Pokeball $gg ([int]($size / 2)) ([int]($size / 2)) ([int]($size * 0.40))
    $p = Join-Path $iconsDir "icon-$size.png"
    $b.Save($p, [System.Drawing.Imaging.ImageFormat]::Png)
    $gg.Dispose(); $b.Dispose()
}

Write-Host 'OK: public/og.png + icons 512/192/180'
